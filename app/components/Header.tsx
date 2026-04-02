'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/browser'

type Theme = 'light' | 'dark' | 'system'

export default function Header() {
  const router = useRouter()
  const supabase = createClient()
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    const stored = (localStorage.getItem('theme') as Theme) || 'system'
    setTheme(stored)
    applyTheme(stored)
  }, [])

  function applyTheme(t: Theme) {
    const isDark =
      t === 'dark' ||
      (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }

  function cycleTheme() {
    const next: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
    localStorage.setItem('theme', next)
    applyTheme(next)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const themeIcon = theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '🖥️'

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: 'var(--header-bg)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      height: '60px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <Link href="/dashboard" style={{ textDecoration: 'none', color: 'var(--text)' }}>
          <span style={{ fontWeight: 700, fontSize: '18px' }}>Prompt Chain Tool</span>
        </Link>
        <nav style={{ display: 'flex', gap: '16px' }}>
          <Link href="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px' }}>
            Dashboard
          </Link>
          <Link href="/dashboard/new" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px' }}>
            New Flavor
          </Link>
        </nav>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={cycleTheme}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '14px',
            color: 'var(--text)',
          }}
          title={`Theme: ${theme}`}
        >
          {themeIcon} {theme}
        </button>
        <button
          onClick={signOut}
          style={{
            background: 'var(--danger)',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 14px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#fff',
          }}
        >
          Sign Out
        </button>
      </div>
    </header>
  )
}
