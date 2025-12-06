import { createClient } from '@supabase/supabase-js'

export const config = {
  runtime: 'nodejs',
}

const WHACENTER_API = 'https://api.whacenter.com/api'
const WHACENTER_API_KEY = 'd44ac50f-0bd8-4ed0-b85f-55465e08d7cf'

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

// Status mapping from Ninjavan to our system
// Returns: seo (raw status from Ninjavan), isSuccess, isReturn
function normalizeStatus(ninjavanStatus: string): { seo: string; isSuccess: boolean; isReturn: boolean } {
  const status = ninjavanStatus.toLowerCase()

  // Success statuses - update delivery_status to Success + tarikh_bayaran if COD
  if (
    status.includes('successful delivery') ||
    status.includes('completed') ||
    status.includes('delivered')
  ) {
    return { seo: ninjavanStatus, isSuccess: true, isReturn: false }
  }

  // Return statuses - update delivery_status to Return + date_return
  if (
    status.includes('returned to sender') ||
    status.includes('return') ||
    status.includes('rts') ||
    status.includes('cancelled')
  ) {
    return { seo: ninjavanStatus, isSuccess: false, isReturn: true }
  }

  // All other statuses - just update SEO with the raw status from Ninjavan
  return { seo: ninjavanStatus, isSuccess: false, isReturn: false }
}

// Send WhatsApp message via Whacenter
async function sendWhatsApp(instance: string, phone: string, message: string): Promise<boolean> {
  try {
    // Format phone number (ensure it starts with country code)
    let formattedPhone = phone.replace(/\D/g, '')
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '60' + formattedPhone.substring(1)
    }
    if (!formattedPhone.startsWith('60')) {
      formattedPhone = '60' + formattedPhone
    }

    const url = `${WHACENTER_API}/send?device_id=${encodeURIComponent(instance)}&number=${encodeURIComponent(formattedPhone)}&message=${encodeURIComponent(message)}`

    const response = await fetch(url, { method: 'GET' })
    const data = await response.json()

    console.log('WhatsApp send result:', data)
    return data.status === true || data.success === true
  } catch (error) {
    console.error('Failed to send WhatsApp:', error)
    return false
  }
}

// Generate notification message based on status
function generateMessage(order: any, normalizedStatus: { seo: string; isSuccess: boolean; isReturn: boolean }): string {
  const trackingNo = order.no_tracking || '-'

  return `Tracking Number : ${trackingNo}
Status : ${normalizedStatus.seo}`
}

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Accept both GET and POST
  const webhookData = req.method === 'POST' ? req.body : req.query

  try {
    const { tracking_id, status, id_sale } = webhookData

    if (!tracking_id && !id_sale) {
      return res.status(400).json({
        success: false,
        error: 'tracking_id or id_sale is required'
      })
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'status is required'
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

    // Find order by tracking number or id_sale
    let query = supabase
      .from('customer_orders')
      .select('*, marketer_id')

    if (tracking_id) {
      query = query.eq('no_tracking', tracking_id)
    } else if (id_sale) {
      query = query.eq('id_sale', id_sale)
    }

    const { data: orders, error: orderError } = await query.limit(1)

    if (orderError) {
      console.error('Error finding order:', orderError)
      return res.status(500).json({
        success: false,
        error: 'Failed to find order'
      })
    }

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        tracking_id,
        id_sale
      })
    }

    const order = orders[0]

    // Normalize status
    const normalizedStatus = normalizeStatus(status)

    // Prepare update data - always update SEO with raw Ninjavan status
    const updateData: any = {
      seo: normalizedStatus.seo,
      updated_at: new Date().toISOString()
    }

    // Successful Delivery: update delivery_status to Success, and if COD update tarikh_bayaran
    if (normalizedStatus.isSuccess) {
      updateData.delivery_status = 'Success'
      if (order.cara_bayaran === 'COD') {
        updateData.tarikh_bayaran = new Date().toISOString().split('T')[0]
      }
    }

    // Return: update delivery_status to Return and date_return
    if (normalizedStatus.isReturn) {
      updateData.delivery_status = 'Return'
      updateData.date_return = new Date().toISOString().split('T')[0]
    }

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

    // Send WhatsApp notification if marketer has device configured
    let whatsappSent = false

    if (order.marketer_id && order.no_phone) {
      // Get marketer's device setting
      const { data: deviceSettings } = await supabase
        .from('device_setting')
        .select('instance, status_wa')
        .eq('user_id', order.marketer_id)
        .eq('status_wa', 'connected')
        .limit(1)

      if (deviceSettings && deviceSettings.length > 0) {
        const device = deviceSettings[0]
        const message = generateMessage(order, normalizedStatus)

        if (message && device.instance) {
          whatsappSent = await sendWhatsApp(device.instance, order.no_phone, message)
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      order_id: order.id,
      tracking_id: order.no_tracking,
      id_sale: order.id_sale,
      original_status: status,
      normalized_status: normalizedStatus,
      whatsapp_sent: whatsappSent
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
