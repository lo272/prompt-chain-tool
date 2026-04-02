import { redirect } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/server'
import LoginPage from '@/app/components/LoginPage'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return <LoginPage />
}
