import { useEffect, useState } from 'react'
import { isLocalRuntime } from '../lib/runtime'
import { passkeysSupported, registerPasskey } from '../lib/webauthnClient'

async function requestSecurity(body = null) {
  const response = await fetch('/api/account-security', {
    method: body ? 'POST' : 'GET',
    credentials: 'same-origin',
    headers: body
      ? { 'content-type': 'application/json', accept: 'application/json' }
      : { accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.ok) throw new Error(data?.error || `Account security request failed (${response.status})`)
  return data
}

function downloadRecoveryCodes(codes) {
  const blob = new Blob([`${codes.join('\n')}\n`], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'colophon-recovery-codes.txt'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function AccountSecurityCard() {
  const local = isLocalRuntime()
  const [status, setStatus] = useState(null)
  const [message, setMessage] = useState('')
  const [password, setPassword] = useState('')
  const [enrollment, setEnrollment] = useState(null)
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState([])
  const [passkeyName, setPasskeyName] = useState('My passkey')
  const [busy, setBusy] = useState(false)

  async function reload() {
    if (local) return
    try {
      setStatus(await requestSecurity())
      setMessage('')
    } catch (error) {
      setMessage(String(error?.message || error))
    }
  }

  useEffect(() => { reload() }, [local])

  async function act(callback) {
    setBusy(true)
    setMessage('')
    try {
      await callback()
    } catch (error) {
      setMessage(String(error?.message || error))
    } finally {
      setBusy(false)
    }
  }

  if (local) {
    return (
      <section className="wp-meta-box" aria-labelledby="account-security-title">
        <h2 id="account-security-title">Account security</h2>
        <p className="description">This local edition does not use Colophon server accounts. TOTP and passkeys apply only to shared/server user accounts.</p>
      </section>
    )
  }

  const passkeys = status?.passkeys || []
  const needsSensitiveActionPassword = Boolean(status?.totpEnabled || passkeys.length)

  return (
    <section className="wp-meta-box" aria-labelledby="account-security-title">
      <h2 id="account-security-title">Account security</h2>
      <p className="description">Optional TOTP two-factor authentication and passkeys protect this individual shared-server account.</p>

      <h3>Authenticator app (TOTP)</h3>
      <p><strong>Status:</strong> {status?.totpEnabled ? 'Enabled' : 'Not enabled'}.</p>

      {!status?.totpEnabled && !enrollment ? (
        <button
          className="button"
          type="button"
          disabled={busy}
          onClick={() => act(async () => {
            const data = await requestSecurity({ action: 'totp.begin' })
            setEnrollment(data.enrollment)
          })}
        >
          Set up authenticator app
        </button>
      ) : null}

      {enrollment ? (
        <div className="colophon-security-enrollment">
          <p>Add this secret or URI to your authenticator app, then enter a current code. TOTP is not active until confirmation succeeds.</p>
          <label className="native-content-editor__field">
            <span>Secret</span>
            <input readOnly value={enrollment.secret || ''} />
          </label>
          <label className="native-content-editor__field">
            <span>otpauth URI</span>
            <textarea readOnly rows="3" value={enrollment.otpauthUri || ''} />
          </label>
          <label className="native-content-editor__field">
            <span>6-digit code</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </label>
          <button
            className="button button--primary"
            type="button"
            disabled={busy || code.length !== 6}
            onClick={() => act(async () => {
              const data = await requestSecurity({ action: 'totp.confirm', code })
              setRecoveryCodes(data.recoveryCodes || [])
              setEnrollment(null)
              setCode('')
              await reload()
            })}
          >
            Confirm and enable
          </button>
        </div>
      ) : null}

      {needsSensitiveActionPassword ? (
        <label className="native-content-editor__field">
          <span>Current password for sensitive changes</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
      ) : null}

      {status?.totpEnabled ? (
        <>
          <p className="description">Recovery codes remaining: {status.recoveryCodesRemaining ?? 0}</p>
          <div className="review-card__actions">
            <button
              className="button"
              type="button"
              disabled={busy || !password}
              onClick={() => act(async () => {
                const data = await requestSecurity({ action: 'recovery.regenerate', password })
                setRecoveryCodes(data.recoveryCodes || [])
                setPassword('')
                await reload()
              })}
            >
              Generate new recovery codes
            </button>
            <button
              className="button button-link-delete"
              type="button"
              disabled={busy || !password}
              onClick={() => act(async () => {
                await requestSecurity({ action: 'totp.disable', password })
                setPassword('')
                setRecoveryCodes([])
                await reload()
              })}
            >
              Disable TOTP
            </button>
          </div>
        </>
      ) : null}

      {recoveryCodes.length ? (
        <div className="notice notice-warning" role="status">
          <strong>Save these recovery codes now.</strong>
          <p>Each works once. Colophon stores only hashes and cannot show these plaintext codes again.</p>
          <pre>{recoveryCodes.join('\n')}</pre>
          <button className="button" type="button" onClick={() => downloadRecoveryCodes(recoveryCodes)}>Download recovery codes</button>
        </div>
      ) : null}

      <h3>Passkeys</h3>
      {!passkeysSupported() ? (
        <p className="description">This browser does not expose the WebAuthn APIs required by this Colophon passkey implementation.</p>
      ) : (
        <div className="review-card__actions">
          <label className="native-content-editor__field">
            <span>Passkey name</span>
            <input value={passkeyName} onChange={(event) => setPasskeyName(event.target.value)} />
          </label>
          <button
            className="button"
            type="button"
            disabled={busy}
            onClick={() => act(async () => {
              await registerPasskey(passkeyName)
              await reload()
            })}
          >
            Register passkey
          </button>
        </div>
      )}

      <div className="colophon-passkey-list">
        {passkeys.map((passkey) => (
          <article className="colophon-passkey-card" key={passkey.id}>
            <div>
              <strong>{passkey.name}</strong>
              <div className="description">
                Created {passkey.createdAt || 'unknown'}{passkey.lastUsedAt ? ` · last used ${passkey.lastUsedAt}` : ''}
              </div>
            </div>
            <button
              className="button button-link-delete"
              type="button"
              disabled={busy || !password}
              onClick={() => act(async () => {
                await requestSecurity({ action: 'passkey.remove', credentialId: passkey.id, password })
                setPassword('')
                await reload()
              })}
            >
              Remove
            </button>
          </article>
        ))}
      </div>

      {message ? <p className="notice notice-error" role="alert">{message}</p> : null}
    </section>
  )
}
