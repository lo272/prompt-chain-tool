'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/browser'

interface Flavor {
  id: string
  name: string
  description: string | null
  slug: string | null
}

interface Step {
  id: string
  humor_flavor_id: string
  name: string
  system_prompt: string | null
  user_prompt: string | null
  step_order: number
}

interface ImageRow {
  id: string
  url: string | null
  title: string | null
}

interface Props {
  flavor: Flavor
  initialSteps: Step[]
  images: ImageRow[]
}

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  fontSize: '13px',
  background: 'var(--input-bg)',
  color: 'var(--text)',
  outline: 'none',
}

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  marginBottom: '4px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
}

const cardStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '20px',
}

const btnPrimary = {
  background: 'var(--primary)',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  padding: '7px 16px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
}

const btnSecondary = {
  background: 'none',
  color: 'var(--text-muted)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '7px 14px',
  fontSize: '13px',
  cursor: 'pointer',
}

const btnDanger = {
  background: 'none',
  color: 'var(--danger)',
  border: '1px solid var(--danger)',
  borderRadius: '6px',
  padding: '7px 14px',
  fontSize: '13px',
  cursor: 'pointer',
}

export default function FlavorDetailClient({ flavor, initialSteps, images }: Props) {
  const router = useRouter()
  const supabase = createClient()

  // Flavor edit state
  const [flavorName, setFlavorName] = useState(flavor.name)
  const [flavorDesc, setFlavorDesc] = useState(flavor.description || '')
  const [flavorSlug, setFlavorSlug] = useState(flavor.slug || '')
  const [savingFlavor, setSavingFlavor] = useState(false)
  const [flavorMsg, setFlavorMsg] = useState('')

  // Steps state
  const [steps, setSteps] = useState<Step[]>(initialSteps)
  const [editingStep, setEditingStep] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Step>>({})

  // New step state
  const [showNewStep, setShowNewStep] = useState(false)
  const [newStep, setNewStep] = useState({
    name: '',
    system_prompt: '',
    user_prompt: '',
    step_order: (initialSteps.length + 1),
  })
  const [savingStep, setSavingStep] = useState(false)

  // Test section state
  const [imageUrl, setImageUrl] = useState('')
  const [selectedImageId, setSelectedImageId] = useState('')
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [testError, setTestError] = useState('')

  // --- Flavor save ---
  async function saveFlavor() {
    setSavingFlavor(true)
    setFlavorMsg('')
    const { error } = await supabase
      .from('humor_flavors')
      .update({ name: flavorName, description: flavorDesc, slug: flavorSlug })
      .eq('id', flavor.id)
    setSavingFlavor(false)
    setFlavorMsg(error ? `Error: ${error.message}` : 'Saved!')
    setTimeout(() => setFlavorMsg(''), 3000)
  }

  // --- Step CRUD ---
  async function createStep() {
    if (!newStep.name.trim()) return
    setSavingStep(true)
    const { data, error } = await supabase
      .from('humor_flavor_steps')
      .insert({
        humor_flavor_id: flavor.id,
        name: newStep.name,
        system_prompt: newStep.system_prompt,
        user_prompt: newStep.user_prompt,
        step_order: newStep.step_order,
      })
      .select()
      .single()
    setSavingStep(false)
    if (!error && data) {
      setSteps(prev => [...prev, data].sort((a, b) => a.step_order - b.step_order))
      setNewStep({ name: '', system_prompt: '', user_prompt: '', step_order: steps.length + 2 })
      setShowNewStep(false)
    }
  }

  function startEdit(step: Step) {
    setEditingStep(step.id)
    setEditForm({ ...step })
  }

  async function saveEdit() {
    if (!editingStep) return
    const { error } = await supabase
      .from('humor_flavor_steps')
      .update({
        name: editForm.name,
        system_prompt: editForm.system_prompt,
        user_prompt: editForm.user_prompt,
        step_order: editForm.step_order,
      })
      .eq('id', editingStep)
    if (!error) {
      setSteps(prev =>
        prev.map(s => s.id === editingStep ? { ...s, ...editForm } as Step : s)
          .sort((a, b) => a.step_order - b.step_order)
      )
      setEditingStep(null)
    }
  }

  async function deleteStep(id: string) {
    if (!confirm('Delete this step?')) return
    const { error } = await supabase.from('humor_flavor_steps').delete().eq('id', id)
    if (!error) setSteps(prev => prev.filter(s => s.id !== id))
  }

  async function moveStep(id: string, direction: 'up' | 'down') {
    const idx = steps.findIndex(s => s.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= steps.length) return

    const a = steps[idx]
    const b = steps[swapIdx]
    const newOrderA = b.step_order
    const newOrderB = a.step_order

    await Promise.all([
      supabase.from('humor_flavor_steps').update({ step_order: newOrderA }).eq('id', a.id),
      supabase.from('humor_flavor_steps').update({ step_order: newOrderB }).eq('id', b.id),
    ])

    setSteps(prev =>
      prev.map(s => {
        if (s.id === a.id) return { ...s, step_order: newOrderA }
        if (s.id === b.id) return { ...s, step_order: newOrderB }
        return s
      }).sort((a, b) => a.step_order - b.step_order)
    )
  }

  // --- Test flavor ---
  async function generateCaptions() {
    setTesting(true)
    setTestError('')
    setTestResult(null)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      setTestError('Not authenticated')
      setTesting(false)
      return
    }

    const imageId = selectedImageId || undefined
    const body: Record<string, unknown> = { humorFlavorId: flavor.id }
    if (imageId) body.imageId = imageId
    if (imageUrl) body.imageUrl = imageUrl

    try {
      const res = await fetch('https://api.almostcrackd.ai/pipeline/generate-captions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      setTestResult(JSON.stringify(json, null, 2))
    } catch (err: unknown) {
      setTestError(err instanceof Error ? err.message : 'Request failed')
    }
    setTesting(false)
  }

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Back link */}
      <button
        onClick={() => router.push('/dashboard')}
        style={{ ...btnSecondary, alignSelf: 'flex-start' }}
      >
        ← Back to Dashboard
      </button>

      {/* Flavor Info */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Flavor Details</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={flavorName} onChange={e => setFlavorName(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: '70px' }}
              value={flavorDesc}
              onChange={e => setFlavorDesc(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Slug</label>
            <input style={inputStyle} value={flavorSlug} onChange={e => setFlavorSlug(e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={saveFlavor} disabled={savingFlavor} style={btnPrimary}>
              {savingFlavor ? 'Saving...' : 'Save Changes'}
            </button>
            {flavorMsg && (
              <span style={{ fontSize: '13px', color: flavorMsg.startsWith('Error') ? 'var(--danger)' : 'var(--success)' }}>
                {flavorMsg}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Steps ({steps.length})</h2>
          <button onClick={() => setShowNewStep(v => !v)} style={btnPrimary}>
            {showNewStep ? 'Cancel' : '+ Add Step'}
          </button>
        </div>

        {/* New step form */}
        {showNewStep && (
          <div style={{
            border: '1px dashed var(--primary)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600 }}>New Step</h3>
            <div>
              <label style={labelStyle}>Name *</label>
              <input style={inputStyle} value={newStep.name} onChange={e => setNewStep(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Step Order</label>
              <input style={inputStyle} type="number" value={newStep.step_order} onChange={e => setNewStep(p => ({ ...p, step_order: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={labelStyle}>System Prompt</label>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }} value={newStep.system_prompt} onChange={e => setNewStep(p => ({ ...p, system_prompt: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>User Prompt</label>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }} value={newStep.user_prompt} onChange={e => setNewStep(p => ({ ...p, user_prompt: e.target.value }))} />
            </div>
            <div>
              <button onClick={createStep} disabled={savingStep} style={btnPrimary}>
                {savingStep ? 'Saving...' : 'Create Step'}
              </button>
            </div>
          </div>
        )}

        {steps.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>
            No steps yet. Add one above.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {steps.map((step, idx) => (
              <div key={step.id} style={{
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '14px 16px',
                background: 'var(--bg)',
              }}>
                {editingStep === step.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={labelStyle}>Name</label>
                      <input style={inputStyle} value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div>
                      <label style={labelStyle}>Step Order</label>
                      <input style={inputStyle} type="number" value={editForm.step_order ?? step.step_order} onChange={e => setEditForm(p => ({ ...p, step_order: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label style={labelStyle}>System Prompt</label>
                      <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }} value={editForm.system_prompt || ''} onChange={e => setEditForm(p => ({ ...p, system_prompt: e.target.value }))} />
                    </div>
                    <div>
                      <label style={labelStyle}>User Prompt</label>
                      <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }} value={editForm.user_prompt || ''} onChange={e => setEditForm(p => ({ ...p, user_prompt: e.target.value }))} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={saveEdit} style={btnPrimary}>Save</button>
                      <button onClick={() => setEditingStep(null)} style={btnSecondary}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          background: 'var(--tag-bg)',
                          color: 'var(--tag-text)',
                          borderRadius: '4px',
                          padding: '1px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}>#{step.step_order}</span>
                        <span style={{ fontWeight: 600, fontSize: '14px' }}>{step.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button
                          onClick={() => moveStep(step.id, 'up')}
                          disabled={idx === 0}
                          style={{ ...btnSecondary, padding: '4px 10px', opacity: idx === 0 ? 0.4 : 1 }}
                          title="Move up"
                        >↑</button>
                        <button
                          onClick={() => moveStep(step.id, 'down')}
                          disabled={idx === steps.length - 1}
                          style={{ ...btnSecondary, padding: '4px 10px', opacity: idx === steps.length - 1 ? 0.4 : 1 }}
                          title="Move down"
                        >↓</button>
                        <button onClick={() => startEdit(step)} style={btnSecondary}>Edit</button>
                        <button onClick={() => deleteStep(step.id)} style={btnDanger}>Delete</button>
                      </div>
                    </div>
                    {step.system_prompt && (
                      <div style={{ marginTop: '8px' }}>
                        <span style={{ ...labelStyle, display: 'inline' }}>System: </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{step.system_prompt.slice(0, 200)}{step.system_prompt.length > 200 ? '…' : ''}</span>
                      </div>
                    )}
                    {step.user_prompt && (
                      <div style={{ marginTop: '4px' }}>
                        <span style={{ ...labelStyle, display: 'inline' }}>User: </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{step.user_prompt.slice(0, 200)}{step.user_prompt.length > 200 ? '…' : ''}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Flavor */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Test Flavor</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Image URL</label>
            <input
              style={inputStyle}
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          {images.length > 0 && (
            <div>
              <label style={labelStyle}>Or pick from images table</label>
              <select
                style={inputStyle}
                value={selectedImageId}
                onChange={e => setSelectedImageId(e.target.value)}
              >
                <option value="">— Select an image —</option>
                {images.map(img => (
                  <option key={img.id} value={img.id}>
                    {img.title || img.url || img.id}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <button
              onClick={generateCaptions}
              disabled={testing}
              style={btnPrimary}
            >
              {testing ? 'Generating...' : 'Generate Captions'}
            </button>
          </div>
          {testError && (
            <div style={{ color: 'var(--danger)', fontSize: '13px' }}>{testError}</div>
          )}
          {testResult && (
            <pre style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '12px',
              overflow: 'auto',
              maxHeight: '400px',
              color: 'var(--text)',
            }}>
              {testResult}
            </pre>
          )}
        </div>
      </div>
    </main>
  )
}
