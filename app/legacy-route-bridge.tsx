'use client'

import { useEffect } from 'react'

function routeHash() {
  const raw = window.location.hash || ''
  const m = raw.match(/^#(track|dine-track|driver)\/(.+)$/i)
  if (!m) return false
  const kind = m[1].toLowerCase()
  const token = decodeURIComponent(m[2])
  const path = kind === 'dine-track' ? '/dine-track' : kind === 'driver' ? '/driver' : '/track'
  const target = `${path}?token=${encodeURIComponent(token)}`
  window.location.replace(target)
  return true
}

export default function LegacyRouteBridge() {
  useEffect(() => {
    const admin = () => {
      const h = (window.location.hash || '').toLowerCase()
      if (h === '#admin' || h.startsWith('#admin/')) window.location.replace('/admin/')
      else if (h === '#kds' || h.startsWith('#kds/')) window.location.replace('/kds/')
      else routeHash()
    }
    admin()
    window.addEventListener('hashchange', admin)
    return () => window.removeEventListener('hashchange', admin)
  }, [])

  return null
}
