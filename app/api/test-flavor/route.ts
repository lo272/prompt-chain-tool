import type { NextRequest } from 'next/server'

const API_BASE = 'https://api.almostcrackd.ai'

export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization')
  if (!token) {
    return Response.json({ error: 'Missing Authorization header' }, { status: 401 })
  }

  const form = await request.formData()
  const file = form.get('image') as File | null
  const humorFlavorId = form.get('humorFlavorId') as string | null

  if (!file || !humorFlavorId) {
    return Response.json({ error: 'Missing image or humorFlavorId' }, { status: 400 })
  }

  const authHeaders = { Authorization: token }

  // Step 1: get presigned upload URL
  const presignRes = await fetch(`${API_BASE}/pipeline/generate-presigned-url`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType: file.type || 'image/jpeg' }),
  })
  if (!presignRes.ok) {
    const text = await presignRes.text()
    return Response.json({ error: `generate-presigned-url failed: ${text}` }, { status: presignRes.status })
  }
  const { presignedUrl, cdnUrl } = await presignRes.json()

  // Step 2: PUT file bytes directly to S3
  const uploadRes = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'image/jpeg' },
    body: await file.arrayBuffer(),
  })
  if (!uploadRes.ok) {
    return Response.json({ error: `S3 upload failed: ${uploadRes.status}` }, { status: 500 })
  }

  // Step 3: register image to get imageId
  const registerRes = await fetch(`${API_BASE}/pipeline/upload-image-from-url`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false }),
  })
  if (!registerRes.ok) {
    const text = await registerRes.text()
    return Response.json({ error: `upload-image-from-url failed: ${text}` }, { status: registerRes.status })
  }
  const { imageId } = await registerRes.json()

  // Step 4: generate captions
  const captionRes = await fetch(`${API_BASE}/pipeline/generate-captions`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageId, humorFlavorId: Number(humorFlavorId) }),
  })
  const raw = await captionRes.text()
  console.log('RAW:', raw.substring(0, 500))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseRaw = (raw: string): string[] => {
    try {
      const parsed = JSON.parse(raw)
      if (typeof parsed === 'string') return [parsed]
      if (Array.isArray(parsed)) return parsed.map((c: any) => typeof c === 'string' ? c : c.content || c.text || c.caption || JSON.stringify(c))
      if (parsed?.captions) return Array.isArray(parsed.captions) ? parsed.captions.map((c: any) => typeof c === 'string' ? c : c.content || c.text || JSON.stringify(c)) : [String(parsed.captions)]
      if (parsed?.data) return Array.isArray(parsed.data) ? parsed.data.map((c: any) => typeof c === 'string' ? c : c.content || c.text || JSON.stringify(c)) : [String(parsed.data)]
      return [raw]
    } catch {
      return [raw]
    }
  }

  const captions = parseRaw(raw)
  console.log('PARSED CAPTIONS:', JSON.stringify(captions))
  return Response.json({ captions })
}
