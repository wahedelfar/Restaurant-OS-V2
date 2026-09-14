import fs from 'node:fs'
import path from 'node:path'

export const dynamic = 'force-dynamic'

export default function KdsPage() {
  const filePath = path.join(process.cwd(), 'public', 'kds', 'index.html')
  const html = fs.readFileSync(filePath, 'utf8')

  return (
    <iframe
      srcDoc={html}
      title="إدارة المطبخ"
      style={{ width: '100vw', height: '100vh', border: 'none', display: 'block' }}
    />
  )
}
