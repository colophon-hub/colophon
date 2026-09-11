import { normalizeCodeLanguage } from './codeHighlight.js'

function escapeHtml(value) { return String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;') }
function escapeAttr(value) { return escapeHtml(value).replaceAll('"', '&quot;') }
function safeUrl(value, { image = false } = {}) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (!image && (raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:'))) return raw
  if (raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('..')) return raw
  try {
    const parsed = new URL(raw)
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    return parsed.toString()
  } catch { return '' }
}
function inlineMarkdown(value) {
  const tokens = []
  const stash = (html) => {
    const marker = `\uE200${String.fromCharCode(0xE300 + tokens.length)}\uE201`
    tokens.push({ marker, html })
    return marker
  }

  let source = String(value || '')
  source = source.replace(/`([^`\n]+)`/g, (_, code) => stash(`<code>${escapeHtml(code)}</code>`))
  source = source.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, alt, url, title) => {
    const safe = safeUrl(url, { image: true })
    if (!safe) return alt
    return stash(`<img src="${escapeAttr(safe)}" alt="${escapeAttr(alt)}"${title ? ` title="${escapeAttr(title)}"` : ''} loading="lazy" />`)
  })
  source = source.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, label, url, title) => {
    const safe = safeUrl(url)
    if (!safe) return label
    const external = /^https?:\/\//i.test(safe)
    return stash(`<a href="${escapeAttr(safe)}"${title ? ` title="${escapeAttr(title)}"` : ''}${external ? ' rel="noopener noreferrer" target="_blank"' : ''}>${escapeHtml(label)}</a>`)
  })

  let html = escapeHtml(source)
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>')

  for (const token of tokens) html = html.replaceAll(token.marker, token.html)
  return html
}

export function markdownToSafeHtml(markdown = '') {
  const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n')
  const out = []; let paragraph = []; let listType = ''; let listItems = []; let quoteLines = []; let fence = null
  const flushParagraph = () => { const value = paragraph.join(' ').trim(); if (value) out.push(`<p>${inlineMarkdown(value)}</p>`); paragraph = [] }
  const flushList = () => { if (listType && listItems.length) out.push(`<${listType}>${listItems.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</${listType}>`); listType = ''; listItems = [] }
  const flushQuote = () => { if (quoteLines.length) out.push(`<blockquote>${quoteLines.map((line) => `<p>${inlineMarkdown(line)}</p>`).join('')}</blockquote>`); quoteLines = [] }
  const flushAll = () => { flushParagraph(); flushList(); flushQuote() }

  for (const raw of lines) {
    if (fence) {
      if (/^```/.test(raw.trim())) {
        const language = normalizeCodeLanguage(fence.language)
        out.push(`<pre data-language="${escapeAttr(language)}"><code class="language-${escapeAttr(language)}">${escapeHtml(fence.lines.join('\n'))}</code></pre>`)
        fence = null
      } else fence.lines.push(raw)
      continue
    }
    const fenceStart = raw.match(/^\s*```\s*([A-Za-z0-9_-]*)\s*$/)
    if (fenceStart) { flushAll(); fence = { language: fenceStart[1] || 'text', lines: [] }; continue }
    const line = raw.trim()
    if (!line) { flushAll(); continue }
    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) { flushAll(); out.push(`<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`); continue }
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(line)) { flushAll(); out.push('<hr />'); continue }
    const quote = line.match(/^>\s?(.*)$/)
    if (quote) { flushParagraph(); flushList(); quoteLines.push(quote[1]); continue }
    const unordered = line.match(/^[-*+]\s+(.+)$/)
    if (unordered) { flushParagraph(); flushQuote(); if (listType && listType !== 'ul') flushList(); listType = 'ul'; listItems.push(unordered[1]); continue }
    const ordered = line.match(/^\d+[.)]\s+(.+)$/)
    if (ordered) { flushParagraph(); flushQuote(); if (listType && listType !== 'ol') flushList(); listType = 'ol'; listItems.push(ordered[1]); continue }
    flushQuote(); flushList(); paragraph.push(line)
  }
  if (fence) { const language = normalizeCodeLanguage(fence.language); out.push(`<pre data-language="${escapeAttr(language)}"><code class="language-${escapeAttr(language)}">${escapeHtml(fence.lines.join('\n'))}</code></pre>`) }
  flushAll()
  return out.join('\n')
}

export function htmlToMarkdown(html = '') {
  if (typeof DOMParser === 'undefined') return String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim()
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html')
  const render = (node) => {
    if (node.nodeType === 3) return node.textContent || ''
    if (node.nodeType !== 1) return ''
    const tag = node.tagName.toLowerCase()
    const children = Array.from(node.childNodes || []).map(render).join('')
    if (tag === 'p' || tag === 'div') return `${children.trim()}\n\n`
    if (/^h[1-6]$/.test(tag)) return `${'#'.repeat(Number(tag[1]))} ${children.trim()}\n\n`
    if (tag === 'strong' || tag === 'b') return `**${children}**`
    if (tag === 'em' || tag === 'i') return `*${children}*`
    if (tag === 'code' && node.parentElement?.tagName?.toLowerCase() !== 'pre') return `\`${node.textContent || ''}\``
    if (tag === 'pre') {
      const code = node.querySelector('code'); const classLanguage = Array.from(code?.classList || []).find((name) => name.startsWith('language-'))?.slice(9) || ''
      const language = normalizeCodeLanguage(node.dataset.language || code?.dataset.language || classLanguage || 'text')
      return `\`\`\`${language === 'text' ? '' : language}\n${code?.textContent || node.textContent || ''}\n\`\`\`\n\n`
    }
    if (tag === 'a') { const href = safeUrl(node.getAttribute('href') || ''); return href ? `[${children || href}](${href})` : children }
    if (tag === 'img') { const src = safeUrl(node.getAttribute('src') || '', { image: true }); return src ? `![${node.getAttribute('alt') || ''}](${src})` : '' }
    if (tag === 'blockquote') return `${children.trim().split('\n').map((line) => `> ${line}`).join('\n')}\n\n`
    if (tag === 'ul' || tag === 'ol') return Array.from(node.children || []).map((item, index) => `${tag === 'ol' ? `${index + 1}. ` : '- '}${render(item).trim()}`).join('\n') + '\n\n'
    if (tag === 'li') return children
    if (tag === 'hr') return '---\n\n'
    if (tag === 'br') return '\n'
    if (['script', 'style', 'iframe', 'object', 'embed'].includes(tag)) return ''
    return `\n\n\`\`\`html\n${node.outerHTML || children}\n\`\`\`\n\n`
  }
  return Array.from(doc.body.childNodes || []).map(render).join('').replace(/\n{3,}/g, '\n\n').trim()
}

export function markdownExportFilename(title = 'untitled') {
  const slug = String(title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled'
  return `${slug}.md`
}
