import { expect,it } from 'vitest';
import { rewriteHTML,rewriteCSS } from '../server/rewrite';
it('rewrites navigation and assets relative to a base URL',()=>{
 const p=rewriteHTML('<title>Example</title><base href="/docs/"><a href="next">Next</a><img src="img.png"><link rel="stylesheet" href="style.css">','https://example.com/page');
 expect(p.title).toBe('Example');expect(p.html).toContain('/browse?url=https%3A%2F%2Fexample.com%2Fdocs%2Fnext');expect(p.html).toContain('/api/resource?url=https%3A%2F%2Fexample.com%2Fdocs%2Fimg.png');
});
it('removes scripts, forms, handlers, dangerous links and embedding',()=>{
 const p=rewriteHTML('<script>alert(1)</script><iframe src="https://evil.test"></iframe><form action="/login"><input type="password"></form><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">bad</a><div style="position:fixed">Hi</div>','https://example.com/');
 expect(p.html).not.toMatch(/<script|<iframe|<form|<input|onerror|javascript:|position:fixed/);expect(p.html).toContain('Hi');
});
it('marks unsupported destinations as direct and prevents unsafe base URLs',()=>{
 const p=rewriteHTML('<base href="https://evil.test/"><a href="https://web.whatsapp.com">Chat</a><img src="https://evil.test/x">','https://example.com/');expect(p.html).toContain('data-direct="true"');expect(p.html).not.toContain('src="https://evil.test');
});
it('rewrites CSS URLs and removes imports/host selectors',()=>{
 const css=rewriteCSS('body {background:url(../a.png)} @import "https://evil.test/x.css"; :host {position:fixed} p {color:red}','https://example.com/css/main.css');expect(css).toContain('/api/resource?url=https%3A%2F%2Fexample.com%2Fa.png');expect(css).not.toMatch(/evil.test|:host|@import/);expect(css).toContain('color:red');
});
