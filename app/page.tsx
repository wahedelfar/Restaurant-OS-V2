"use client";
import Link from "next/link";

export default function Home() {
  return (
    <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#0a0a0a",color:"white",fontFamily:"system-ui"}}>
      <div style={{textAlign:"center"}}>
        <h1 style={{fontSize:48,marginBottom:20}}>🍽️ Restaurant OS V10</h1>
        <p style={{opacity:0.7,marginBottom:30}}>System Restored - Ready ✅</p>
        <div style={{display:"flex",gap:15,justifyContent:"center"}}>
          <Link href="/kitchen" style={{padding:"12px 24px",background:"white",color:"black",borderRadius:8,textDecoration:"none",fontWeight:700}}>Kitchen KDS - PIN 1234</Link>
          <Link href="/admin" style={{padding:"12px 24px",border:"1px solid #333",borderRadius:8,textDecoration:"none",color:"white"}}>Admin</Link>
        </div>
      </div>
    </main>
  );
}
