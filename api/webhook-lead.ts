import { createClient } from '@supabase/supabase-js'

export const config = {
  runtime: 'nodejs',
}

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

/**
 * Lead Webhook - Auto save lead from WhatsApp
 *
 * Format: #lead
 * nama: [nama prospek]
 * phone: [no telefon]
 * niche: [niche/produk]
 * jenis: [NP/EP]
 *
 * This webhook is called by Whacenter when a message matches the #lead pattern
 */

interface LeadData {
  nama: string
  phone: string
  niche: string
  jenis: string
}

function parseLeadMessage(message: string): LeadData | null {
  try {
    const lines = message.split('\n').map(line => line.trim())

    // Check if message starts with #lead
    if (!lines[0].toLowerCase().includes('#lead')) {
      return null
    }

    const data: Partial<LeadData> = {}

    for (const line of lines) {
      const lowerLine = line.toLowerCase()

      if (lowerLine.startsWith('nama:')) {
        data.nama = line.substring(5).trim()
      } else if (lowerLine.startsWith('phone:') || lowerLine.startsWith('telefon:') || lowerLine.startsWith('hp:')) {
        data.phone = line.split(':')[1].trim()
      } else if (lowerLine.startsWith('niche:') || lowerLine.startsWith('produk:')) {
        data.niche = line.split(':')[1].trim()
      } else if (lowerLine.startsWith('jenis:') || lowerLine.startsWith('type:')) {
        const value = line.split(':')[1].trim().toUpperCase()
        data.jenis = value === 'EP' ? 'EP' : 'NP'
      }
    }

    // Validate required fields
    if (!data.nama || !data.phone || !data.niche) {
      return null
    }

    return {
      nama: data.nama,
      phone: data.phone,
      niche: data.niche,
      jenis: data.jenis || 'NP'
    }
  } catch {
    return null
  }
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
    const { device_id, message, sender } = webhookData

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      })
    }

    // Parse lead data from message
    const leadData = parseLeadMessage(message)

    if (!leadData) {
      return res.status(200).json({
        success: false,
        message: 'Message is not a valid lead format',
        hint: 'Format: #lead\nnama: [name]\nphone: [phone]\nniche: [niche]\njenis: [NP/EP]'
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

    if (device_id) {
      const { data: deviceSettings } = await supabase
        .from('device_setting')
        .select('user_id')
        .eq('device_id', device_id)
        .limit(1)

      if (deviceSettings && deviceSettings.length > 0) {
        marketerId = deviceSettings[0].user_id

        // Get marketer's idstaff
        const { data: profile } = await supabase
          .from('profiles')
          .select('idstaff')
          .eq('id', marketerId)
          .limit(1)

        if (profile && profile.length > 0) {
          marketerIdStaff = profile[0].idstaff
        }
      }
    }

    // Format phone number
    let formattedPhone = leadData.phone.replace(/\D/g, '')
    if (formattedPhone.startsWith('60')) {
      formattedPhone = '0' + formattedPhone.substring(2)
    }
    if (!formattedPhone.startsWith('0')) {
      formattedPhone = '0' + formattedPhone
    }

    // Check if prospect already exists
    const { data: existingProspects } = await supabase
      .from('prospects')
      .select('id')
      .eq('no_telefon', formattedPhone)
      .limit(1)

    if (existingProspects && existingProspects.length > 0) {
      return res.status(200).json({
        success: false,
        message: 'Prospect already exists',
        phone: formattedPhone
      })
    }

    // Insert new prospect
    const { data: newProspect, error: insertError } = await supabase
      .from('prospects')
      .insert({
        nama_prospek: leadData.nama,
        no_telefon: formattedPhone,
        niche: leadData.niche,
        jenis_prospek: leadData.jenis,
        tarikh_phone_number: new Date().toISOString().split('T')[0],
        marketer_id_staff: marketerIdStaff,
        created_by: marketerId
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting prospect:', insertError)
      return res.status(500).json({
        success: false,
        error: 'Failed to save prospect',
        details: insertError.message
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Lead saved successfully',
      prospect: {
        id: newProspect.id,
        nama: leadData.nama,
        phone: formattedPhone,
        niche: leadData.niche,
        jenis: leadData.jenis
      }
    })

  } catch (error: any) {
    console.error('Lead webhook error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    })
  }
}
