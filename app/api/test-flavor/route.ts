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
  const registerText = await registerRes.text()
  console.log('register response status:', registerRes.status)
  console.log('register response body:', registerText)
  if (!registerRes.ok) {
    return Response.json({ error: `upload-image-from-url failed: ${registerText}` }, { status: registerRes.status })
  }
  const registerJson = JSON.parse(registerText)
  console.log('register keys:', Object.keys(registerJson))
  const imageId = registerJson.imageId ?? registerJson.image_id ?? registerJson.id ?? registerJson.data?.id ?? registerJson.data?.imageId
  console.log('resolved imageId:', imageId)

  if (!imageId) {
    return Response.json({ error: `Could not find imageId in response: ${registerText}` }, { status: 500 })
  }

  // Step 4: generate captions
  console.log('Sending to generate-captions:', JSON.stringify({ imageId, humorFlavorId: Number(humorFlavorId) }))
  const captionRes = await fetch(`${API_BASE}/pipeline/generate-captions`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageId, humorFlavorId: Number(humorFlavorId) }),
  })

  const raw = await captionRes.text()
  const captions = [raw]
  return Response.json({ captions })
}
