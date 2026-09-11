import { createExtensionApi } from '../../shared/extensionHooks.js'
export function installExampleReadingTimeExtension() {
  const api = createExtensionApi({ id: 'example-reading-time', name: 'Example reading time logger', version: '1.0.0', apiVersion: '1.0.0' })
  return api.on('content:afterSave', ({ item }) => {
    const plain = String(item?.bodyHtml || item?.body || '').replace(/<[^>]+>/g, ' ')
    const words = plain.trim() ? plain.trim().split(/\s+/).length : 0
    console.info(`[example-reading-time] "${item?.title || 'Untitled'}" is about ${Math.max(1, Math.ceil(words / 220))} min`)
  })
}
