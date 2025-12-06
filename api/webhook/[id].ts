import { createClient } from '@supabase/supabase-js'

export const config = {
  runtime: 'nodejs',
}

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// Generate order number
function generateOrderNumber(): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `ORD${year}${month}${day}${random}`
}

// Format date for display
function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Get webhook ID from URL
  const { id: webhookId } = req.query

  if (!webhookId) {
    return res.status(400).json({ error: 'Webhook ID required' })
  }

  try {
    // Find device by webhook_id
    const { data: device, error: deviceError } = await supabase
      .from('device_setting')
      .select('*, profiles:user_id(id, idstaff, full_name)')
      .eq('webhook_id', webhookId)
      .single()

    if (deviceError || !device) {
      console.error('Device not found:', deviceError)
      return res.status(404).json({ error: 'Webhook not found' })
    }

    // Parse incoming message from Whacenter
    const body = req.body || {}
    const message = body.message || body.text || body.body || ''
    const sender = body.from || body.sender || body.phone || ''
    const messageType = body.type || 'text'

    console.log('Webhook received:', { webhookId, sender, message, messageType })

    // Get marketer info
    const marketerIdStaff = (device.profiles as any)?.idstaff || ''
    const marketerName = (device.profiles as any)?.full_name || ''
    const marketerId = device.user_id

    // Check message command
    const messageLower = message.toLowerCase().trim()

    // Command: #lead - Insert new prospect
    // Format: #lead|nama|phone|niche|jenis(NP/EP)|tarikh
    if (messageLower.startsWith('#lead')) {
      const parts = message.split('|').map((p: string) => p.trim())

      if (parts.length < 5) {
        return res.status(200).json({
          success: false,
          message: 'Format salah. Guna: #lead|nama|phone|niche|jenis|tarikh'
        })
      }

      const [, nama, phone, niche, jenis, tarikh] = parts

      // Validate phone
      if (!phone.startsWith('6')) {
        return res.status(200).json({
          success: false,
          message: 'No. telefon mesti bermula dengan 6'
        })
      }

      // Validate jenis
      const jenisUpper = jenis.toUpperCase()
      if (!['NP', 'EP'].includes(jenisUpper)) {
        return res.status(200).json({
          success: false,
          message: 'Jenis mesti NP atau EP'
        })
      }

      // Insert prospect
      const { error: insertError } = await supabase
        .from('prospects')
        .insert({
          nama_prospek: nama.toUpperCase(),
          no_telefon: phone,
          niche: niche.toUpperCase(),
          jenis_prospek: jenisUpper,
          tarikh_phone_number: tarikh || new Date().toISOString().split('T')[0],
          marketer_id_staff: marketerIdStaff,
          created_by: marketerId,
        })

      if (insertError) {
        console.error('Insert prospect error:', insertError)
        return res.status(200).json({
          success: false,
          message: 'Gagal menambah lead: ' + insertError.message
        })
      }

      return res.status(200).json({
        success: true,
        message: `Lead berjaya ditambah: ${nama}`
      })
    }

    // Command: #order - Insert new order (skip Ninjavan for customer)
    // Format: #order|nama|phone|alamat|poskod|bandar|negeri|produk|kuantiti|harga|bayaran(CASH/COD)
    if (messageLower.startsWith('#order')) {
      const parts = message.split('|').map((p: string) => p.trim())

      if (parts.length < 10) {
        return res.status(200).json({
          success: false,
          message: 'Format salah. Guna: #order|nama|phone|alamat|poskod|bandar|negeri|produk|kuantiti|harga|bayaran'
        })
      }

      const [, nama, phone, alamat, poskod, bandar, negeri, produk, kuantiti, harga, bayaran] = parts

      // Validate phone
      if (!phone.startsWith('6')) {
        return res.status(200).json({
          success: false,
          message: 'No. telefon mesti bermula dengan 6'
        })
      }

      // Find bundle/product
      const { data: bundle } = await supabase
        .from('bundles')
        .select('*')
        .ilike('name', `%${produk}%`)
        .eq('is_active', true)
        .limit(1)
        .single()

      const bundleName = bundle?.name || produk.toUpperCase()
      const sku = bundle?.id?.slice(0, 8) || 'WA-ORDER'
      const qty = parseInt(kuantiti) || 1
      const price = parseFloat(harga) || 0
      const caraBayaran = (bayaran || 'COD').toUpperCase()

      // Generate order number
      const orderNumber = generateOrderNumber()
      const today = new Date()

      // Insert order - Customer order via WhatsApp (skip Ninjavan)
      const { error: orderError } = await supabase
        .from('customer_orders')
        .insert({
          no_tempahan: orderNumber,
          marketer_id: marketerId,
          marketer_id_staff: marketerIdStaff,
          marketer_name: nama.toUpperCase(),
          no_phone: phone,
          alamat: alamat.toUpperCase(),
          poskod: poskod,
          bandar: bandar.toUpperCase(),
          negeri: negeri.toUpperCase(),
          produk: bundleName,
          sku: sku,
          kuantiti: qty,
          harga_jualan_sebenar: price,
          harga_jualan_produk: price,
          cara_bayaran: caraBayaran,
          jenis_platform: 'WhatsApp', // Mark as WhatsApp order
          jenis_customer: 'EC', // Customer
          kurier: 'Manual', // Skip Ninjavan - Manual delivery
          tarikh_tempahan: formatDate(today),
          date_order: today.toISOString().split('T')[0],
          delivery_status: 'Pending',
          nota_staff: 'Order via WhatsApp webhook',
        })

      if (orderError) {
        console.error('Insert order error:', orderError)
        return res.status(200).json({
          success: false,
          message: 'Gagal menambah order: ' + orderError.message
        })
      }

      return res.status(200).json({
        success: true,
        message: `Order berjaya: ${orderNumber} - ${nama} - RM${price}`
      })
    }

    // Command: #status - Check order status by phone
    // Format: #status|phone
    if (messageLower.startsWith('#status')) {
      const parts = message.split('|').map((p: string) => p.trim())
      const phone = parts[1] || sender.replace(/\D/g, '')

      if (!phone) {
        return res.status(200).json({
          success: false,
          message: 'Format: #status|phone'
        })
      }

      const { data: orders } = await supabase
        .from('customer_orders')
        .select('no_tempahan, produk, delivery_status, no_tracking, tarikh_tempahan')
        .eq('no_phone', phone)
        .order('created_at', { ascending: false })
        .limit(5)

      if (!orders || orders.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'Tiada order dijumpai untuk nombor ini'
        })
      }

      const statusList = orders.map((o: any) =>
        `${o.no_tempahan}: ${o.produk} - ${o.delivery_status}${o.no_tracking ? ` (${o.no_tracking})` : ''}`
      ).join('\n')

      return res.status(200).json({
        success: true,
        message: `Order untuk ${phone}:\n${statusList}`
      })
    }

    // Default: Log the message
    console.log('Unhandled message:', { sender, message })

    return res.status(200).json({
      success: true,
      message: 'Message received'
    })

  } catch (error: any) {
    console.error('Webhook error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    })
  }
}
