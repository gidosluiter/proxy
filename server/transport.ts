import { fetch as undiciFetch, Pool, ProxyAgent, type Dispatcher } from 'undici';
import type { Transport } from './proxy';
import { ProxyError } from './policy';

// Proxy mode is opt-in: only a trusted, administrator-controlled egress gateway
// may perform the final DNS validation/connect. Never accept a proxy from a request.
export function createTransport(): {transport: Transport; trustedProxy: boolean; close: () => Promise<void>} {
  const proxyURL = process.env.FLOWPROXY_TRUST_EGRESS === '1' ? (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) : undefined;
  const gateway = proxyURL ? new ProxyAgent(proxyURL) : undefined;
  const pools = new Map<string, Pool>();
  const transport: Transport = async (url, {address, family, signal}) => {
    let dispatcher: Dispatcher;
    if (gateway) dispatcher = gateway;
    else {
      if (!address || !family) throw new ProxyError('A validated public address is required.',403);
      const key = `${url.origin}/${address}`;
      let pool = pools.get(key);
      if (!pool) {
        if (pools.size >= 24) { const [oldKey, old] = pools.entries().next().value!; pools.delete(oldKey); void old.close(); }
        pool = new Pool(url.origin, {connections:4,connect:{timeout:8000,lookup:(_hostname, options, callback)=>{
          if (options.all) callback(null, [{address, family}] as never); else callback(null,address,family);
        }}});
        pools.set(key,pool);
      }
      dispatcher = pool;
    }
    const res = await undiciFetch(url, {dispatcher, signal, redirect:'manual',headers:{'user-agent':'FlowProxy/1.0 (public reading proxy; no authentication)','accept':'text/html,text/css,image/*,font/*;q=0.9,*/*;q=0.5'}});
    return res as unknown as Response;
  };
  return {transport,trustedProxy:!!gateway,close:async()=>{await Promise.all([...pools.values()].map(p=>p.close()));await gateway?.close();}};
}
