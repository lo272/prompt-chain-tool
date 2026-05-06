import { requireAuth } from '@/app/components/AuthGate'
import Header from '@/app/components/Header'
import FlavorDetailClient from './FlavorDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function FlavorDetailPage({ params }: Props) {
  const { id } = await params
  const { supabase } = await requireAuth()

  const [{ data: flavor }, { data: steps }, { data: images }, { data: captions }] = await Promise.all([
    supabase
      .from('humor_flavors')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('humor_flavor_steps')
      .select('*')
      .eq('humor_flavor_id', id)
      .order('order_by'),
    supabase
      .from('images')
      .select('id, url, title')
      .limit(50),
    supabase
      .from('captions')
      .select('id, content, created_datetime_utc')
      .eq('humor_flavor_id', id)
      .order('created_datetime_utc', { ascending: false })
      .limit(50),
  ])

  if (!flavor) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
        <Header />
        <main style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
          <p style={{ color: 'var(--danger)' }}>Flavor not found.</p>
        </main>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      <Header />
      <FlavorDetailClient
        flavor={flavor}
        initialSteps={steps || []}
        images={images || []}
        captions={captions || []}
      />
    </div>
  )
}
