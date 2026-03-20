import { Skeleton } from '@/components/ui/skeleton'

export function DescSection({ label, value }: { label: string, value?: string }) {
  if (!value)
    return null
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-1">{label}</h3>
      <p className="text-sm text-slate-400 whitespace-pre-line">{value}</p>
    </div>
  )
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-5 w-1/3 bg-slate-800" />
      <Skeleton className="h-4 w-full bg-slate-800" />
      <Skeleton className="h-4 w-5/6 bg-slate-800" />
      <Skeleton className="h-4 w-4/6 bg-slate-800" />
    </div>
  )
}

export function ErrorState() {
  return <p className="text-sm text-slate-500 p-4">Could not load content.</p>
}

export function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-slate-500 p-4">{message}</p>
}
