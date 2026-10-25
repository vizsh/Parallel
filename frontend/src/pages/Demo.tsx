import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PhoneDemo from '@/components/PhoneDemo'
import SimulationPicker from '@/components/SimulationPicker'
import { useSeo } from '@/lib/seo'

/**
 * Public simulations. `?scenario=<id>` picks one; `?clean=1` hides everything but the phone and captions,
 * which is how the videos in public/simulations were recorded.
 */
export default function Demo() {
  useSeo('Parallel on your phone', 'Watch realistic phone scenarios: a ping lands, Parallel scores it, peeks both futures and holds it until your checkpoint.', '/demo')
  const [params, setParams] = useSearchParams()
  const scenario = params.get('scenario') ?? 'study'
  if (params.get('clean') === '1') {
    return <main className="min-h-[100svh] bg-bg text-ink flex items-center justify-center px-4 py-10"><PhoneDemo scenario={scenario} big controls={false} /></main>
  }
  return (
    <main className="min-h-[100svh] bg-bg text-ink px-4 py-8 sm:py-10">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <header className="flex items-center justify-between">
          <Link to="/" className="small text-muted hover:text-ink flex items-center gap-1"><ArrowLeft size={15} /> Parallel</Link>
          <Link to={`/demo?scenario=${scenario}&clean=1`} className="small text-muted hover:text-ink">Recording mode</Link>
        </header>
        <div className="max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">How Parallel works on your phone</h1>
          <p className="text-muted mt-3">Pick a moment. Watch a ping land, Parallel price it on top of the notification, and what happens to your focus and your evening.</p>
        </div>
        <SimulationPicker value={scenario} onChange={(id) => setParams({ scenario: id }, { replace: true })} />
        <p className="small text-muted max-w-2xl">On Android this runs over real notifications through a notification listener. iOS can’t read other apps’ notifications, so there it works through Focus filters and the in-app inbox. Numbers in these scenarios are illustrative; in the app they come from your own twin.</p>
      </div>
    </main>
  )
}
