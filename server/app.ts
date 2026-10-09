import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createEngine, type Engine } from './proxy';
import { ALLOWED_DOMAINS, ProxyError } from './policy';
export function createApp(engine:Engine=createEngine()) {
  const app=express();app.disable('x-powered-by');
  app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'","data:"],fontSrc:["'self'"],connectSrc:["'self'"],frameSrc:["'none'"],objectSrc:["'none'"],baseUri:["'none'"],formAction:["'none'"],upgradeInsecureRequests:null}},referrerPolicy:{policy:'no-referrer'}}));
  app.use(compression());
  app.get('/api/health',(_,res)=>res.json({ok:true,mode:'public-reading',egress:engine.trustedProxy?'trusted-gateway':'pinned-dns'}));
  app.get('/api/config',(_,res)=>res.json({allowedDomains:ALLOWED_DOMAINS,readOnly:true}));
  app.use('/api',rateLimit({windowMs:60000,limit:150,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Too many requests. Wait a minute and try again.'}}));
  app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');if(!['GET','HEAD'].includes(req.method)){res.status(405).json({error:'This is a read-only proxy. Forms and uploads use direct access.'});return;}if(req.originalUrl.length>4096){res.status(414).json({error:'The request URL is too long.'});return;}next();});
  const input=(req:express.Request)=>{if(typeof req.query.url!=='string')throw new ProxyError('Supply one public destination URL.',400);return req.query.url;};
  app.get('/api/browse',async(req,res,next)=>{try{res.json(await engine.browse(input(req)));}catch(e){next(e);}});
  app.get('/api/resource',async(req,res,next)=>{try{
    const asset=await engine.resource(input(req));res.set({'Content-Type':asset.type,'Content-Security-Policy':"sandbox; default-src 'none'; style-src 'unsafe-inline'",'X-Content-Type-Options':'nosniff'});
    if(Buffer.isBuffer(asset.body))res.send(asset.body);else await pipeline(asset.body,res);
  }catch(e){if(!res.headersSent)next(e);else res.destroy();}});
  app.use('/api',(_,res)=>res.status(404).json({error:'API route not found.'}));
  const client=resolve(process.cwd(),'dist/client');
  if(existsSync(client)){app.use(express.static(client,{index:false,maxAge:'1h'}));app.get(['/', '/browse', '/settings', '/favorites', '/recent'],(_,res)=>res.sendFile(resolve(client,'index.html')));}
  app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
    res.status(error instanceof ProxyError?error.status:502).json({error:error instanceof ProxyError?error.message:'The website could not be loaded safely. Try direct access.'});
  });
  return app;
}
