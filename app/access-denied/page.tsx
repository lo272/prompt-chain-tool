import Link from 'next/link'

export default function AccessDenied() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg)',
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '48px',
        textAlign: 'center',
        maxWidth: '400px',
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px', color: 'var(--danger)' }}>
          Access Denied
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          You do not have permission to access this application. You must be a superadmin or matrix admin.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            background: 'var(--primary)',
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Back to Login
        </Link>
      </div>
    </div>
  )
}
