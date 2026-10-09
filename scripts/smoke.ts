const base=process.env.FLOWPROXY_SMOKE_BASE || 'http://127.0.0.1:3000';
const targets=['https://example.com/','http://info.cern.ch/hypertext/WWW/TheProject.html','https://www.w3.org/','https://en.wikipedia.org/wiki/Main_Page','https://developer.mozilla.org/en-US/docs/Web','https://github.com/','https://raw.githubusercontent.com/github/markup/master/README.md'];
const results=await Promise.all(targets.map(async url=>{
 const r=await fetch(`${base}/api/browse?url=${encodeURIComponent(url)}`,{signal:AbortSignal.timeout(25000)});
 const p=await r.json();return {url,status:r.status,title:p.title,bytes:p.html?.length,error:p.error};
}));
console.log(JSON.stringify(results,null,2));
if(!results.some(r=>r.status===200 && r.bytes>0))process.exitCode=1;
