'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/browser'

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  fontSize: '14px',
  background: 'var(--input-bg)',
  color: 'var(--text)',
  outline: 'none',
}

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  marginBottom: '6px',
  color: 'var(--text)',
}

export default function NewFlavorForm() {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const { data, error: err } = await supabase
      .from('humor_flavors')
      .insert({ slug: name.trim(), description: description.trim() })
      .select()
      .single()

    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      router.push(`/dashboard/flavor/${data.id}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '28px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    }}>
      <div>
        <label style={labelStyle}>Name *</label>
        <input
          style={inputStyle}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Sarcastic Dad Jokes"
          required
        />
      </div>
      <div>
        <label style={labelStyle}>Description</label>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Brief description of this humor flavor"
        />
      </div>
      {error && (
        <div style={{ color: 'var(--danger)', fontSize: '13px' }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            background: 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Creating...' : 'Create Flavor'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            background: 'none',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '10px 24px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
