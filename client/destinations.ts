import { siSnapchat,siWhatsapp,siTiktok,siInstagram,siYoutube,siDiscord,siReddit,siX,siTwitch,siSpotify } from 'simple-icons';
export type Destination = {id:string;name:string;url:string;color:string;icon?:string;description?:string};
export const APPROVED=['example.com','info.cern.ch','www.w3.org','w3.org','www.wikipedia.org','en.wikipedia.org','upload.wikimedia.org','developer.mozilla.org','github.com','raw.githubusercontent.com'];
export const SOCIALS:Destination[]=[
 ['snapchat','Snapchat','https://web.snapchat.com/',siSnapchat,'#ffeb3b'],['whatsapp','WhatsApp','https://web.whatsapp.com/',siWhatsapp,'#25d366'],['tiktok','TikTok','https://www.tiktok.com/',siTiktok,'#f2f4f8'],['instagram','Instagram','https://www.instagram.com/',siInstagram,'#fa6c99'],['youtube','YouTube','https://www.youtube.com/',siYoutube,'#ff4545'],['discord','Discord','https://discord.com/app',siDiscord,'#858eff'],['reddit','Reddit','https://www.reddit.com/',siReddit,'#ff683d'],['x','X','https://x.com/',siX,'#f2f4f8'],['twitch','Twitch','https://www.twitch.tv/',siTwitch,'#af80ff'],['spotify','Spotify','https://open.spotify.com/',siSpotify,'#1ed760'],
].map(([id,name,url,icon,color])=>({id:id as string,name:name as string,url:url as string,icon:(icon as typeof siSnapchat).path,color:color as string,description:'Interactive app · direct access'}));
export const READING:Destination[]=[
 {id:'example',name:'Example Domain',url:'https://example.com/',color:'#aa93ff',description:'A simple page to try the proxy'},
 {id:'cern',name:'The first website',url:'http://info.cern.ch/hypertext/WWW/TheProject.html',color:'#69c8c0',description:'Where the web began'},
 {id:'wikipedia',name:'Wikipedia',url:'https://en.wikipedia.org/wiki/Main_Page',color:'#b9c4da',description:'Explore public articles'},
 {id:'mdn',name:'MDN Web Docs',url:'https://developer.mozilla.org/en-US/docs/Web',color:'#ffb86c',description:'Read web development guides'},
 {id:'w3c',name:'W3C',url:'https://www.w3.org/',color:'#66aaff',description:'Web standards and public resources'},
];
export function classify(input:string):{url:string;mode:'proxy'|'direct'|'search'} {
 const text=input.trim();if(!text || text.length>2048)throw new Error('Enter a URL or a search of at most 2048 characters.');
 const explicit=/^[a-z][a-z\d+.-]*:/i.test(text);
 const looksURL=explicit || /^(?:localhost|(?:[\w-]+\.)+[\w-]+)(?::\d+)?(?:[/?#]|$)/i.test(text);
 if(!looksURL)return {url:`https://duckduckgo.com/?q=${encodeURIComponent(text)}`,mode:'search'};
 let url:URL;try{url=new URL(explicit?text:`https://${text}`);}catch{throw new Error('Enter a valid HTTP or HTTPS URL.');}
 if(!['http:','https:'].includes(url.protocol) || url.username || url.password)throw new Error('Only HTTP or HTTPS URLs without credentials are supported.');
 const sensitive=/(?:^|\/)(?:login|logout|signin|signup|sign-in|auth|oauth|account|session)(?:\/|$)/i.test(url.pathname) || [...url.searchParams.keys()].some(k=>/password|token|secret|session|auth|code|key/i.test(k));
 return {url:url.href,mode:APPROVED.includes(url.hostname) && !url.port && !sensitive?'proxy':'direct'};
}
