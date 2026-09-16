'use client'

import { useEffect } from 'react'

const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'

export default function LegacyCompat({ mode }: { mode: 'track' | 'dine-track' | 'driver' }) {
  useEffect(() => {
    const scripts = mode === 'driver'
      ? ['/config.js?v=4', SUPABASE_CDN, '/app.js?v=10', '/delivery-gps-fix.js?v=1', '/delivery-gps-clean-v2.js?v=3', '/driver-app-v1.js?v=5', '/driver-gps-lifecycle-v1.js?v=1', '/driver-delivered-button-fix-v1.js?v=1']
      : ['/config.js?v=4', SUPABASE_CDN, '/app.js?v=10', '/customer-tracking-v2.js?v=7', ...(mode === 'dine-track' ? ['/dine-in-track-router-v1.js?v=1'] : [])]

    let cancelled = false
    const load = (src: string) => new Promise<void>((resolve, reject) => {
      if (document.querySelector(`script[data-ros-legacy="${src}"]`)) return resolve()
      const s = document.createElement('script')
      s.src = src
      s.async = false
      s.dataset.rosLegacy = src
      s.onload = () => resolve()
      s.onerror = () => reject(new Error(`Failed to load ${src}`))
      document.body.appendChild(s)
    })

    ;(async () => {
      try {
        for (const src of scripts) {
          if (cancelled) return
          await load(src)
        }
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      } catch (e) {
        console.error('ROS legacy compatibility route', e)
      }
    })()

    return () => { cancelled = true }
  }, [mode])

  return <div id="app" style={{ minHeight: '100vh', background: '#0D0E10', color: '#F6F1E7' }} />
}
