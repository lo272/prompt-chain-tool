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
  const [duplicating, setDuplicating] = useState<string | null>(null)

  async function deleteFlavor(e: React.MouseEvent, id: string) {
    e.preventDefault()
    if (!confirm('Delete this flavor and all its steps?')) return
    const { error } = await supabase.from('humor_flavors').delete().eq('id', id)
    if (!error) {
      setFlavors(prev => prev.filter(f => f.id !== id))
    }
  }

  async function duplicateFlavor(e: React.MouseEvent, flavor: Flavor) {
    e.preventDefault()
    const newName = window.prompt('Enter a unique name for the duplicate:', `${flavor.slug} copy`)
    if (!newName || !newName.trim()) return

    const trimmed = newName.trim()
    if (flavors.some(f => f.slug === trimmed)) {
      alert(`A flavor named "${trimmed}" already exists. Please choose a different name.`)
      return
    }

    setDuplicating(flavor.id)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Create the new flavor
      const { data: newFlavor, error: flavorError } = await supabase
        .from('humor_flavors')
        .insert({
          slug: trimmed,
          description: flavor.description,
          created_by_user_id: user?.id,
          modified_by_user_id: user?.id,
        })
        .select('id, slug, description')
        .single()

      if (flavorError || !newFlavor) {
        alert(`Error creating duplicate: ${flavorError?.message}`)
        return
      }

      // Fetch original steps
      const { data: steps, error: stepsError } = await supabase
        .from('humor_flavor_steps')
        .select('*')
        .eq('humor_flavor_id', flavor.id)
        .order('order_by')

      if (stepsError) {
        alert(`Flavor duplicated but steps could not be copied: ${stepsError.message}`)
        setFlavors(prev => [...prev, newFlavor].sort((a, b) => (a.slug ?? '').localeCompare(b.slug ?? '')))
        router.push(`/dashboard/flavor/${newFlavor.id}`)
        return
      }

      // Insert copies of all steps
      if (steps && steps.length > 0) {
        const stepCopies = steps.map(({ id: _id, humor_flavor_id: _fid, ...rest }: Record<string, unknown>) => ({
          ...rest,
          humor_flavor_id: newFlavor.id,
          created_by_user_id: user?.id,
          modified_by_user_id: user?.id,
        }))
        const { error: insertError } = await supabase.from('humor_flavor_steps').insert(stepCopies)
        if (insertError) {
          alert(`Flavor duplicated but some steps could not be copied: ${insertError.message}`)
        }
      }

      setFlavors(prev => [...prev, newFlavor].sort((a, b) => (a.slug ?? '').localeCompare(b.slug ?? '')))
      router.push(`/dashboard/flavor/${newFlavor.id}`)
    } finally {
      setDuplicating(null)
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
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button
                  onClick={e => duplicateFlavor(e, flavor)}
                  disabled={duplicating === flavor.id}
                  style={{
                    background: 'none',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {duplicating === flavor.id ? 'Duplicating...' : 'Duplicate'}
                </button>
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
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
