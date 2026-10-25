import { useSearchParams } from 'react-router-dom'
import { PageHead } from './AppShell'
import SimulationPicker from '@/components/SimulationPicker'
import { useSeo } from '@/lib/seo'

export default function Simulations() {
  useSeo('Simulations', 'Realistic phone scenarios showing how Parallel handles notifications as they happen.', '/app/simulations', { noindex: true })
  const [params, setParams] = useSearchParams()
  return (
    <>
      <PageHead title="Simulations" crumbs="Simulations"
        sub="Five real-life moments, played on a phone: what lands, what Parallel shows on top of it, what you choose, and what happens later." />
      <SimulationPicker value={params.get('scenario') ?? 'study'} onChange={(id) => setParams({ scenario: id }, { replace: true })} />
    </>
  )
}
