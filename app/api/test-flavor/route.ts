import type { NextRequest } from 'next/server'

const API_BASE = 'https://api.almostcrackd.ai'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractImageId(obj: any): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined
  // Try top-level fields
  for (const key of ['imageId', 'image_id', 'id', 'uuid', 'imageUuid', 'imgId']) {
    if (obj[key] != null) return String(obj[key])
  }
  // Try one level deep
  for (const key of ['data', 'result', 'image', 'item', 'body']) {
    if (obj[key] && typeof obj[key] === 'object') {
      for (const inner of ['imageId', 'image_id', 'id', 'uuid']) {
        if (obj[key][inner] != null) return String(obj[key][inner])
      }
    }
  }
  return undefined
}

function extractCaptions(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'string') return [parsed]
    if (Array.isArray(parsed)) return parsed.map((c: unknown) => typeof c === 'string' ? c : JSON.stringify(c))
    if (parsed?.captions) {
      const arr = Array.isArray(parsed.captions) ? parsed.captions : [parsed.captions]
      return arr.map((c: unknown) => typeof c === 'string' ? c : JSON.stringify(c))
    }
    if (parsed?.data && Array.isArray(parsed.data)) {
      return parsed.data.map((c: unknown) => typeof c === 'string' ? c : JSON.stringify(c))
    }
    return [raw]
  } catch {
    return [raw]
  }
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization')
  if (!token) {
    return Response.json({ error: 'Missing Authorization header' }, { status: 401 })
  }

  const form = await request.formData()
  const file = form.get('image') as File | null
  const selectedImageId = form.get('selectedImageId') as string | null
  const humorFlavorId = form.get('humorFlavorId') as string | null

  if (!humorFlavorId) {
    return Response.json({ error: 'Missing humorFlavorId' }, { status: 400 })
  }
  if (!file && !selectedImageId) {
    return Response.json({ error: 'Missing image or selectedImageId' }, { status: 400 })
  }

  const authHeaders = { Authorization: token }

  // If we already have an imageId, skip the upload steps
  if (selectedImageId) {
    const captionRes = await fetch(`${API_BASE}/pipeline/generate-captions`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageId: selectedImageId, humorFlavorId: Number(humorFlavorId) }),
    })
    const raw = await captionRes.text()
    console.log('caption (selectedImageId):', captionRes.status, raw.substring(0, 300))
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.error) return Response.json({ error: `generate-captions failed: ${parsed.message || raw}` }, { status: captionRes.status })
    } catch { /* plain text */ }
    return Response.json({ captions: extractCaptions(raw) })
  }

  // Step 1: get presigned upload URL
  const presignRes = await fetch(`${API_BASE}/pipeline/generate-presigned-url`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType: file.type || 'image/jpeg' }),
  })
  if (!presignRes.ok) {
    const text = await presignRes.text()
    return Response.json({ error: `generate-presigned-url failed (${presignRes.status}): ${text}` }, { status: presignRes.status })
  }
  const { presignedUrl, cdnUrl } = await presignRes.json()

  // Step 2: PUT file bytes to S3
  const uploadRes = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'image/jpeg' },
    body: await file.arrayBuffer(),
  })
  if (!uploadRes.ok) {
    return Response.json({ error: `S3 upload failed (${uploadRes.status})` }, { status: 500 })
  }

  // Step 3: register image to get imageId
  const registerRes = await fetch(`${API_BASE}/pipeline/upload-image-from-url`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false }),
  })
  const registerText = await registerRes.text()
  console.log('register:', registerRes.status, registerText)

  if (!registerRes.ok) {
    return Response.json({ error: `upload-image-from-url failed (${registerRes.status}): ${registerText}` }, { status: registerRes.status })
  }

  let registerJson: unknown
  try { registerJson = JSON.parse(registerText) } catch {
    return Response.json({ error: `upload-image-from-url returned non-JSON: ${registerText}` }, { status: 500 })
  }

  const imageId = extractImageId(registerJson)
  console.log('imageId:', imageId, 'from:', registerText)

  if (!imageId) {
    return Response.json({ error: `Could not extract imageId from register response: ${registerText}` }, { status: 500 })
  }

  // Step 4: generate captions
  const captionBody = { imageId, humorFlavorId: Number(humorFlavorId) }
  console.log('generate-captions body:', JSON.stringify(captionBody))

  const captionRes = await fetch(`${API_BASE}/pipeline/generate-captions`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(captionBody),
  })

  const raw = await captionRes.text()
  console.log('caption response:', captionRes.status, raw.substring(0, 300))

  try {
    const parsed = JSON.parse(raw)
    if (parsed?.error) {
      return Response.json({ error: `generate-captions failed: ${parsed.message || raw}` }, { status: captionRes.status })
    }
  } catch { /* plain text is fine */ }

  return Response.json({ captions: extractCaptions(raw) })
}
