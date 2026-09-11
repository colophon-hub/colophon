const MAX_SOURCE_BYTES = 1_000_000
const MAX_TEXT = 1200

export async function ensureWebmentionTables(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS webmentions (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    target TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'pending',
    author_name TEXT NOT NULL DEFAULT '',
    author_url TEXT NOT NULL DEFAULT '',
    content_text TEXT NOT NULL DEFAULT '',
    source_title TEXT NOT NULL DEFAULT '',
    source_published TEXT NOT NULL DEFAULT '',
    verified_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source, target)
  )`).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_webmentions_target_state ON webmentions(target, state)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_webmentions_state ON webmentions(state)').run()
  await db.prepare(`CREATE TABLE IF NOT EXISTS webmention_outbound (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    target TEXT NOT NULL,
    endpoint TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    http_status INTEGER NOT NULL DEFAULT 0,
    error TEXT NOT NULL DEFAULT '',
    attempted_at TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source, target)
  )`).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_webmention_outbound_status ON webmention_outbound(status)').run()
}

export function normalizeWebmentionUrl(value) { const url = new URL(String(value || '')); url.hash = ''; return url.toString() }
export function assertSafeRemoteUrl(value) {
  let url; try { url = new URL(String(value || '')) } catch { throw new Error('source must be an absolute URL') }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('source URL must use http or https')
  if (url.username || url.password) throw new Error('source URL credentials are not allowed')
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host === '0.0.0.0' || host === '::1' || host.startsWith('127.') || host.startsWith('10.') || host.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || /^169\.254\./.test(host) || /^f[cd][0-9a-f]{0,2}:/i.test(host) || /^fe8[0-9a-f]:/i.test(host)) throw new Error('private or local source addresses are not allowed')
  return url
}
export function validateLocalTarget(context, value) { let target; try { target = new URL(String(value || ''), context.request.url) } catch { throw new Error('target URL is invalid') }; const site = new URL(context.request.url); if (target.origin !== site.origin) throw new Error('target does not belong to this publication'); if (target.pathname.startsWith('/api/')) throw new Error('API endpoints cannot receive mentions as publication targets'); target.hash = ''; return target }

export async function verifyIncomingWebmention(context, sourceValue, targetValue) {
  const source = assertSafeRemoteUrl(sourceValue); const target = validateLocalTarget(context, targetValue)
  if (source.origin === target.origin && source.pathname === target.pathname) throw new Error('source and target must be different')
  const fetched = await safeFetchHtml(source); if (!htmlLinksToTarget(fetched.html, fetched.url, target.toString())) throw new Error('source does not link to target')
  return { source: normalizeWebmentionUrl(fetched.url), target: normalizeWebmentionUrl(target), ...extractMentionMetadata(fetched.html, fetched.url) }
}
export async function upsertVerifiedWebmention(db, mention, { preserveState = true } = {}) {
  await ensureWebmentionTables(db); const existing = await db.prepare('SELECT id, state FROM webmentions WHERE source = ? AND target = ? LIMIT 1').bind(mention.source, mention.target).first(); const id = String(existing?.id || `wm-${crypto.randomUUID?.() || randomId()}`); const state = preserveState && existing?.state ? existing.state : 'pending'; const now = new Date().toISOString()
  await db.prepare(`INSERT INTO webmentions (id, source, target, state, author_name, author_url, content_text, source_title, source_published, verified_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source, target) DO UPDATE SET author_name=excluded.author_name, author_url=excluded.author_url, content_text=excluded.content_text, source_title=excluded.source_title, source_published=excluded.source_published, verified_at=excluded.verified_at, updated_at=excluded.updated_at`)
    .bind(id, mention.source, mention.target, state, mention.authorName || '', mention.authorUrl || '', mention.contentText || '', mention.sourceTitle || '', mention.sourcePublished || '', now, now, now).run()
  return getWebmention(db, id)
}
export async function getWebmention(db, id) { await ensureWebmentionTables(db); const row = await db.prepare('SELECT * FROM webmentions WHERE id = ? LIMIT 1').bind(String(id)).first(); return row ? publicMention(row) : null }
export async function listWebmentions(db, { target = '', state = '', limit = 100 } = {}) { await ensureWebmentionTables(db); const clauses=[]; const binds=[]; if(target){clauses.push('target = ?');binds.push(normalizeWebmentionUrl(target))} if(state){clauses.push('state = ?');binds.push(normalizeState(state))} const where=clauses.length?`WHERE ${clauses.join(' AND ')}`:''; const bounded=Math.min(200,Math.max(1,Number(limit)||100)); const stmt=db.prepare(`SELECT * FROM webmentions ${where} ORDER BY datetime(updated_at) DESC LIMIT ${bounded}`); const result=binds.length?await stmt.bind(...binds).all():await stmt.all(); return (result?.results||[]).map(publicMention) }
export async function listApprovedMentions(db, target) { return listWebmentions(db, { target, state: 'approved', limit: 100 }) }
export async function setWebmentionState(db, id, state) { await ensureWebmentionTables(db); await db.prepare('UPDATE webmentions SET state = ?, updated_at = ? WHERE id = ?').bind(normalizeState(state), new Date().toISOString(), String(id)).run(); return getWebmention(db,id) }
export async function deleteWebmention(db,id){await ensureWebmentionTables(db);await db.prepare('DELETE FROM webmentions WHERE id = ?').bind(String(id)).run()}
export async function reverifyWebmention(context,db,id){const current=await getWebmention(db,id);if(!current)throw new Error('Webmention not found');try{return await upsertVerifiedWebmention(db,await verifyIncomingWebmention(context,current.source,current.target),{preserveState:true})}catch(error){await setWebmentionState(db,id,'rejected');throw error}}

export async function safeFetchHtml(urlValue,maxRedirects=3){let url=assertSafeRemoteUrl(urlValue);for(let redirect=0;redirect<=maxRedirects;redirect+=1){const response=await fetch(url.toString(),{method:'GET',redirect:'manual',headers:{accept:'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1','user-agent':'Colophon-Webmention/1.0'}});if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');if(!location)throw new Error('source redirect is missing Location');url=assertSafeRemoteUrl(new URL(location,url).toString());continue}if(!response.ok)throw new Error(`source fetch failed with HTTP ${response.status}`);const contentType=String(response.headers.get('content-type')||'').toLowerCase();if(!contentType.includes('text/html')&&!contentType.includes('application/xhtml+xml'))throw new Error('source is not HTML');const declaredLength=Number(response.headers.get('content-length')||0);if(declaredLength>MAX_SOURCE_BYTES)throw new Error('source document is too large');const html=await response.text();if(new TextEncoder().encode(html).length>MAX_SOURCE_BYTES)throw new Error('source document is too large');return{url:url.toString(),html,headers:response.headers}}throw new Error('too many source redirects')}
export function htmlLinksToTarget(html,sourceUrl,targetUrl){const normalizedTarget=normalizeComparableUrl(targetUrl);const regex=/<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>/gi;let match;while((match=regex.exec(String(html||'')))){const raw=decodeEntities(match[1]||match[2]||match[3]||'');try{if(normalizeComparableUrl(new URL(raw,sourceUrl).toString())===normalizedTarget)return true}catch{}}return false}
export function extractMentionMetadata(html,sourceUrl){const sourceTitle=cleanText(firstMatch(html,/<title\b[^>]*>([\s\S]*?)<\/title>/i)||firstMatch(html,/class\s*=\s*["'][^"']*\bp-name\b[^"']*["'][^>]*>([\s\S]*?)<\//i),240);const authorName=cleanText(firstMatch(html,/class\s*=\s*["'][^"']*\bp-author\b[^"']*["'][^>]*>([\s\S]*?)<\//i)||firstMatch(html,/rel\s*=\s*["'][^"']*\bauthor\b[^"']*["'][^>]*>([\s\S]*?)<\/a>/i),160);const published=cleanText(firstMatch(html,/class\s*=\s*["'][^"']*\bdt-published\b[^"']*["'][^>]*datetime\s*=\s*["']([^"']+)["']/i),80);const content=firstMatch(html,/class\s*=\s*["'][^"']*\be-content\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:article|div|section)>/i)||firstMatch(html,/<meta\s+name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']*)["']/i)||firstMatch(html,/<p\b[^>]*>([\s\S]*?)<\/p>/i);return{authorName,authorUrl:'',contentText:cleanText(content,MAX_TEXT),sourceTitle,sourcePublished:published,sourceUrl:String(sourceUrl||'')}}
export function publicMention(row){return{id:String(row.id||''),source:String(row.source||''),target:String(row.target||''),state:normalizeState(row.state),authorName:cleanText(row.author_name,160),authorUrl:safePublicUrl(row.author_url),contentText:cleanText(row.content_text,MAX_TEXT),sourceTitle:cleanText(row.source_title,240),sourcePublished:cleanText(row.source_published,80),verifiedAt:String(row.verified_at||''),createdAt:String(row.created_at||''),updatedAt:String(row.updated_at||'')}}
function normalizeState(value){const state=String(value||'').toLowerCase();return['pending','approved','rejected','spam'].includes(state)?state:'pending'}
function normalizeComparableUrl(value){const url=new URL(String(value||''));url.hash='';if((url.protocol==='https:'&&url.port==='443')||(url.protocol==='http:'&&url.port==='80'))url.port='';return url.toString().replace(/\/$/,'')}
function firstMatch(value,regex){const match=String(value||'').match(regex);return match?.[1]||''}
function cleanText(value,max){return decodeEntities(String(value||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim().slice(0,max)}
function decodeEntities(value){return String(value||'').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&#x27;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')}
function safePublicUrl(value){try{const url=new URL(String(value||''));return['http:','https:'].includes(url.protocol)?url.toString():''}catch{return''}}
function randomId(){const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);return Array.from(bytes,(byte)=>byte.toString(16).padStart(2,'0')).join('')}
