import Link from 'next/link'
import { logout } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'

export default function CharactersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <Link href="/characters" className="font-semibold text-slate-100">vibe-dnd</Link>
        <form action={logout}>
          <Button variant="ghost" size="sm" type="submit" className="text-slate-400">
            Sign out
          </Button>
        </form>
      </nav>
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  )
}
