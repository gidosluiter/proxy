export type ChatMessage={id:string;role:'user'|'assistant';content:string;status:'complete'|'streaming'|'stopped'|'error'};
export type Conversation={id:string;title:string;created:number;messages:ChatMessage[]};
export type ChatState={chats:Conversation[];active:string|null;theme:'dark'|'light'};
export type ModelMessage={role:'user'|'assistant';content:string};
export const STORAGE_KEY='flowchat.v1';
export const MAX_CHATS=20,MAX_MESSAGES=60,MAX_PROMPT=2000;
export const titleFor=(text:string)=>text.replace(/\s+/g,' ').trim().slice(0,55)||'Nieuw gesprek';
export const createConversation=():Conversation=>({id:crypto.randomUUID(),title:'Nieuw gesprek',created:Date.now(),messages:[]});
export function restore(raw:string|null):ChatState{
 const empty:ChatState={chats:[],active:null,theme:'dark'};
 try{
  const value=JSON.parse(raw||'null');if(!value||typeof value!=='object')return empty;
  const chats:Conversation[]=[];
  if(Array.isArray(value.chats))for(const chat of value.chats){
   if(!chat||typeof chat.id!=='string'||chat.id.length>100||!Array.isArray(chat.messages)||chats.some(c=>c.id===chat.id))continue;
   const messages:ChatMessage[]=chat.messages.filter((m:unknown):m is ChatMessage=>!!m&&typeof m==='object'&&typeof (m as ChatMessage).id==='string'&&['user','assistant'].includes((m as ChatMessage).role)&&typeof (m as ChatMessage).content==='string').slice(-MAX_MESSAGES).map((m:ChatMessage)=>({id:m.id.slice(0,100),role:m.role,content:m.content.slice(0,4000),status:m.role==='user'?'complete':m.status==='streaming'?'stopped':['complete','stopped','error'].includes(m.status)?m.status:'error'}));
   chats.push({id:chat.id,title:titleFor(typeof chat.title==='string'?chat.title:''),created:Number.isFinite(chat.created)?chat.created:Date.now(),messages});
   if(chats.length===MAX_CHATS)break;
  }
  return{chats,active:chats.some(c=>c.id===value.active)?value.active:chats[0]?.id||null,theme:value.theme==='light'?'light':'dark'};
 }catch{return empty;}
}
export function persist(state:ChatState,storage:Pick<Storage,'setItem'>):boolean{
 try{storage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}catch{return false;}
}
export function modelContext(messages:ChatMessage[]):ModelMessage[]{
 const turns:ModelMessage[][]=[];
 for(let i=0;i<messages.length;i++){
  const user=messages[i],reply=messages[i+1];if(user.role!=='user')continue;
  if(reply?.role==='assistant'&&reply.status==='complete'&&reply.content.trim())turns.push([{role:'user',content:user.content},{role:'assistant',content:reply.content}]);
 }
 const last=messages.at(-1);const result:ModelMessage[]=last?.role==='user'?[{role:'user',content:last.content.slice(0,MAX_PROMPT)}]:[];
 let budget=3800-result.reduce((sum,m)=>sum+m.content.length,0);
 for(const turn of turns.reverse()){const size=turn.reduce((sum,m)=>sum+m.content.length,0);if(size>budget)break;result.unshift(...turn);budget-=size;}
 return result;
}
