const fs=require('fs');const zlib=require('zlib');
function u32(b,o){return b.readUInt32BE(o)}
function paeth(a,b,c){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb?a:pb<=pc?b:c}
function decodePNG(buf){
  let p=8,w,h,bd,ct,interlace=0,idat=[],plte=null,trns=null;
  while(p<buf.length){
    const n=u32(buf,p),t=buf.toString('ascii',p+4,p+8),d=buf.subarray(p+8,p+8+n);
    p+=12+n;
    if(t==='IHDR'){w=u32(d,0);h=u32(d,4);bd=d[8];ct=d[9];interlace=d[12]}
    if(t==='PLTE')plte=Buffer.from(d);
    if(t==='tRNS')trns=Buffer.from(d);
    if(t==='IDAT')idat.push(d);
    if(t==='IEND')break
  }
  if(buf.readUInt32BE(0)!==0x89504e47||bd!==8||![2,3,6].includes(ct)||interlace!==0)
    throw Error('public/icon-180.png must be a non-interlaced 8-bit RGB, indexed, or RGBA PNG');
  if(ct===3&&(!plte||plte.length<3||plte.length%3))throw Error('Indexed PNG is missing a valid PLTE palette');
  const bpp=ct===6?4:ct===2?3:1,row=w*bpp;
  const raw=zlib.inflateSync(Buffer.concat(idat)),out=Buffer.alloc(h*w*4);
  let ro=0,prev=Buffer.alloc(row);
  for(let y=0;y<h;y++){
    const f=raw[ro++],cur=Buffer.alloc(row);
    for(let x=0;x<row;x++){
      const v=raw[ro++],a=x>=bpp?cur[x-bpp]:0,b=prev[x],c=x>=bpp?prev[x-bpp]:0;
      cur[x]=(v+(f===0?0:f===1?a:f===2?b:f===3?Math.floor((a+b)/2):paeth(a,b,c)))&255
    }
    for(let x=0;x<w;x++){
      const si=x*bpp,di=(y*w+x)*4;
      if(ct===3){
        const pi=cur[si]*3;
        out[di]=plte[pi]??0;out[di+1]=plte[pi+1]??0;out[di+2]=plte[pi+2]??0;out[di+3]=trns&&cur[si]<trns.length?trns[cur[si]]:255;
      }else{
        out[di]=cur[si];out[di+1]=cur[si+1];out[di+2]=cur[si+2];out[di+3]=ct===6?cur[si+3]:255;
      }
    }
    prev=cur
  }
  return{w,h,data:out}
}
function crc32(buf){let c=0xffffffff;for(const v of buf){c^=v;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return(c^0xffffffff)>>>0}
function chunk(type,data){const t=Buffer.from(type),o=Buffer.alloc(12+data.length);o.writeUInt32BE(data.length,0);t.copy(o,4);data.copy(o,8);o.writeUInt32BE(crc32(Buffer.concat([t,data])),8+data.length);return o}
function encodePNG(w,h,data){const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=6;const raw=Buffer.alloc(h*(w*4+1));for(let y=0;y<h;y++){raw[y*(w*4+1)]=0;data.copy(raw,y*(w*4+1)+1,y*w*4,(y+1)*w*4)}return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))])}
function resize(im,n){const out=Buffer.alloc(n*n*4),sx=im.w/n,sy=im.h/n;for(let y=0;y<n;y++){const fy=(y+.5)*sy-.5,y0=Math.max(0,Math.floor(fy)),y1=Math.min(im.h-1,y0+1),wy=Math.max(0,fy-y0);for(let x=0;x<n;x++){const fx=(x+.5)*sx-.5,x0=Math.max(0,Math.floor(fx)),x1=Math.min(im.w-1,x0+1),wx=Math.max(0,fx-x0);for(let c=0;c<4;c++){const v=(1-wy)*((1-wx)*im.data[(y0*im.w+x0)*4+c]+wx*im.data[(y0*im.w+x1)*4+c])+wy*((1-wx)*im.data[(y1*im.w+x0)*4+c]+wx*im.data[(y1*im.w+x1)*4+c]);out[(y*n+x)*4+c]=Math.round(v)}}}return out}
const im=decodePNG(fs.readFileSync('public/icon-180.png'));for(const[n,name]of[[192,'public/icon-192.png'],[512,'public/icon-512.png']])fs.writeFileSync(name,encodePNG(n,n,resize(im,n)));
