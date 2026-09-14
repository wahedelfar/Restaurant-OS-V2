import fs from 'node:fs'
import path from 'node:path'

export const dynamic = 'force-static'

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'kds', 'index.html')
  const html = fs.readFileSync(filePath, 'utf8')
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate'
    }
  })
}
