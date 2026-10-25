/**
 * Parallel's haptic language: one distinct feel per kind of choice, so you can tell what happened without looking.
 * Native (Capacitor) uses the Taptic/vibration engine; Android Chrome falls back to navigator.vibrate; elsewhere it's a no-op.
 */
import { useEffect, useRef } from 'react'
import type { ImpactStyle as Impact } from '@capacitor/haptics'
import { isNative } from './native'

export type Feel = 'tick' | 'allow' | 'hold' | 'digest' | 'noise' | 'pour' | 'success' | 'warning'

// Web vibration patterns (ms on/off). Kept short: a nudge, not a buzz.
const PATTERN: Record<Feel, number | number[]> = {
  tick: 6,
  allow: 18,
  hold: [14, 70, 14],
  digest: [8, 45, 8, 45, 8],
  noise: 40,
  pour: [6, 30, 6, 30, 6, 30, 6, 30, 6],
  success: [12, 60, 24],
  warning: [30, 50, 30],
}

let lastTick = 0

export function hapticsOn() {
  try { return localStorage.getItem('parallel.haptics') !== 'off' } catch { return true }
}

export async function feel(kind: Feel) {
  if (!hapticsOn()) return
  if (kind === 'tick') {
    const now = performance.now()
    if (now - lastTick < 45) return // ticks during a drag shouldn't blur into a buzz
    lastTick = now
  }
  if (!isNative()) {
    // browsers refuse (and log) vibration before the first tap on the page
    const active = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? true
    try { if (active) navigator.vibrate?.(PATTERN[kind]) } catch { /* unsupported */ }
    return
  }
  const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics')
  const impact = (style: Impact) => Haptics.impact({ style }).catch(() => {})
  const pulses = async (n: number, gap: number) => { for (let i = 0; i < n; i++) { await impact(ImpactStyle.Light); await new Promise((r) => setTimeout(r, gap)) } }
  switch (kind) {
    case 'tick': return impact(ImpactStyle.Light)
    case 'allow': return impact(ImpactStyle.Medium)
    case 'hold': return pulses(2, 90)
    case 'digest': return pulses(3, 60)
    case 'noise': return impact(ImpactStyle.Heavy)
    case 'pour': return pulses(5, 40)
    case 'success': return Haptics.notification({ type: NotificationType.Success }).catch(() => {})
    case 'warning': return Haptics.notification({ type: NotificationType.Warning }).catch(() => {})
  }
}

/** Calls `onShake` when the phone is shaken. iOS needs `requestMotion()` from a tap first. */
export function useShake(onShake: () => void, enabled = true) {
  const cb = useRef(onShake)
  cb.current = onShake
  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return
    let last = { x: 0, y: 0, z: 0 }, hits = 0, firstHit = 0, cooldown = 0
    const on = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity
      if (!a || a.x == null || a.y == null || a.z == null) return
      const d = Math.abs(a.x - last.x) + Math.abs(a.y - last.y) + Math.abs(a.z - last.z)
      last = { x: a.x, y: a.y, z: a.z }
      const now = Date.now()
      if (now < cooldown || d < 28) return
      if (now - firstHit > 700) { hits = 0; firstHit = now }
      if (++hits >= 3) { hits = 0; cooldown = now + 2000; cb.current() }
    }
    window.addEventListener('devicemotion', on)
    return () => window.removeEventListener('devicemotion', on)
  }, [enabled])
}

/** iOS Safari only delivers motion events after an explicit permission prompt, triggered by a tap. */
export async function requestMotion() {
  const D = (window as unknown as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } }).DeviceMotionEvent
  if (D?.requestPermission) { try { return (await D.requestPermission()) === 'granted' } catch { return false } }
  return true
}
