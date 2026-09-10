const EXECUTABLE_SIGNATURES = [
  [0x4d, 0x5a], // Windows PE / DOS
  [0x7f, 0x45, 0x4c, 0x46], // ELF
  [0xfe, 0xed, 0xfa, 0xce], [0xfe, 0xed, 0xfa, 0xcf],
  [0xce, 0xfa, 0xed, 0xfe], [0xcf, 0xfa, 0xed, 0xfe], // Mach-O
]

const ZIP_MIME_TYPES = new Set([
  'application/zip',
  'application/x-zip-compressed',
  'application/epub+zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
])

const TEXT_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'image/svg+xml',
  'application/rtf',
])

export function detectMediaSignature(buffer) {
  const bytes = toBytes(buffer)
  if (starts(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (starts(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a') return 'image/gif'
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'image/webp'
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE') return 'audio/wav'
  if (ascii(bytes, 0, 4) === 'OggS') return 'application/ogg'
  if (ascii(bytes, 0, 4) === 'fLaC') return 'audio/flac'
  if (starts(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return 'application/webm'
  if (ascii(bytes, 0, 3) === 'ID3' || isMp3Frame(bytes)) return 'audio/mpeg'
  if (isAacFrame(bytes)) return 'audio/aac'
  if (ascii(bytes, 0, 5) === '%PDF-') return 'application/pdf'
  if (ascii(bytes, 0, 4) === 'wOFF') return 'font/woff'
  if (ascii(bytes, 0, 4) === 'wOF2') return 'font/woff2'
  if (starts(bytes, [0x50, 0x4b, 0x03, 0x04]) || starts(bytes, [0x50, 0x4b, 0x05, 0x06]) || starts(bytes, [0x50, 0x4b, 0x07, 0x08])) return 'application/zip'
  if (starts(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'application/x-ole-storage'

  if (bytes.length >= 12 && ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4)
    if (['heic', 'heix', 'hevc', 'hevx'].includes(brand)) return 'image/heic'
    if (['heif', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) return 'image/heif'
    if (brand === 'qt  ') return 'video/quicktime'
    if (/^M4A|^M4B/.test(brand)) return 'audio/mp4'
    return 'application/mp4'
  }

  return ''
}

export function mediaMimeMatchesSignature(type, signature) {
  const mime = normalizeMime(type)
  const detected = normalizeMime(signature)
  if (!mime || !detected) return false
  if (mime === detected) return true
  if (detected === 'application/ogg') return mime === 'audio/ogg' || mime === 'video/ogg'
  if (detected === 'application/webm') return mime === 'audio/webm' || mime === 'video/webm'
  if (detected === 'application/mp4') return mime === 'audio/mp4' || mime === 'audio/x-m4a' || mime === 'video/mp4'
  if (detected === 'audio/mp4') return mime === 'audio/mp4' || mime === 'audio/x-m4a'
  if (detected === 'audio/wav') return mime === 'audio/wav' || mime === 'audio/x-wav'
  if (detected === 'application/zip') return ZIP_MIME_TYPES.has(mime)
  if (detected === 'application/x-ole-storage') return mime === 'application/msword'
  return false
}

export function validateMediaBytes(buffer, mimeType) {
  const bytes = toBytes(buffer)
  const mime = normalizeMime(mimeType)
  if (!bytes.length) return { ok: false, reason: 'file is empty', detectedType: '' }
  if (looksExecutable(bytes)) return { ok: false, reason: 'executable files are not accepted', detectedType: 'application/x-executable' }

  if (TEXT_MIME_TYPES.has(mime)) {
    const textResult = validateTextPayload(bytes, mime)
    return { ...textResult, detectedType: textResult.ok ? mime : '' }
  }

  const detectedType = detectMediaSignature(bytes)
  if (!detectedType) return { ok: false, reason: 'unrecognized file signature', detectedType: '' }
  if (!mediaMimeMatchesSignature(mime, detectedType)) {
    return { ok: false, reason: `file signature ${detectedType} does not match ${mime || 'the declared media type'}`, detectedType }
  }
  return { ok: true, reason: '', detectedType }
}

export function assertMediaBytes(buffer, mimeType) {
  const result = validateMediaBytes(buffer, mimeType)
  if (!result.ok) {
    const error = new Error(result.reason)
    error.status = 415
    throw error
  }
  return result
}

function validateTextPayload(bytes, mime) {
  const sample = bytes.slice(0, Math.min(bytes.length, 256 * 1024))
  if (sample.some((byte) => byte === 0)) return { ok: false, reason: 'text payload contains binary data' }

  let text = ''
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(sample)
  } catch {
    return { ok: false, reason: 'text payload is not valid UTF-8' }
  }

  const normalized = text.replace(/^\uFEFF/, '').trimStart()
  if (mime === 'application/rtf' && !normalized.startsWith('{\\rtf')) {
    return { ok: false, reason: 'file signature does not match application/rtf' }
  }
  if (mime === 'image/svg+xml') {
    if (!/^<\?xml\b[\s\S]*?<svg\b|^<svg\b/i.test(normalized)) {
      return { ok: false, reason: 'file contents do not look like SVG' }
    }
    if (/<script\b|<foreignObject\b|\son[a-z]+\s*=|(?:href|xlink:href)\s*=\s*["']?\s*javascript:/i.test(normalized)) {
      return { ok: false, reason: 'active SVG content is not accepted' }
    }
  }
  return { ok: true, reason: '' }
}

function looksExecutable(bytes) {
  return EXECUTABLE_SIGNATURES.some((signature) => starts(bytes, signature))
}

function isMp3Frame(bytes) {
  return bytes.length > 1 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0 && (bytes[1] & 0x06) !== 0
}

function isAacFrame(bytes) {
  return bytes.length > 1 && bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0
}

function normalizeMime(value) {
  const mime = String(value || '').split(';')[0].trim().toLowerCase()
  if (mime === 'image/jpg') return 'image/jpeg'
  if (mime === 'application/x-pdf') return 'application/pdf'
  if (mime === 'text/x-markdown') return 'text/markdown'
  if (mime === 'application/font-woff' || mime === 'application/x-font-woff') return 'font/woff'
  if (mime === 'application/font-woff2' || mime === 'application/x-font-woff2') return 'font/woff2'
  return mime
}

function toBytes(buffer) {
  return buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer || 0)
}

function starts(bytes, signature) {
  if (bytes.length < signature.length) return false
  return signature.every((value, index) => bytes[index] === value)
}

function ascii(bytes, offset, length) {
  if (bytes.length < offset + length) return ''
  return String.fromCharCode(...bytes.slice(offset, offset + length))
}
