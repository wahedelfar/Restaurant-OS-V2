"use client";
import Link from "next/link";
export default function Home(){
 return (
  <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#0a0a0a",color:"white"}}>
   <div style={{textAlign:"center"}}>
    <h1 style={{fontSize:40}}>Restaurant OS V10 ✅</h1>
    <p style={{margin:"20px 0",opacity:0.7}}>Fixed - Root Restored</p>
    <div style={{display:"flex",gap:12,justifyContent:"center"}}>
     <Link href="/kitchen" style={{padding:"12px 20px",background:"white",color:"black",borderRadius:8,textDecoration:"none"}}>Kitchen - PIN 1234</Link>
     <a href="/kds/index.html" style={{padding:"12px 20px",border:"1px solid #333",borderRadius:8,color:"white",textDecoration:"none"}}>KDS Direct</a>
    </div>
   </div>
  </main>
 );
}
