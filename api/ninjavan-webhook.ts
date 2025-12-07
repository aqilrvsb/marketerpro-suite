import { createClient } from '@supabase/supabase-js'

export const config = {
  runtime: 'nodejs',
}

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

/**
 * Ninjavan Webhook Handler
 *
 * Webhook URL: https://your-domain.vercel.app/api/ninjavan-webhook
 *
 * Expected payload from Ninjavan:
 * {
 *   "tracking_id": "NJVMY123456789",
 *   "event": "On Vehicle for Delivery"
 * }
 *
 * Logic:
 * 1. Find order by tracking_id (no_tracking column)
 * 2. Update SEO column with event value
 * 3. If event contains "Delivered" -> SEO = "Successfull Delivery", tarikh_bayaran = today
 * 4. If event = "Returned To Sender" -> delivery_status = "Return", date_return = today
 */

// Process event status
function processEvent(event: string): { seo: string; isSuccess: boolean; isReturn: boolean } {
  const eventLower = event.toLowerCase()

  // Check if event contains "delivered" (any delivered status)
  if (eventLower.includes('delivered')) {
    return { seo: 'Successfull Delivery', isSuccess: true, isReturn: false }
  }

  // Check if event is "Returned To Sender"
  if (eventLower === 'returned to sender' || eventLower.includes('returned to sender')) {
    return { seo: event, isSuccess: false, isReturn: true }
  }

  // All other events - just save as SEO
  return { seo: event, isSuccess: false, isReturn: false }
}

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    // Parse webhook data from POST body
    const webhookData = req.body || {}
    const { tracking_id, event } = webhookData

    console.log('Ninjavan webhook received:', { tracking_id, event })

    if (!tracking_id) {
      return res.status(400).json({
        success: false,
        error: 'tracking_id is required'
      })
    }

    if (!event) {
      return res.status(400).json({
        success: false,
        error: 'event is required'
      })
    }

    // Initialize Supabase
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials not configured')
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Find order by tracking number
    const { data: orders, error: orderError } = await supabase
      .from('customer_orders')
      .select('*, marketer_id')
      .eq('no_tracking', tracking_id)
      .limit(1)

    if (orderError) {
      console.error('Error finding order:', orderError)
      return res.status(500).json({
        success: false,
        error: 'Failed to find order'
      })
    }

    if (!orders || orders.length === 0) {
      console.log('Order not found for tracking_id:', tracking_id)
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        tracking_id
      })
    }

    const order = orders[0]

    // Process event status
    const processedEvent = processEvent(event)

    // Prepare update data
    const updateData: any = {
      seo: processedEvent.seo,
      updated_at: new Date().toISOString()
    }

    const today = new Date().toISOString().split('T')[0]

    // If delivered -> update tarikh_bayaran to today
    if (processedEvent.isSuccess) {
      updateData.tarikh_bayaran = today
    }

    // If returned -> update delivery_status to Return and date_return to today
    if (processedEvent.isReturn) {
      updateData.delivery_status = 'Return'
      updateData.date_return = today
    }

    console.log('Updating order:', order.id, 'with data:', updateData)

    // Update order
    const { error: updateError } = await supabase
      .from('customer_orders')
      .update(updateData)
      .eq('id', order.id)

    if (updateError) {
      console.error('Error updating order:', updateError)
      return res.status(500).json({
        success: false,
        error: 'Failed to update order'
      })
    }

    console.log('Order updated successfully:', order.no_tracking)

    return res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      order_id: order.id,
      tracking_id: order.no_tracking,
      event: event,
      processed: processedEvent
    })

  } catch (error: any) {
    console.error('Ninjavan webhook error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    })
  }
}
