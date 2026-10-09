import { Readable, Transform } from 'node:stream';
import { validateDestination, validateURL, ProxyError, type Resolver } from './policy';
import { createTransport } from './transport';
import { rewriteHTML, rewriteCSS } from './rewrite';
export type Transport = (url: URL, options: {address?: string; family?: number; signal: AbortSignal}) => Promise<Response>;
export type Engine = ReturnType<typeof createEngine>;
export function createEngine(options: {resolve?: Resolver; transport?: Transport; maxBytes?: number; timeoutMs?: number} = {}) {
  const network = options.transport ? null : createTransport();
  const transport = options.transport || network!.transport;
  const maxBytes = options.maxBytes || 3 * 1024 * 1024;
  const cache = new Map<string,{body:Buffer;type:string;expires:number}>();
  let cacheBytes = 0;
  let active = 0;
  async function upstream(raw: string) {
    if (active >= 24) throw new ProxyError('The proxy is busy. Try again shortly.',503);
    active++;
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),options.timeoutMs || 15000);
    let released = false;
    const release = () => { if (!released) {released=true;clearTimeout(timer);active--;} };
    try {
      let target = raw;
      for (let hop=0;hop<=5;hop++) {
        const destination = network?.trustedProxy && !options.resolve ? {url:validateURL(target)} : await validateDestination(target,options.resolve);
        const res = await transport(destination.url,{...destination,signal:controller.signal});
        if ([301,302,303,307,308].includes(res.status)) {
          await res.body?.cancel();
          const location = res.headers.get('location');
          if (!location || hop===5) throw new ProxyError('The website redirected too many times. Open it directly.');
          target = new URL(location,destination.url).href;
          continue;
        }
        if (!res.ok) { await res.body?.cancel();throw new ProxyError(`The website returned HTTP ${res.status}. It may require direct access.`, res.status===403 || res.status===429 ? 502 : 502); }
        if (Number(res.headers.get('content-length') || 0) > maxBytes) {await res.body?.cancel();throw new ProxyError('This response is too large for safe proxy browsing.',413);}
        return {res,url:destination.url.href,release};
      }
      throw new ProxyError('Redirect limit exceeded.');
    } catch (error) {
      release();
      if (error instanceof ProxyError) throw error;
      throw new ProxyError(controller.signal.aborted ? 'The website took too long to respond. Try again or open it directly.' : 'The website could not be reached. Check egress access or open it directly.');
    }
  }
  async function collect(res: Response) {
    if (!res.body) return Buffer.alloc(0);
    const reader = res.body.getReader(); const chunks:Uint8Array[]=[];let size=0;
    try {
      for (;;) { const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes){await reader.cancel();throw new ProxyError('This response is too large for safe proxy browsing.',413);}chunks.push(value); }
      return Buffer.concat(chunks);
    } finally { reader.releaseLock(); }
  }
  const typeOf = (res:Response)=>(res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  async function browse(raw: string) {
    const {res,url,release}=await upstream(raw);
    try {
      const type=typeOf(res);
      if (!['text/html','application/xhtml+xml','text/plain'].includes(type)) {await res.body?.cancel();throw new ProxyError('This destination is a file or an unsupported app. Open it directly.',415);}
      const body=await collect(res);
      const charset=res.headers.get('content-type')?.match(/charset=["']?([^;"' ]+)/i)?.[1] || 'utf-8';
      let text:string;
      try{text=new TextDecoder(charset).decode(body);}catch{text=body.toString('utf8');}
      if(type==='text/plain') text=`<pre>${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`;
      return {url,...rewriteHTML(text,url)};
    } finally {release();}
  }
  async function resource(raw: string) {
    const key=validateURL(raw).href;
    const hit=cache.get(key);
    if(hit && hit.expires>Date.now()) return {body:hit.body,type:hit.type,cached:true};
    if(hit){cache.delete(key);cacheBytes-=hit.body.length;}
    const {res,url,release}=await upstream(raw);
    try {
      const type=typeOf(res);
      if (!(type==='text/css' || /^image\/(?:png|jpeg|gif|webp|avif|svg\+xml|x-icon|vnd.microsoft.icon)$/.test(type) || /^font\/(?:woff2?|ttf|otf)$/.test(type) || type==='application/font-woff')) {await res.body?.cancel();throw new ProxyError('Only stylesheets, images and fonts may be loaded as assets.',415);}
      const canCache = !new URL(url).search && /(?:^|,)\s*public\b/i.test(res.headers.get('cache-control') || '') && !/private|no-store|no-cache/i.test(res.headers.get('cache-control') || '') && !res.headers.has('set-cookie') && !res.headers.has('vary');
      if(type==='text/css' || canCache) {
        const original=await collect(res);const body=type==='text/css'?Buffer.from(rewriteCSS(original.toString('utf8'),url)):original;
        if(canCache && body.length<=256*1024) {
          while(cache.size>=64 || cacheBytes+body.length>8*1024*1024){const [k,v]=cache.entries().next().value!;cache.delete(k);cacheBytes-=v.body.length;}
          const age=Math.min(300,Number(res.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] || 60));
          cache.set(key,{body,type,expires:Date.now()+age*1000});cacheBytes+=body.length;
        }
        release(); return {body,type,cached:false};
      }
      let size=0;
      const limit=new Transform({transform(chunk,_,cb){size+=chunk.length;cb(size>maxBytes?new ProxyError('Asset size limit exceeded.',413):null,chunk);}});
      const source=Readable.fromWeb(res.body as never);
      source.on('error',e=>limit.destroy(e));limit.on('close',()=>{source.destroy();release();});
      source.pipe(limit);
      return {body:limit,type,cached:false};
    }catch(e){release();throw e;}
  }
  return {browse,resource,cacheSize:()=>cache.size,close:async()=>{await network?.close();},trustedProxy:!!network?.trustedProxy};
}
