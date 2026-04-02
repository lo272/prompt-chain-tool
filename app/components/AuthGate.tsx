import { redirect } from 'next/navigation'
import { createClient } from '@/app/utils/supabase/server'

export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_superadmin, is_matrix_admin')
    .eq('id', user.id)
    .single()

  const authorized = profile?.is_superadmin || profile?.is_matrix_admin

  if (!authorized) {
    redirect('/access-denied')
  }

  return { user, supabase }
}
