import test from 'node:test'
import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import { build } from 'vite'

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...await collectJavaScriptFiles(path))
    else if (entry.isFile() && /\.(?:m?js)$/.test(entry.name)) files.push(path)
  }
  return files
}

test('all Cloudflare functions bundle from the repository source tree', { timeout: 120000 }, async () => {
  const root = resolve(import.meta.dirname, '..')
  const functionsDirectory = resolve(root, 'functions')
  const files = await collectJavaScriptFiles(functionsDirectory)
  assert.ok(files.length > 0, 'expected Cloudflare function entry files')

  const input = Object.fromEntries(files.map((file) => [
    relative(functionsDirectory, file).replace(/\\/g, '/').replace(/\.[^.]+$/, ''),
    file,
  ]))

  await assert.doesNotReject(() => build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      target: 'es2022',
      minify: false,
      rollupOptions: { input },
    },
  }))
})
