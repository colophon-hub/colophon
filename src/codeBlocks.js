import { highlightCode, normalizeCodeLanguage } from '../shared/codeHighlight.js'

const ENHANCED = 'data-colophon-code-enhanced'
function enhance(pre) {
  if (!(pre instanceof HTMLElement) || pre.hasAttribute(ENHANCED)) return
  const code = pre.querySelector('code'); if (!code) return
  const language = normalizeCodeLanguage(pre.dataset.language || code.dataset.language || Array.from(code.classList).find((name) => name.startsWith('language-'))?.slice(9) || 'text')
  const source = code.textContent || ''
  if (language !== 'text') { code.innerHTML = highlightCode(source, language); code.classList.add(`language-${language}`) }
  pre.dataset.language = language; pre.setAttribute(ENHANCED, 'true')
  const wrapper = document.createElement('div'); wrapper.className = 'colophon-code-block'; pre.parentNode?.insertBefore(wrapper, pre); wrapper.appendChild(pre)
  const tools = document.createElement('div'); tools.className = 'colophon-code-block__tools'
  const label = document.createElement('span'); label.className = 'colophon-code-block__language'; label.textContent = language === 'text' ? 'plain text' : language
  const button = document.createElement('button'); button.type = 'button'; button.className = 'colophon-code-block__copy'; button.setAttribute('aria-label', `Copy ${label.textContent} code to clipboard`); button.textContent = 'Copy'
  button.addEventListener('click', async () => { try { await navigator.clipboard.writeText(source); button.textContent = 'Copied' } catch { button.textContent = 'Copy failed' } window.setTimeout(() => { button.textContent = 'Copy' }, 1600) })
  tools.append(label, button); wrapper.insertBefore(tools, pre)
}
function scan(root = document) { root.querySelectorAll?.('pre > code, pre[data-language]').forEach((node) => enhance(node.tagName === 'PRE' ? node : node.parentElement)) }
if (typeof document !== 'undefined') {
  const run = () => scan(document); if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true }); else run()
  const observer = new MutationObserver((records) => { for (const record of records) for (const node of record.addedNodes) { if (!(node instanceof HTMLElement)) continue; if (node.matches?.('pre')) enhance(node); scan(node) } })
  observer.observe(document.documentElement, { childList: true, subtree: true })
}
