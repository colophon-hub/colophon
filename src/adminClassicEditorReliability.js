const BLOCK_FORMATS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre'])
let savedSelection = null

function isEditorRoute() {
  if (typeof window === 'undefined') return false
  return /\/(wp-admin\/post-new\.php|wp-admin\/native-bridge|native-bridge)(?:\/|$)/.test(window.location.pathname)
}

function editorElements() {
  return {
    visual: document.querySelector('.native-content-editor__visual[contenteditable="true"]'),
    textarea: document.querySelector('.native-content-editor__textarea'),
  }
}

function rememberEditorSelection() {
  if (!isEditorRoute()) return
  const { visual, textarea } = editorElements()
  const active = document.activeElement
  if (textarea && active === textarea) {
    savedSelection = {
      mode: 'text',
      start: textarea.selectionStart ?? textarea.value.length,
      end: textarea.selectionEnd ?? textarea.value.length,
    }
    return
  }

  const selection = window.getSelection?.()
  if (!visual || !selection?.rangeCount) return
  const range = selection.getRangeAt(0)
  if (!visual.contains(range.commonAncestorContainer)) return
  savedSelection = { mode: 'visual', range: range.cloneRange() }
}

function restoreEditorSelection() {
  const { visual, textarea } = editorElements()
  if (savedSelection?.mode === 'text' && textarea) {
    textarea.focus()
    textarea.selectionStart = Math.min(savedSelection.start, textarea.value.length)
    textarea.selectionEnd = Math.min(savedSelection.end, textarea.value.length)
    return true
  }

  if (savedSelection?.mode === 'visual' && visual) {
    const range = savedSelection.range
    if (!range || !visual.contains(range.commonAncestorContainer)) return false
    visual.focus()
    const selection = window.getSelection?.()
    if (!selection) return false
    selection.removeAllRanges()
    selection.addRange(range)
    return true
  }
  return false
}

function closestBlockFormat() {
  const { visual } = editorElements()
  const selection = window.getSelection?.()
  if (!visual || !selection?.rangeCount) return ''
  let node = selection.anchorNode
  if (!node || !visual.contains(node)) return ''
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
  while (node && node !== visual) {
    const tag = String(node.tagName || '').toLowerCase()
    if (BLOCK_FORMATS.has(tag)) return tag
    node = node.parentElement
  }
  return ''
}

function ensureFormatPlaceholder(select) {
  if (!select || select.querySelector('option[value=""]')) return
  const option = document.createElement('option')
  option.value = ''
  option.textContent = 'Format'
  option.hidden = true
  select.prepend(option)
}

function syncFormatSelect() {
  const select = document.querySelector('.wp-classic-toolbar__format')
  if (!select) return
  ensureFormatPlaceholder(select)
  const format = closestBlockFormat()
  select.value = format || ''
}

function applyVisualFormat(value) {
  const { visual } = editorElements()
  if (!visual || !BLOCK_FORMATS.has(value)) return false
  restoreEditorSelection()
  visual.focus()
  document.execCommand('formatBlock', false, value)
  visual.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'formatBlock' }))
  visual.dispatchEvent(new Event('blur', { bubbles: true }))
  rememberEditorSelection()
  syncFormatSelect()
  return true
}

function stripHostilePasteStyling(html = '') {
  const raw = String(html || '')
  if (!raw || typeof DOMParser === 'undefined') return raw
  const doc = new DOMParser().parseFromString(raw, 'text/html')
  doc.querySelectorAll('script, style, meta, link').forEach((node) => node.remove())
  for (const el of doc.querySelectorAll('*')) {
    for (const attr of Array.from(el.attributes || [])) {
      const name = String(attr.name || '').toLowerCase()
      if (
        name === 'style' || name === 'class' || name === 'id' || name === 'bgcolor' ||
        name === 'color' || name === 'face' || name === 'size' || name.startsWith('on') ||
        name.startsWith('data-')
      ) {
        el.removeAttribute(attr.name)
      }
    }
    const href = el.getAttribute?.('href') || ''
    const src = el.getAttribute?.('src') || ''
    if (/^\s*javascript:/i.test(href)) el.removeAttribute('href')
    if (/^\s*javascript:/i.test(src)) el.removeAttribute('src')
  }
  return doc.body.innerHTML
}

function handlePaste(event) {
  const visual = event.target?.closest?.('.native-content-editor__visual[contenteditable="true"]')
  if (!visual) return
  const html = event.clipboardData?.getData('text/html') || ''
  if (!html) return
  const sanitized = stripHostilePasteStyling(html)
  if (!sanitized) return
  event.preventDefault()
  visual.focus()
  document.execCommand('insertHTML', false, sanitized)
  visual.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: sanitized }))
}

function handleMouseDown(event) {
  const target = event.target
  if (target?.closest?.('.wp-classic-toolbar__link-toggle')) rememberEditorSelection()
  if (target?.closest?.('.wp-classic-toolbar__format')) rememberEditorSelection()
}

function handleClick(event) {
  const target = event.target
  if (target?.closest?.('.wp-classic-toolbar__link-toggle')) restoreEditorSelection()
  if (target?.closest?.('.wp-classic-toolbar__insert-link')) restoreEditorSelection()
}

function handleFormatChange(event) {
  const select = event.target?.closest?.('.wp-classic-toolbar__format')
  if (!select) return
  const value = String(select.value || '').toLowerCase()
  if (!BLOCK_FORMATS.has(value)) return

  const { textarea } = editorElements()
  if (textarea) return

  // Stop the legacy listener from forcing the select back to Paragraph.
  event.preventDefault()
  event.stopPropagation()
  if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation()
  applyVisualFormat(value)
}

function enhanceToolbar() {
  const select = document.querySelector('.wp-classic-toolbar__format')
  if (!select) return
  ensureFormatPlaceholder(select)
  syncFormatSelect()
}

function boot() {
  if (!isEditorRoute()) return
  enhanceToolbar()
  document.addEventListener('mousedown', handleMouseDown, true)
  document.addEventListener('click', handleClick, true)
  document.addEventListener('change', handleFormatChange, true)
  document.addEventListener('paste', handlePaste, true)
  document.addEventListener('selectionchange', () => {
    rememberEditorSelection()
    syncFormatSelect()
  })
  const observer = new MutationObserver(enhanceToolbar)
  observer.observe(document.body, { childList: true, subtree: true })
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
  else boot()
}
