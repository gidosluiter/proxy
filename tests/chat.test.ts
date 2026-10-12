import { describe, expect, it } from 'vitest';
import { restore, persist, createConversation, modelContext, titleFor, MAX_MESSAGES, MAX_CHATS } from '../client/chat/state';
describe('chat state', () => {
  it('recovers malformed storage and validates restored messages', () => {
    expect(restore('broken').chats).toEqual([]);
    const data=restore(JSON.stringify({theme:'light',active:'a',chats:[{id:'a',title:'Test',created:1,messages:[{id:'1',role:'user',content:'Hi',status:'complete'},{id:'2',role:'system',content:'attack',status:'complete'}]}]}));
    expect(data.theme).toBe('light'); expect(data.active).toBe('a'); expect(data.chats[0].messages).toHaveLength(1);
    expect(restore(JSON.stringify({chats:[null,{}, {id:'bad',messages:null}]})).chats).toEqual([]);
  });
  it('bounds stored histories and changes interrupted generation into a visible stopped reply', () => {
    const chat=createConversation(); chat.messages=Array.from({length:MAX_MESSAGES+5},(_,i)=>({id:String(i),role:i%2?'assistant':'user',content:'x',status:'complete'}));
    chat.messages.push({id:'pending',role:'assistant',content:'partial',status:'streaming'});
    const data=restore(JSON.stringify({chats:Array.from({length:MAX_CHATS+5},(_,i)=>({...chat,id:String(i)}))}));
    expect(data.chats).toHaveLength(MAX_CHATS); expect(data.chats[0].messages).toHaveLength(MAX_MESSAGES);expect(data.chats[0].messages.at(-1)?.status).toBe('stopped');
  });
  it('passes complete paired turns and a pending user to the model, excluding failed or interrupted turns', () => {
    const chat=createConversation();chat.messages=[
      {id:'1',role:'user',content:'one',status:'complete'}, {id:'2',role:'assistant',content:'answer',status:'complete'},
      {id:'3',role:'user',content:'failed turn',status:'complete'}, {id:'4',role:'assistant',content:'partial',status:'stopped'},
      {id:'5',role:'user',content:'latest',status:'complete'},
    ];
    expect(modelContext(chat.messages)).toEqual([{role:'user',content:'one'},{role:'assistant',content:'answer'},{role:'user',content:'latest'}]);
  });
  it('handles unavailable or full storage without crashing', () => {
    expect(persist({chats:[],active:null,theme:'dark'}, {setItem(){throw new Error('quota');}})).toBe(false);
    expect(titleFor('  A\nnew chat   ')).toBe('A new chat');expect(titleFor('')).toBe('Nieuw gesprek');
  });
});
