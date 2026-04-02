import Link from 'next/link'
import { requireAuth } from '@/app/components/AuthGate'
import Header from '@/app/components/Header'

export default async function DashboardPage() {
  const { supabase } = await requireAuth()

  const { data: flavors, error } = await supabase
    .from('humor_flavors')
    .select('id, name, description, slug')
    .order('name')

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

        {!flavors || flavors.length === 0 ? (
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
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {flavors.map((flavor) => (
              <Link
                key={flavor.id}
                href={`/dashboard/flavor/${flavor.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '20px 24px',
                  transition: 'border-color 0.15s',
                  cursor: 'pointer',
                }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                        {flavor.name}
                      </h2>
                      {flavor.description && (
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{flavor.description}</p>
                      )}
                    </div>
                    {flavor.slug && (
                      <span style={{
                        background: 'var(--tag-bg)',
                        color: 'var(--tag-text)',
                        padding: '2px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 500,
                        flexShrink: 0,
                        marginLeft: '12px',
                      }}>
                        {flavor.slug}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
