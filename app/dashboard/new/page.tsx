import { requireAuth } from '@/app/components/AuthGate'
import Header from '@/app/components/Header'
import NewFlavorForm from './NewFlavorForm'

export default async function NewFlavorPage() {
  await requireAuth()
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      <Header />
      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>New Humor Flavor</h1>
        <NewFlavorForm />
      </main>
    </div>
  )
}
