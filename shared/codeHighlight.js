export const SUPPORTED_CODE_LANGUAGES = Object.freeze([
  'text', 'html', 'css', 'javascript', 'typescript', 'json',
  'bash', 'shell', 'python', 'markdown', 'yaml', 'sql',
])

const ALIASES = Object.freeze({ js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', sh: 'bash', zsh: 'bash', yml: 'yaml', md: 'markdown', plaintext: 'text', txt: 'text' })

export function normalizeCodeLanguage(value) {
  const raw = String(value || '').trim().toLowerCase()
  const normalized = ALIASES[raw] || raw || 'text'
  return SUPPORTED_CODE_LANGUAGES.includes(normalized) ? normalized : 'text'
}

export function escapeCodeHtml(value) {
  return String(value || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function protect(html, regex, className, tokens) {
  return html.replace(regex, (match) => {
    const marker = `\uE000${String.fromCharCode(0xE100 + tokens.length)}\uE001`
    tokens.push({ marker, html: `<span class="tok-${className}">${match}</span>` })
    return marker
  })
}

export function highlightCode(source, language) {
  const lang = normalizeCodeLanguage(language)
  let html = escapeCodeHtml(source)
  if (lang === 'text') return html
  const tokens = []

  if (['javascript', 'typescript', 'json'].includes(lang)) {
    html = protect(html, /(?:&quot;|")(?:\\.|[^"\\])*(?:&quot;|")|(?:&#39;|')(?:\\.|[^'\\])*(?:&#39;|')/g, 'string', tokens)
    html = protect(html, /\/\/[^\n]*|\/\*[\s\S]*?\*\//g, 'comment', tokens)
    html = html.replace(/\b(const|let|var|function|return|if|else|for|while|class|extends|new|import|export|from|async|await|throw|try|catch|finally|switch|case|break|continue|typeof|instanceof|interface|type|enum|implements|private|public|protected|readonly)\b/g, '<span class="tok-keyword">$1</span>')
      .replace(/\b(true|false|null|undefined)\b/g, '<span class="tok-literal">$1</span>')
      .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-number">$1</span>')
  } else if (lang === 'python') {
    html = protect(html, /(?:&quot;|")(?:\\.|[^"\\])*(?:&quot;|")|(?:&#39;|')(?:\\.|[^'\\])*(?:&#39;|')/g, 'string', tokens)
    html = protect(html, /#[^\n]*/g, 'comment', tokens)
    html = html.replace(/\b(def|class|return|if|elif|else|for|while|in|is|not|and|or|import|from|as|try|except|finally|raise|with|lambda|yield|async|await|pass|break|continue)\b/g, '<span class="tok-keyword">$1</span>')
      .replace(/\b(True|False|None)\b/g, '<span class="tok-literal">$1</span>')
      .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-number">$1</span>')
  } else if (['bash', 'shell'].includes(lang)) {
    html = protect(html, /(?:&quot;|")(?:\\.|[^"\\])*(?:&quot;|")|(?:&#39;|')(?:\\.|[^'\\])*(?:&#39;|')/g, 'string', tokens)
    html = protect(html, /#[^\n]*/g, 'comment', tokens)
    html = html.replace(/\b(if|then|else|elif|fi|for|do|done|case|esac|while|function|in|export|local|readonly|return|exit)\b/g, '<span class="tok-keyword">$1</span>')
  } else if (lang === 'sql') {
    html = protect(html, /(?:&#39;|')(?:''|[^'])*(?:&#39;|')/g, 'string', tokens)
    html = protect(html, /--[^\n]*|\/\*[\s\S]*?\*\//g, 'comment', tokens)
    html = html.replace(/\b(SELECT|FROM|WHERE|INSERT|INTO|UPDATE|DELETE|CREATE|TABLE|ALTER|DROP|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|VALUES|SET|AND|OR|NOT|NULL|PRIMARY|KEY|FOREIGN|REFERENCES|INDEX|DISTINCT|UNION|ALL)\b/gi, '<span class="tok-keyword">$1</span>')
  } else if (lang === 'html') {
    html = html.replace(/(&lt;\/?)([A-Za-z][\w:-]*)/g, '$1<span class="tok-tag">$2</span>').replace(/\s([A-Za-z_:][-A-Za-z0-9_:.]*)(=)/g, ' <span class="tok-attr">$1</span>$2')
  } else if (lang === 'css') {
    html = protect(html, /\/\*[\s\S]*?\*\//g, 'comment', tokens)
    html = html.replace(/([.#]?[A-Za-z_-][\w-]*)(\s*\{)/g, '<span class="tok-selector">$1</span>$2').replace(/([A-Za-z-]+)(\s*:)/g, '<span class="tok-attr">$1</span>$2')
  } else if (lang === 'yaml') {
    html = protect(html, /#[^\n]*/g, 'comment', tokens)
    html = html.replace(/^(\s*[-]?\s*)([A-Za-z0-9_.-]+)(:)/gm, '$1<span class="tok-attr">$2</span>$3').replace(/\b(true|false|null|yes|no)\b/gi, '<span class="tok-literal">$1</span>')
  } else if (lang === 'markdown') {
    html = html.replace(/^(#{1,6}\s.*)$/gm, '<span class="tok-keyword">$1</span>').replace(/(\*\*[^*]+\*\*|`[^`]+`)/g, '<span class="tok-string">$1</span>')
  }

  for (const token of tokens) html = html.replaceAll(token.marker, token.html)
  return html
}
