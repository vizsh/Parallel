import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import { feel } from './feel'

export function useApi<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!path)
  const load = useCallback(() => {
    if (!path) return
    setLoading(true)
    api<T>(path).then((d) => { setData(d); setError(null) }).catch((e) => setError(e.message)).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps])
  useEffect(() => { load() }, [load])
  return { data, error, loading, reload: load, setData }
}

type Toast = { id: number; text: string; tone?: 'calm' | 'chaos' }
let listeners: ((t: Toast[]) => void)[] = []
let toasts: Toast[] = []

/** `quiet` skips the haptic when the gesture that caused the toast already gave its own. */
export function toast(text: string, tone: Toast['tone'] = 'calm', quiet = false) {
  const t = { id: Date.now() + Math.random(), text, tone }
  if (!quiet) feel(tone === 'chaos' ? 'warning' : 'success')
  toasts = [...toasts, t]
  listeners.forEach((l) => l(toasts))
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id)
    listeners.forEach((l) => l(toasts))
  }, 3800)
}

export function useToasts() {
  const [list, setList] = useState<Toast[]>(toasts)
  useEffect(() => {
    listeners.push(setList)
    return () => { listeners = listeners.filter((l) => l !== setList) }
  }, [])
  return list
}
