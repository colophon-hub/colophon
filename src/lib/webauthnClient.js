function toBase64Url(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function post(body) {
  const response = await fetch('/api/webauthn', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.ok) throw new Error(data?.error || `Passkey request failed (${response.status})`)
  return data
}

export function passkeysSupported() {
  return Boolean(window.PublicKeyCredential && navigator.credentials)
}

export async function registerPasskey(name = 'Passkey') {
  if (!passkeysSupported()) throw new Error('This browser does not support WebAuthn passkeys.')

  const options = await post({ action: 'register.options' })
  const publicKey = {
    ...options.publicKey,
    challenge: fromBase64Url(options.publicKey.challenge),
    user: {
      ...options.publicKey.user,
      id: fromBase64Url(options.publicKey.user.id),
    },
    excludeCredentials: (options.publicKey.excludeCredentials || []).map((item) => ({
      ...item,
      id: fromBase64Url(item.id),
    })),
  }

  const credential = await navigator.credentials.create({ publicKey })
  const response = credential?.response
  if (!credential || !response?.getPublicKey || !response?.getAuthenticatorData) {
    throw new Error('This browser cannot expose the registered public key in the format this Colophon release supports.')
  }

  return post({
    action: 'register.finish',
    challengeId: options.challengeId,
    name,
    credentialId: toBase64Url(credential.rawId),
    clientDataJSON: toBase64Url(response.clientDataJSON),
    publicKeySpki: toBase64Url(response.getPublicKey()),
    authenticatorData: toBase64Url(response.getAuthenticatorData()),
    algorithm: response.getPublicKeyAlgorithm?.() ?? -7,
    transports: response.getTransports?.() || [],
  })
}

export async function authenticateWithPasskey(email) {
  if (!passkeysSupported()) throw new Error('This browser does not support WebAuthn passkeys.')

  const options = await post({ action: 'authenticate.options', email: String(email || '').trim() })
  const publicKey = {
    ...options.publicKey,
    challenge: fromBase64Url(options.publicKey.challenge),
    allowCredentials: (options.publicKey.allowCredentials || []).map((item) => ({
      ...item,
      id: fromBase64Url(item.id),
    })),
  }

  const credential = await navigator.credentials.get({ publicKey })
  if (!credential?.response) throw new Error('Passkey authentication was cancelled.')
  const response = credential.response

  return post({
    action: 'authenticate.finish',
    challengeId: options.challengeId,
    credentialId: toBase64Url(credential.rawId),
    clientDataJSON: toBase64Url(response.clientDataJSON),
    authenticatorData: toBase64Url(response.authenticatorData),
    signature: toBase64Url(response.signature),
    userHandle: response.userHandle ? toBase64Url(response.userHandle) : '',
  })
}
