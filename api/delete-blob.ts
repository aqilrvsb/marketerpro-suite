import { del } from '@vercel/blob'

export const config = {
  runtime: 'nodejs',
}

export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { url } = req.body

    if (!url) {
      return res.status(400).json({ error: 'URL is required' })
    }

    // Delete from Vercel Blob using server-side token
    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) {
      return res.status(500).json({ error: 'Blob token not configured' })
    }

    await del(url, { token })

    return res.status(200).json({
      success: true,
      message: 'File deleted successfully from Blob storage'
    })
  } catch (error: any) {
    console.error('Error deleting from Blob:', error)
    return res.status(500).json({
      error: 'Failed to delete from Blob storage',
      details: error.message
    })
  }
}
