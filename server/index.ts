import { createApp } from './app';
import { createEngine } from './proxy';
const engine=createEngine();
const port=Number(process.env.PORT || 3000);
const server=createApp(engine).listen(port,process.env.HOST || '0.0.0.0',()=>console.log(`FlowProxy listening on port ${port} (${engine.trustedProxy?'trusted egress':'pinned public DNS'})`));
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{server.close(()=>{void engine.close().finally(()=>process.exit(0));});setTimeout(()=>process.exit(0),5000).unref();});
