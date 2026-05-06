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
  console.log('imageId type:', typeof imageId, 'value:', imageId)
  console.log('humorFlavorId type:', typeof humorFlavorId, 'value:', humorFlavorId)
  console.log('Sending to generate-captions:', JSON.stringify({ imageId, humorFlavorId: Number(humorFlavorId) }))

  let captionRes = await fetch(`${API_BASE}/pipeline/generate-captions`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageId, humorFlavorId: Number(humorFlavorId) }),
  })

  // If first attempt fails, retry with humorFlavorId as string
  if (!captionRes.ok) {
    console.log('First attempt failed with status:', captionRes.status, '— retrying with string humorFlavorId')
    captionRes = await fetch(`${API_BASE}/pipeline/generate-captions`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageId, humorFlavorId: String(humorFlavorId) }),
    })
  }

  const raw = await captionRes.text()
  console.log('FULL RAW:', raw)

  let captions: string[] = []
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'string') captions = [parsed]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    else if (Array.isArray(parsed)) captions = parsed.map((c: any) => typeof c === 'string' ? c : c.content || c.text || JSON.stringify(c))
    else if (parsed?.captions) captions = Array.isArray(parsed.captions) ? parsed.captions : [String(parsed.captions)]
    else if (parsed?.message && !parsed?.error) captions = [parsed.message]
    else if (parsed?.error) return Response.json({ error: parsed.message || raw }, { status: 500 })
    else captions = [JSON.stringify(parsed)]
  } catch {
    captions = [raw]
  }

  return Response.json({ captions })
}
