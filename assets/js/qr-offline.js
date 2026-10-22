/* YES40 - offline QR encoder (ISO QR Model 2, byte mode, EC level M).
   Uses the QR block layouts/positions published in ISO/IEC 18004 and public
   qrcode conventions. No external API, tracking, or runtime dependency. */
(function(){ 'use strict';
const BLOCKS=[[1,26,16],[1,44,28],[1,70,44],[2,50,32],[2,67,43],[4,43,27],[4,49,31],[2,60,38,2,61,39],[3,58,36,2,59,37],[4,69,43,1,70,44],[1,80,50,4,81,51],[6,58,36,2,59,37],[8,59,37,1,60,38],[4,64,40,5,65,41],[5,65,41,5,66,42],[7,73,45,3,74,46],[10,74,46,1,75,47],[9,69,43,4,70,44],[3,70,44,11,71,45],[3,67,41,13,68,42]];
const POS=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90]];
function gf(a,b){let r=0;while(b){if(b&1)r^=a;b>>=1;a<<=1;if(a&256)a^=0x11D}return r}
function rsError(data, n){let gen=[1], p=1; for(let i=0;i<n;i++){let nxt=new Array(gen.length+1).fill(0);for(let j=0;j<gen.length;j++){nxt[j]^=gen[j];nxt[j+1]^=gf(gen[j],p)}gen=nxt;p=gf(p,2)}let ecc=new Array(n).fill(0);for(const v of data){const factor=v^ecc.shift();ecc.push(0);for(let k=0;k<n;k++)ecc[k]^=gf(gen[k+1],factor)}return ecc}
function getBlocks(v){let line=BLOCKS[v-1];let out=[];for(let i=0;i<line.length;i+=3){for(let n=0;n<line[i];n++)out.push({total:line[i+1],data:line[i+2]})}return out}
function encodeBytes(text){const bytes=new TextEncoder().encode(text);let v=0,blocks,capacity=0;for(let x=1;x<=20;x++){let b=getBlocks(x);let cap=b.reduce((n,o)=>n+o.data,0);if(bytes.length*8+4+(x<=9?8:16)<=cap*8){v=x;blocks=b;capacity=cap;break}}if(!v)throw new Error('網址太長，QR 產生失敗（建議使用較短的正式網址）。');const bits=[];function put(value,len){for(let i=len-1;i>=0;i--)bits.push((value>>>i)&1)}put(4,4);put(bytes.length,v<=9?8:16);for(const byte of bytes)put(byte,8);for(let n=Math.min(4,capacity*8-bits.length);n>0;n--)bits.push(0);while(bits.length%8)bits.push(0);let pad=0;while(bits.length<capacity*8){put(pad%2?17:236,8);pad++}let data=[];for(let i=0;i<bits.length;i+=8){let b=0;for(let j=0;j<8;j++)b=b*2+bits[i+j];data.push(b)}let offset=0,dc=[],ecc=[];for(const b of blocks){let chunk=data.slice(offset,offset+b.data);offset+=b.data;dc.push(chunk);ecc.push(rsError(chunk,b.total-b.data))}let out=[];for(let i=0;i<Math.max(...dc.map(x=>x.length));i++)for(const arr of dc)if(i<arr.length)out.push(arr[i]);for(let i=0;i<Math.max(...ecc.map(x=>x.length));i++)for(const arr of ecc)if(i<arr.length)out.push(arr[i]);return {v,bytes:out}}
function bch(value,poly,n){let data=value<<n;const degree=n;const bitlen=x=>x.toString(2).length;while(bitlen(data)>=bitlen(poly)){data^=poly<<(bitlen(data)-bitlen(poly))}return (value<<degree)|data}
function matrix(url){const {v,bytes}=encodeBytes(url);const sz=v*4+17;const A=Array.from({length:sz},()=>Array(sz).fill(null));function place(y,x,val){if(y>=0&&y<sz&&x>=0&&x<sz)A[y][x]=!!val}
 function finder(y,x){for(let r=-1;r<=7;r++)for(let c=-1;c<=7;c++){let dark=(r>=0&&r<=6&&[0,6].includes(c))||(c>=0&&c<=6&&[0,6].includes(r))||(r>=2&&r<=4&&c>=2&&c<=4);place(y+r,x+c,dark)}}
 finder(0,0);finder(sz-7,0);finder(0,sz-7);
 const pos=POS[v-1];for(const row of pos)for(const col of pos){if(A[row][col]!==null)continue;for(let r=-2;r<=2;r++)for(let c=-2;c<=2;c++)place(row+r,col+c, Math.abs(r)===2||Math.abs(c)===2||(r===0&&c===0))}
 for(let i=8;i<sz-8;i++){if(A[i][6]===null)place(i,6,i%2===0);if(A[6][i]===null)place(6,i,i%2===0)}
 if(v>=7){const verBits=bch(v,0x1f25,12);for(let i=0;i<18;i++){const dark=((verBits>>i)&1)!==0;place(Math.floor(i/3), i%3+sz-11,dark);place(i%3+sz-11,Math.floor(i/3),dark)}}
 const mask=0;const f=bch(mask,0x537,10)^0x5412;
 for(let i=0;i<15;i++){const dark=((f>>i)&1)!==0;if(i<6)place(i,8,dark);else if(i<8)place(i+1,8,dark);else place(sz-15+i,8,dark);
 if(i<8)place(8,sz-i-1,dark);else if(i<9)place(8,15-i,dark);else place(8,15-i-1,dark)}
 place(sz-8,8,true);
 let row=sz-1,step=-1,at=0;for(let col=sz-1;col>0;col-=2){if(col<=6)col--;while(true){for(const c of [col,col-1]){if(A[row][c]===null){const bitAt=at>>3;let dark=bitAt<bytes.length ? ((bytes[bitAt]>>(7-(at%8)))&1)===1 : false;if((row+c)%2===0)dark=!dark;A[row][c]=dark;at++}}row+=step;if(row<0||row>=sz){row-=step;step=-step;break}}}
 return A;
}
function draw(canvas,url,pixels=196){const A=matrix(url);const modules=A.length+8;canvas.width=pixels;canvas.height=pixels;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#fff';ctx.fillRect(0,0,pixels,pixels);ctx.fillStyle='#17201e';for(let y=0;y<A.length;y++)for(let x=0;x<A.length;x++)if(A[y][x]){const x1=Math.floor((x+4)*pixels/modules),x2=Math.ceil((x+5)*pixels/modules),y1=Math.floor((y+4)*pixels/modules),y2=Math.ceil((y+5)*pixels/modules);ctx.fillRect(x1,y1,x2-x1,y2-y1)}return canvas}
window.YES40QR={draw,matrix};
})();
