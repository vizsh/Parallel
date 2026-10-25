import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PhoneDemo from '@/components/PhoneDemo'
import { useSeo } from '@/lib/seo'

/** The phone demo on its own page. `?clean=1` hides everything but the phone and captions, for screen recording. */
export default function Demo() {
  useSeo('Parallel on your phone', 'Watch a notification land and Parallel score it, peek at both futures and hold it until your checkpoint.', '/demo')
  const [params] = useSearchParams()
  const clean = params.get('clean') === '1'
  return (
    <main className="min-h-[100svh] bg-bg text-ink flex flex-col items-center justify-center px-4 py-10 gap-8">
      {!clean && (
        <header className="w-full max-w-5xl flex items-center justify-between">
          <Link to="/" className="small text-muted hover:text-ink flex items-center gap-1"><ArrowLeft size={15} /> Parallel</Link>
          <Link to="/demo?clean=1" className="small text-muted hover:text-ink">Recording mode</Link>
        </header>
      )}
      {!clean && (
        <div className="text-center max-w-xl">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">How Parallel works on your phone</h1>
          <p className="text-muted mt-3">A ping lands. Parallel sits on top of it, prices it in focus minutes, lets you peek at both futures and holds it until a better moment.</p>
        </div>
      )}
      <PhoneDemo big />
      {!clean && <p className="small text-muted text-center max-w-md">On Android this runs over real notifications via a notification listener. iOS can’t read other apps’ notifications, so there it works through Focus filters and the in-app inbox.</p>}
    </main>
  )
}
