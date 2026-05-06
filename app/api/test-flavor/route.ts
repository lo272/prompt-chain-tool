import type { NextRequest } from 'next/server'

const API_BASE = 'https://api.almostcrackd.ai'

export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization')
  if (!token) {
    return Response.json({ error: 'Missing Authorization header' }, { status: 401 })
  }

  const { imageUrl, humorFlavorId } = await request.json()
  if (!imageUrl || !humorFlavorId) {
    return Response.json({ error: 'Missing imageUrl or humorFlavorId' }, { status: 400 })
  }

  const authHeaders = { Authorization: token }

  // Step 1: get presigned upload URL
  const presignRes = await fetch(`${API_BASE}/pipeline/generate-presigned-url`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType: 'image/jpeg' }),
  })
  if (!presignRes.ok) {
    const text = await presignRes.text()
    return Response.json({ error: `generate-presigned-url failed: ${text}` }, { status: presignRes.status })
  }
  const { presignedUrl, cdnUrl } = await presignRes.json()

  // Step 2: fetch image bytes server-side and PUT to S3
  const imageRes = await fetch(imageUrl)
  if (!imageRes.ok) {
    return Response.json({ error: `Failed to fetch image: ${imageRes.status}` }, { status: 400 })
  }
  const imageBytes = await imageRes.arrayBuffer()

  const uploadRes = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: imageBytes,
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
    body: JSON.stringify({ imageId, humorFlavorId }),
  })
  const captionJson = await captionRes.json()
  return Response.json(captionJson, { status: captionRes.status })
}
