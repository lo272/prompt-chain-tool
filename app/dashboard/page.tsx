import Link from 'next/link'
import { requireAuth } from '@/app/components/AuthGate'
import Header from '@/app/components/Header'
import FlavorList from './FlavorList'

export default async function DashboardPage() {
  const { supabase } = await requireAuth()

  const { data: flavors, error } = await supabase
    .from('humor_flavors')
    .select('id, description, slug')
    .order('slug')

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      <Header />
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Humor Flavors</h1>
          <Link
            href="/dashboard/new"
            style={{
              background: 'var(--primary)',
              color: '#fff',
              padding: '8px 18px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            + New Flavor
          </Link>
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '14px' }}>
            Error loading flavors: {error.message}
          </div>
        )}

        <FlavorList flavors={flavors || []} />
      </main>
    </div>
  )
}
