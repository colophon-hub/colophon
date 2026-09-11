export const COLOPHON_EXTENSION_API_VERSION = '1.0.0'
const events = new Map(); const filters = new Map(); const errors = []
function clone(value) { if (typeof structuredClone === 'function') { try { return structuredClone(value) } catch {} } try { return JSON.parse(JSON.stringify(value)) } catch { return value } }
function normalizeExtension(extension) {
  if (!extension || typeof extension !== 'object') throw new Error('extension manifest is required')
  const id = String(extension.id || '').trim().toLowerCase(); if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) throw new Error('extension id is invalid')
  return { id, name: String(extension.name || id).trim().slice(0, 120), version: String(extension.version || '0.0.0').trim().slice(0, 64), apiVersion: String(extension.apiVersion || COLOPHON_EXTENSION_API_VERSION) }
}
function recordError(extension, hook, error) { const entry = { extensionId: extension.id, hook, message: String(error?.message || error), at: new Date().toISOString() }; errors.push(entry); if (errors.length > 100) errors.shift(); try { console.error(`[Colophon extension ${extension.id}] ${hook}:`, error) } catch {} }
export function createExtensionApi(manifestInput) {
  const manifest = normalizeExtension(manifestInput); if (manifest.apiVersion !== COLOPHON_EXTENSION_API_VERSION) throw new Error(`unsupported extension API version ${manifest.apiVersion}`)
  return Object.freeze({
    version: COLOPHON_EXTENSION_API_VERSION, manifest,
    on(hook, handler) { if (typeof handler !== 'function') throw new Error('event handler must be a function'); const list = events.get(hook) || []; list.push({ extension: manifest, handler }); events.set(hook, list); return () => events.set(hook, (events.get(hook) || []).filter((entry) => entry.handler !== handler)) },
    filter(hook, handler) { if (typeof handler !== 'function') throw new Error('filter handler must be a function'); const list = filters.get(hook) || []; list.push({ extension: manifest, handler }); filters.set(hook, list); return () => filters.set(hook, (filters.get(hook) || []).filter((entry) => entry.handler !== handler)) },
  })
}
export async function emitExtensionEvent(hook, payload) { for (const entry of events.get(hook) || []) { try { await entry.handler(clone(payload), Object.freeze({ apiVersion: COLOPHON_EXTENSION_API_VERSION, extension: entry.extension })) } catch (error) { recordError(entry.extension, hook, error) } } }
export async function applyExtensionFilters(hook, value, context = {}) { let current = clone(value); for (const entry of filters.get(hook) || []) { try { const next = await entry.handler(clone(current), Object.freeze({ ...clone(context), apiVersion: COLOPHON_EXTENSION_API_VERSION, extension: entry.extension })); if (next !== undefined) current = next } catch (error) { recordError(entry.extension, hook, error) } } return current }
export function applyExtensionFiltersSync(hook, value, context = {}) { let current = clone(value); for (const entry of filters.get(hook) || []) { try { const next = entry.handler(clone(current), Object.freeze({ ...clone(context), apiVersion: COLOPHON_EXTENSION_API_VERSION, extension: entry.extension })); if (next && typeof next.then === 'function') throw new Error('async filter used in synchronous rendering hook'); if (next !== undefined) current = next } catch (error) { recordError(entry.extension, hook, error) } } return current }
export function getExtensionErrors() { return clone(errors) }
export function resetExtensionRegistryForTests() { events.clear(); filters.clear(); errors.length = 0 }
