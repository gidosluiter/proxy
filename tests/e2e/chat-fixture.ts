import type { Page } from "@playwright/test";
// Deterministic worker fixture only for UI behavior; real inference is a separate check.
export async function fixtureModel(page: Page, failFirst = false) {
  let count = 0;
  await page.route("**/assets/model.worker-*.js", (route) => {
    const fail = failFirst && count++ === 0;
    return route.fulfill({
      contentType: "text/javascript",
      body: `
  self.onmessage=({data})=>{const {id,type,messages}=data;
   self.postMessage({type:'progress',id,text:'Model downloaden',progress:42});
   setTimeout(()=>{
    if(${fail}){self.postMessage({type:'error',id,text:'Fixture network error'});return;}
    self.postMessage({type:'ready',id});if(type==='load')return;
    const slow=messages.at(-1)?.content.includes('STOP');
    setTimeout(()=>{self.postMessage({type:'token',id,text:'Een helder antwoord. **Vier**.\\n\\n[unsafe](javascript:alert(1))\\n\\n![remote](https://example.com/private.png)\\n\\n<img src=x onerror="window.hacked=true">'});self.postMessage({type:'done',id});},slow?3000:120);
   },80);
  };`,
    });
  });
}
export async function showSidebar(page: Page) {
  const button = page.getByRole("button", { name: "Menu openen", exact: true });
  if (await button.isVisible()) await button.click();
}
