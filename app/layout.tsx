import './globals.css'
import LegacyRouteBridge from './legacy-route-bridge'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{margin:0}}>
        <style dangerouslySetInnerHTML={{__html:`
          :root{--brand:#D4AF37;--bg:#0D0E10;--surface:#17191D;--surface2:#202329;--text:#F6F1E7;--muted:#A9A39A}
          *{box-sizing:border-box}html,body{background:var(--bg);color:var(--text);font-family:Cairo,Arial,sans-serif}
          main[dir="rtl"]{background:radial-gradient(circle at 85% 0%,color-mix(in srgb,var(--brand) 12%,transparent),transparent 28%),radial-gradient(circle at 10% 40%,color-mix(in srgb,var(--brand) 7%,transparent),transparent 30%),var(--bg)!important;padding:0 0 60px!important}
          main[dir="rtl"]>header{position:sticky!important;top:0;z-index:30;max-width:none!important;width:100%;margin:0!important;padding:12px max(18px,calc((100vw - 1180px)/2))!important;background:color-mix(in srgb,var(--bg) 86%,transparent)!important;backdrop-filter:blur(18px);border-bottom:1px solid color-mix(in srgb,var(--text) 10%,transparent)}
          main[dir="rtl"]>header>div:first-child{display:flex!important;align-items:center;gap:12px}
          main[dir="rtl"]>header>div:first-child:before{content:'🍽️';width:50px;height:50px;border-radius:17px;display:grid;place-items:center;background:linear-gradient(145deg,var(--surface2),var(--surface));border:1px solid color-mix(in srgb,var(--brand) 45%,transparent);box-shadow:0 10px 28px #0007;font-size:27px;flex:0 0 auto}
          main[dir="rtl"]>header button{border:0!important;background:linear-gradient(135deg,var(--brand),color-mix(in srgb,var(--brand) 65%,white))!important;color:#111!important;font-weight:900!important;border-radius:15px!important;padding:12px 18px!important;box-shadow:0 8px 24px color-mix(in srgb,var(--brand) 18%,transparent);white-space:nowrap}
          main[dir="rtl"]>section{max-width:1180px!important;margin-left:auto!important;margin-right:auto!important}
          main[dir="rtl"]>section:nth-of-type(1){position:relative;overflow:hidden;min-height:250px;padding:32px!important;border-radius:30px!important;margin-top:22px!important;margin-bottom:18px!important;background:linear-gradient(135deg,var(--surface),var(--surface2))!important;border:1px solid color-mix(in srgb,var(--brand) 25%,transparent)!important;box-shadow:0 22px 60px #0008}
          main[dir="rtl"]>section:nth-of-type(1):before{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 15%,color-mix(in srgb,var(--brand) 8%,transparent),transparent 70%);pointer-events:none}
          main[dir="rtl"]>section:nth-of-type(1) h2{font-size:clamp(32px,7vw,58px)!important;line-height:1.15;font-weight:900;margin:0!important;max-width:650px}
          main[dir="rtl"]>section:nth-of-type(1) p{max-width:620px;color:var(--muted)!important;font-size:15px;line-height:1.9}
          main[dir="rtl"]>div:nth-of-type(1){max-width:1180px!important;margin:0 auto 18px!important;padding:0 0 4px!important}
          main[dir="rtl"]>div:nth-of-type(1) button{border:1px solid color-mix(in srgb,var(--text) 10%,transparent)!important;background:var(--surface)!important;color:var(--muted)!important;padding:11px 18px!important;border-radius:999px!important;font-weight:800!important;white-space:nowrap}
          main[dir="rtl"]>div:nth-of-type(1) button:first-child{background:var(--brand)!important;color:#111!important;border-color:var(--brand)!important}
          main[dir="rtl"]>section:nth-of-type(2){display:grid!important;grid-template-columns:repeat(auto-fit,minmax(270px,1fr))!important;gap:20px!important}
          main[dir="rtl"]>section:nth-of-type(2)>article{overflow:hidden;border-radius:26px!important;background:linear-gradient(145deg,var(--surface),#111216)!important;border:1px solid color-mix(in srgb,var(--text) 9%,transparent)!important;box-shadow:0 15px 45px #0006!important;transition:transform .2s,border-color .2s,box-shadow .2s}
          main[dir="rtl"]>section:nth-of-type(2)>article:hover{transform:translateY(-4px);border-color:color-mix(in srgb,var(--brand) 30%,transparent)!important;box-shadow:0 20px 55px #0008!important}
          main[dir="rtl"]>section:nth-of-type(2)>article>div:first-child{height:230px!important;background:radial-gradient(circle at 50% 40%,color-mix(in srgb,var(--brand) 18%,var(--surface2)),var(--surface2))!important;position:relative}
          main[dir="rtl"]>section:nth-of-type(2)>article>div:first-child>span{font-size:78px!important;filter:drop-shadow(0 12px 20px #0008)}
          main[dir="rtl"]>section:nth-of-type(2)>article>div:first-child>div{z-index:2!important;background:#111d!important;color:#fff!important;border:1px solid #fff2!important;backdrop-filter:blur(8px)}
          main[dir="rtl"]>section:nth-of-type(2)>article>div:last-child{padding:18px!important}
          main[dir="rtl"]>section:nth-of-type(2) h3{font-size:19px!important;font-weight:900}
          main[dir="rtl"]>section:nth-of-type(2) button{border:0!important;background:linear-gradient(135deg,var(--brand),color-mix(in srgb,var(--brand) 65%,white))!important;color:#111!important;font-weight:900!important;border-radius:12px!important;box-shadow:0 8px 24px color-mix(in srgb,var(--brand) 18%,transparent)}
          @media(max-width:700px){main[dir="rtl"]>header{padding:10px 14px!important}main[dir="rtl"]>header h1{font-size:18px!important}main[dir="rtl"]>section:nth-of-type(1){margin:14px 12px 18px!important;padding:24px!important}main[dir="rtl"]>div:nth-of-type(1),main[dir="rtl"]>section:nth-of-type(2){margin-left:12px!important;margin-right:12px!important}main[dir="rtl"]>section:nth-of-type(2){grid-template-columns:1fr!important}}
        `}} />
        <LegacyRouteBridge />
        {children}
      </body>
    </html>
  )
}
