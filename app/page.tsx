import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/characters')

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-5xl font-bold text-slate-100">vibe-dnd</h1>
      <p className="text-slate-400 text-lg">Your D&D 5e character reference</p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/auth/login">Sign in</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/auth/signup">Create account</Link>
        </Button>
      </div>
    </main>
  )
}
