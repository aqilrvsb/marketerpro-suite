import { createClient } from '@supabase/supabase-js'

export const config = {
  runtime: 'nodejs',
}

const WHACENTER_API = 'https://api.whacenter.com/api'

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

// Send WhatsApp message via Whacenter
async function sendWhatsApp(instance: string, phone: string, message: string): Promise<boolean> {
  try {
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

/**
 * API Endpoint to send order notification via WhatsApp
 * Called from frontend when order is created manually
 *
 * POST /api/send-order-notification
 * Body: { tracking_number: string } or { order: OrderData, marketer_id: string }
 */
export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { tracking_number, order, marketer_id } = req.body

    if (!tracking_number && !order) {
      return res.status(400).json({
        success: false,
        error: 'tracking_number or order object is required'
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

    let orderData = order
    let orderMarketerId = marketer_id

    // If tracking_number provided, fetch from database
    if (tracking_number) {
      const { data: fetchedOrder, error: orderError } = await supabase
        .from('customer_orders')
        .select('*')
        .eq('no_tracking', tracking_number)
        .single()

      if (orderError || !fetchedOrder) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        })
      }

      orderData = fetchedOrder
      orderMarketerId = fetchedOrder.marketer_id
    }

    if (!orderMarketerId) {
      return res.status(400).json({
        success: false,
        error: 'Marketer ID is required'
      })
    }

    // Get marketer's device setting
    const { data: deviceSettings } = await supabase
      .from('device_setting')
      .select('instance, status_wa')
      .eq('user_id', orderMarketerId)
      .eq('status_wa', 'connected')
      .limit(1)

    if (!deviceSettings || deviceSettings.length === 0 || !deviceSettings[0].instance) {
      return res.status(200).json({
        success: false,
        error: 'Marketer does not have a connected WhatsApp device',
        whatsapp_sent: false
      })
    }

    // Generate message
    const message = `*Pesanan Anda Sudah Ditempah*

Nama : ${orderData.marketer_name}
Phone : ${orderData.no_phone}
Pakej : ${orderData.produk}
Tarikh Membeli : ${orderData.tarikh_tempahan || '-'}
Tracking Number : ${orderData.no_tracking || '-'}
Harga Jualan : RM${parseFloat(orderData.harga_jualan_sebenar || 0).toFixed(2)}
Cara Bayaran : ${orderData.cara_bayaran}`

    // Send WhatsApp
    const whatsappSent = await sendWhatsApp(
      deviceSettings[0].instance,
      orderData.no_phone,
      message
    )

    return res.status(200).json({
      success: true,
      whatsapp_sent: whatsappSent,
      message: whatsappSent ? 'Notification sent successfully' : 'Failed to send notification'
    })

  } catch (error: any) {
    console.error('Send notification error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    })
  }
}
