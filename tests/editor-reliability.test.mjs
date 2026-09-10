import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { sanitizeClassicEditorNode } from '../src/lib/classicEditorBody.js'

function element(tagName, attrs = {}, childNodes = []) {
  return {
    nodeType: 1,
    tagName,
    childNodes,
    getAttribute(name) { return Object.hasOwn(attrs, name) ? attrs[name] : null },
    hasAttribute(name) { return Object.hasOwn(attrs, name) },
  }
}

test('classic body sanitizer preserves safe audio players', () => {
  const source = element('SOURCE', { src: 'https://media.example/episode.mp3', type: 'audio/mpeg' })
  const audio = element('AUDIO', { controls: '', preload: 'metadata' }, [source])
  assert.equal(
    sanitizeClassicEditorNode(audio),
    '<audio controls preload="metadata"><source src="https://media.example/episode.mp3" type="audio/mpeg" /></audio>',
  )
})

test('classic body sanitizer rejects unsafe media urls', () => {
  const audio = element('AUDIO', { src: 'javascript:alert(1)', controls: '' })
  assert.equal(sanitizeClassicEditorNode(audio), '')
})

test('classic toolbar reliability keeps paragraph selectable and restores link selection', () => {
  const source = fs.readFileSync(new URL('../src/adminClassicEditorReliability.js', import.meta.url), 'utf8')
  assert.match(source, /event\.stopImmediatePropagation/)
  assert.match(source, /applyVisualFormat\(value\)/)
  assert.match(source, /select\.value = format \|\| ''/)
  assert.match(source, /wp-classic-toolbar__insert-link/)
  assert.match(source, /restoreEditorSelection\(\)/)
})

test('rich paste strips source styling before insertion', () => {
  const source = fs.readFileSync(new URL('../src/adminClassicEditorReliability.js', import.meta.url), 'utf8')
  assert.match(source, /name === 'style'/)
  assert.match(source, /name === 'bgcolor'/)
  assert.match(source, /name\.startsWith\('data-'\)/)
  assert.match(source, /insertFromPaste/)
})
