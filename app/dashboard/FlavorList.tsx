'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/app/utils/supabase/browser'

interface Flavor {
  id: string
  slug: string | null
  description: string | null
}

export default function FlavorList({ flavors: initial }: { flavors: Flavor[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [flavors, setFlavors] = useState(initial)

  async function deleteFlavor(e: React.MouseEvent, id: string) {
    e.preventDefault()
    if (!confirm('Delete this flavor and all its steps?')) return
    const { error } = await supabase.from('humor_flavors').delete().eq('id', id)
    if (!error) {
      setFlavors(prev => prev.filter(f => f.id !== id))
    }
  }

  if (flavors.length === 0) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '40px',
        textAlign: 'center',
        color: 'var(--text-muted)',
      }}>
        No humor flavors yet. Create one to get started.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {flavors.map((flavor) => (
        <Link key={flavor.id} href={`/dashboard/flavor/${flavor.id}`} style={{ textDecoration: 'none' }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '20px 24px',
            cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                  {flavor.slug}
                </h2>
                {flavor.description && (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{flavor.description}</p>
                )}
              </div>
              <button
                onClick={e => deleteFlavor(e, flavor.id)}
                style={{
                  background: 'none',
                  color: 'var(--danger)',
                  border: '1px solid var(--danger)',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
