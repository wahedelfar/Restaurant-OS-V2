import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'المندوب - Restaurant OS',
  manifest: '/driver/manifest.json',
  themeColor: '#B58A52',
  icons: {
    icon: '/icon-192.png?v=3',
    apple: '/icon-180.png?v=3',
  },
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return children
}
