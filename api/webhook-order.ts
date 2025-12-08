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

// Generate order registered notification message (for webhook - no tracking number yet)
function generateOrderRegisteredMessage(order: {
  marketer_name: string
  no_phone: string
  produk: string
  harga_jualan_sebenar: number
  cara_bayaran: string
  tarikh_tempahan: string
}): string {
  return `*Pesanan Anda Sudah Ditempah*

Nama : ${order.marketer_name}
Phone : ${order.no_phone}
Pakej : ${order.produk}
Tarikh Membeli : ${order.tarikh_tempahan}
Harga Jualan : RM${order.harga_jualan_sebenar?.toFixed(2) || '0.00'}
Cara Bayaran : ${order.cara_bayaran}`
}

/**
 * Order Webhook - Auto key in order from WhatsApp
 *
 * Format: #order
 * nama: [nama customer]
 * phone: [no telefon]
 * alamat: [alamat penuh]
 * poskod: [poskod]
 * bandar: [bandar]
 * negeri: [negeri]
 * produk: [nama produk/bundle]
 * kuantiti: [qty]
 * harga: [harga jualan]
 * platform: [FB/Shopee/Tiktok/Database/Google]
 * bayaran: [CASH/COD]
 *
 * This webhook is called by Whacenter when a message matches the #order pattern
 */

interface OrderData {
  nama: string
  phone: string
  alamat: string
  poskod: string
  bandar: string
  negeri: string
  produk: string
  kuantiti: number
  harga: number
  platform: string
  bayaran: string
}

function parseOrderMessage(message: string): OrderData | null {
  try {
    const lines = message.split('\n').map(line => line.trim())

    // Check if message starts with #order
    if (!lines[0].toLowerCase().includes('#order')) {
      return null
    }

    const data: Partial<OrderData> = {}

    for (const line of lines) {
      const lowerLine = line.toLowerCase()

      if (lowerLine.startsWith('nama:') || lowerLine.startsWith('name:')) {
        data.nama = line.split(':').slice(1).join(':').trim()
      } else if (lowerLine.startsWith('phone:') || lowerLine.startsWith('telefon:') || lowerLine.startsWith('hp:')) {
        data.phone = line.split(':')[1].trim()
      } else if (lowerLine.startsWith('alamat:') || lowerLine.startsWith('address:')) {
        data.alamat = line.split(':').slice(1).join(':').trim()
      } else if (lowerLine.startsWith('poskod:') || lowerLine.startsWith('postcode:')) {
        data.poskod = line.split(':')[1].trim()
      } else if (lowerLine.startsWith('bandar:') || lowerLine.startsWith('city:')) {
        data.bandar = line.split(':')[1].trim()
      } else if (lowerLine.startsWith('negeri:') || lowerLine.startsWith('state:')) {
        data.negeri = line.split(':')[1].trim()
      } else if (lowerLine.startsWith('produk:') || lowerLine.startsWith('product:')) {
        data.produk = line.split(':')[1].trim()
      } else if (lowerLine.startsWith('kuantiti:') || lowerLine.startsWith('qty:') || lowerLine.startsWith('quantity:')) {
        data.kuantiti = parseInt(line.split(':')[1].trim()) || 1
      } else if (lowerLine.startsWith('harga:') || lowerLine.startsWith('price:')) {
        data.harga = parseFloat(line.split(':')[1].trim().replace(/[^\d.]/g, '')) || 0
      } else if (lowerLine.startsWith('platform:')) {
        const value = line.split(':')[1].trim().toLowerCase()
        if (value.includes('fb') || value.includes('facebook')) {
          data.platform = 'Facebook'
        } else if (value.includes('shopee')) {
          data.platform = 'Shopee'
        } else if (value.includes('tiktok') || value.includes('tik tok')) {
          data.platform = 'Tiktok'
        } else if (value.includes('database') || value.includes('db')) {
          data.platform = 'Database'
        } else if (value.includes('google')) {
          data.platform = 'Google'
        } else {
          data.platform = 'Facebook'
        }
      } else if (lowerLine.startsWith('bayaran:') || lowerLine.startsWith('payment:')) {
        const value = line.split(':')[1].trim().toUpperCase()
        data.bayaran = value === 'COD' ? 'COD' : 'CASH'
      }
    }

    // Validate required fields
    if (!data.nama || !data.phone || !data.alamat || !data.poskod || !data.produk) {
      return null
    }

    return {
      nama: data.nama,
      phone: data.phone,
      alamat: data.alamat,
      poskod: data.poskod,
      bandar: data.bandar || '',
      negeri: data.negeri || '',
      produk: data.produk,
      kuantiti: data.kuantiti || 1,
      harga: data.harga || 0,
      platform: data.platform || 'Facebook',
      bayaran: data.bayaran || 'COD'
    }
  } catch {
    return null
  }
}

