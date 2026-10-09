import { expect,it } from 'vitest';
import { classify, SOCIALS } from '../client/destinations';
it('recognizes URLs, public reading sites and ordinary searches',()=>{
 expect(classify('example.com').mode).toBe('proxy');expect(classify('https://example.com/docs').url).toBe('https://example.com/docs');expect(classify('a nice search').mode).toBe('search');expect(classify('a nice search').url).toContain('duckduckgo.com/?q=a%20nice%20search');
});
it('social shortcuts use official direct destinations',()=>{expect(SOCIALS).toHaveLength(10);for(const s of SOCIALS){expect(s.url).toMatch(/^https:\/\//);expect(classify(s.url).mode).toBe('direct');}});
it('rejects non-web URLs, empty inputs and credentials',()=>{for(const s of ['javascript:alert(1)','file:///etc/passwd','https://user:pass@example.com',''])expect(()=>classify(s)).toThrow();});
