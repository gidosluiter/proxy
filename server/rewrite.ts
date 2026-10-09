import * as cheerio from 'cheerio';
import sanitizeHtml from 'sanitize-html';
import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import { validateURL } from './policy';

const assetURL = (raw: string, base: string): string | undefined => {
  try { const url = new URL(raw, base); validateURL(url.href); return `/api/resource?url=${encodeURIComponent(url.href)}`; } catch { return undefined; }
};
export function rewriteCSS(input: string, base: string) {
  try {
    const root = postcss.parse(input);
    root.walkAtRules(rule => { if (!['media', 'supports', 'font-face', 'keyframes', '-webkit-keyframes', 'layer', 'container'].includes(rule.name)) rule.remove(); });
    root.walkRules(rule => {
      if (/:host|::slotted|::part|\\/i.test(rule.selector)) { rule.remove(); return; }
      rule.selector = rule.selector.replace(/\b(?:html|body|:root)\b/g, '.fp-document');
    });
    root.walkDecls(decl => {
      if (['behavior', '-moz-binding'].includes(decl.prop.toLowerCase()) || /expression|javascript|[\\\u0000-\u001f]/i.test(decl.value) || (decl.prop.toLowerCase() === 'position' && /fixed|sticky/i.test(decl.value))) { decl.remove(); return; }
      const parsed = valueParser(decl.value);
      let rejected = false;
      parsed.walk(node => {
        if (node.type === 'function' && node.value.toLowerCase() === 'url') {
          const raw = valueParser.stringify(node.nodes).replace(/^['"]|['"]$/g, '');
          const href = assetURL(raw, base);
          if (!href) { rejected = true; return false; }
          node.nodes = [{type:'string',quote:'"',value:href,sourceIndex:0,sourceEndIndex:href.length}];
        }
      });
      if (rejected) decl.remove(); else decl.value = parsed.toString();
    });
    return root.toString();
  } catch { return ''; }
}
export function rewriteHTML(input: string, currentURL: string) {
  const $ = cheerio.load(input);
  const title = $('title').first().text().trim().slice(0, 120) || new URL(currentURL).hostname;
  let base = currentURL;
  try { base = validateURL(new URL($('base').attr('href') || '', currentURL).href).href; } catch { /* ignore unapproved base */ }
  $('script,iframe,frame,frameset,object,embed,form,input,button,textarea,select,meta,base,noscript,svg,math,template').remove();
  $('style').each((_, el) => { $(el).text(rewriteCSS($(el).text(), base)); });
  $('*').each((_, el) => {
    const node = $(el);
    if (node.attr('style')) node.attr('style', rewriteCSS(`p{${node.attr('style')}}`, base).replace(/^p\s*\{|\}$/g, ''));
    for (const attr of ['src','poster']) {
      const raw = node.attr(attr);
      if (raw) { const href = assetURL(raw, base); if (href) node.attr(attr, href); else node.removeAttr(attr); }
    }
    node.removeAttr('srcset');
    if (el.type === 'tag' && el.name === 'a') {
      const href = node.attr('href');
      if (href?.startsWith('#')) return;
      try {
        const target = new URL(href || '', base);
        if (!['https:', 'http:'].includes(target.protocol) || target.username || target.password) { node.removeAttr('href'); return; }
        try { validateURL(target.href); node.attr('href', `/browse?url=${encodeURIComponent(target.href)}`); }
        catch { node.attr('href', target.href); node.attr('data-direct', 'true'); node.attr('title','Opens on the official website (direct access)'); }
        node.attr('rel', 'noopener noreferrer');
      } catch { node.removeAttr('href'); }
    }
    if (el.type === 'tag' && el.name === 'link') {
      const href = node.attr('rel') === 'stylesheet' ? assetURL(node.attr('href') || '', base) : undefined;
      if (href) { node.attr('href', href); node.removeAttr('integrity'); node.removeAttr('crossorigin'); } else node.remove();
    }
    if (el.type === 'tag' && el.name === 'img') node.attr('loading','lazy');
  });
  const content = `${$('head').find('style,link[rel="stylesheet"]').toString()}<div class="fp-document">${$('body').html() || ''}</div>`;
  const html = sanitizeHtml(content, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img','picture','source','style','link','details','summary','video','audio'],
    allowedAttributes: {'*':['id','class','title','lang','dir','aria-label','style'],a:['href','rel','data-direct'],img:['src','alt','width','height','loading'],link:['href','rel','media'],source:['src','type','media'],video:['src','poster','controls'],audio:['src','controls']},
    allowedSchemes: ['http','https'], allowProtocolRelative:false, allowVulnerableTags:true, parseStyleAttributes:false,
    disallowedTagsMode:'discard', enforceHtmlBoundary:true,
  });
  return { title, html };
}