// Generate order number format: DDMMYY-XXXXX
function generateOrderNumber(): string {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = String(now.getFullYear()).slice(-2)
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `${day}${month}${year}-${random}`
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
    // Webhook data from Whacenter (can be POST body or GET query)
    const webhookData = req.method === 'POST' ? req.body : req.query

    // Extract webhook fields
    // Whacenter sends: device_id, sender, message, timestamp, etc.
    const { device_id, message } = webhookData

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      })
    }

    // Parse order data from message
    const orderData = parseOrderMessage(message)

    if (!orderData) {
      return res.status(200).json({
        success: false,
        message: 'Message is not a valid order format',
        hint: 'Format: #order\nnama: [name]\nphone: [phone]\nalamat: [address]\nposkod: [postcode]\nbandar: [city]\nnegeri: [state]\nproduk: [product]\nkuantiti: [qty]\nharga: [price]\nplatform: [FB/Shopee/Tiktok/Database/Google]\nbayaran: [CASH/COD]'
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

    // Find marketer by device_id
    let marketerId = null
    let marketerIdStaff = null
    let marketerName = ''

    if (device_id) {
      const { data: deviceSettings } = await supabase
        .from('device_setting')
        .select('user_id')
        .eq('device_id', device_id)
        .limit(1)

      if (deviceSettings && deviceSettings.length > 0) {
        marketerId = deviceSettings[0].user_id

        // Get marketer's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('idstaff, full_name')
          .eq('id', marketerId)
          .limit(1)

        if (profile && profile.length > 0) {
          marketerIdStaff = profile[0].idstaff
          marketerName = profile[0].full_name
        }
      }
    }

    if (!marketerIdStaff) {
      return res.status(400).json({
        success: false,
        error: 'Could not identify marketer from device_id'
      })
    }

    // Format phone number
    let formattedPhone = orderData.phone.replace(/\D/g, '')
    if (formattedPhone.startsWith('60')) {
      formattedPhone = '0' + formattedPhone.substring(2)
    }
    if (!formattedPhone.startsWith('0')) {
      formattedPhone = '0' + formattedPhone
    }

    // Find bundle by name to get SKU and pricing
    const { data: bundles } = await supabase
      .from('bundles')
      .select('*')
      .ilike('name', `%${orderData.produk}%`)
      .eq('is_active', true)
      .limit(1)

    let sku = orderData.produk
    let productPrice = orderData.harga
    let productCost = 0

    if (bundles && bundles.length > 0) {
      const bundle = bundles[0]
      sku = bundle.name

      // Get price based on platform if not specified
      if (!orderData.harga || orderData.harga === 0) {
        const platformKey = orderData.platform.toLowerCase()
        if (platformKey === 'shopee') {
          productPrice = bundle.price_shopee_np || bundle.price_shopee || 0
        } else if (platformKey === 'tiktok') {
          productPrice = bundle.price_tiktok_np || bundle.price_tiktok || 0
        } else {
          productPrice = bundle.price_normal_np || bundle.price_normal || 0
        }
      }

      // Get product cost
      if (bundle.product_id) {
        const { data: product } = await supabase
          .from('products')
          .select('base_cost')
          .eq('id', bundle.product_id)
          .single()

        if (product) {
          productCost = (product.base_cost || 0) * (bundle.units || 1)
        }
      }
    }

    // Generate order number
    const orderNumber = generateOrderNumber()

    // Format date for display
    const now = new Date()
    const tarikhTempahan = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`

    // Calculate profit (simple: selling price - product cost)
    const profit = productPrice - productCost

    // Determine customer type (NP for new orders via webhook)
    const jenisCustomer = 'NP'

    // Insert new order
    const { data: newOrder, error: insertError } = await supabase
      .from('customer_orders')
      .insert({
        no_tempahan: orderNumber,
        marketer_id: marketerId,
        marketer_id_staff: marketerIdStaff,
        marketer_name: orderData.nama, // Customer name
        no_phone: formattedPhone,
        alamat: orderData.alamat,
        poskod: orderData.poskod,
        bandar: orderData.bandar,
        negeri: orderData.negeri,
        produk: orderData.produk,
        sku: sku,
        kuantiti: orderData.kuantiti,
        harga_jualan_produk: productPrice,
        harga_jualan_sebenar: productPrice,
        harga_jualan_agen: productPrice,
        kos_produk: productCost,
        profit: profit,
        tarikh_tempahan: tarikhTempahan,
        date_order: now.toISOString().split('T')[0],
        jenis_platform: orderData.platform,
        jenis_customer: jenisCustomer,
        cara_bayaran: orderData.bayaran,
        delivery_status: 'Pending',
        status_parcel: 'Pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting order:', insertError)
      return res.status(500).json({
        success: false,
        error: 'Failed to save order',
        details: insertError.message
      })
    }

    // Send WhatsApp notification to customer if marketer has device configured
    let whatsappSent = false

    if (marketerId && formattedPhone) {
      // Get marketer's device setting
      const { data: deviceSettings } = await supabase
        .from('device_setting')
        .select('instance, status_wa')
        .eq('user_id', marketerId)
        .eq('status_wa', 'connected')
        .limit(1)

      if (deviceSettings && deviceSettings.length > 0 && deviceSettings[0].instance) {
        const message = generateOrderRegisteredMessage({
          marketer_name: orderData.nama,
          no_phone: formattedPhone,
          produk: orderData.produk,
          harga_jualan_sebenar: productPrice,
          cara_bayaran: orderData.bayaran,
          tarikh_tempahan: tarikhTempahan
        })

        whatsappSent = await sendWhatsApp(deviceSettings[0].instance, formattedPhone, message)
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Order saved successfully',
      order: {
        id: newOrder.id,
        no_tempahan: orderNumber,
        nama: orderData.nama,
        phone: formattedPhone,
        produk: orderData.produk,
        harga: productPrice,
        platform: orderData.platform,
        bayaran: orderData.bayaran,
        marketer: marketerIdStaff
      },
      whatsapp_sent: whatsappSent
    })

  } catch (error: any) {
    console.error('Order webhook error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    })
  }
}
