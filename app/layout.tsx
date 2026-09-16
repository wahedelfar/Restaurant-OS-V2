import './globals.css'
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="ar" dir="rtl"><body style={{background:'white',color:'black'}}>{children}</body></html>
}
