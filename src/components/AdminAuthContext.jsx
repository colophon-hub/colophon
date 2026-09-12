import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getEditorPermissionsSnapshot } from '../lib/editorPermissions'
import { authenticateWithPasskey } from '../lib/webauthnClient'
import { getColophonHostRuntime } from '../host/runtime'

const AdminAuthContext = createContext(null)

function hasCapability(session, capability) {
  const capabilities = Array.isArray(session?.capabilities) ? session.capabilities : []
  return capabilities.includes('*') || capabilities.includes(capability)
}

function hostedPermissionsSnapshot(session) {
  const canWriteContent = hasCapability(session, 'content:write')
  const canManageSite = hasCapability(session, 'site:manage')

  return {
    publicConfig: {
      ok: true,
      canEdit: canManageSite,
      mode: 'hosted',
    },
    nativeContent: {
      ok: true,
      canEdit: canWriteContent,
      mode: 'hosted',
    },
    canEditAnything: Boolean(canWriteContent || canManageSite),
  }
}

export function AdminAuthProvider({ children }) {
  const initialRuntime = getColophonHostRuntime()
  const hostedSession = initialRuntime.embedded ? initialRuntime.session : null

  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(hostedSession?.authenticated))
  const [isChecking, setIsChecking] = useState(!initialRuntime.embedded)
  const [authError, setAuthError] = useState('')
  const [permissions, setPermissions] = useState(
    hostedSession?.authenticated ? hostedPermissionsSnapshot(hostedSession) : null
  )
  const [session, setSession] = useState(hostedSession || null)
  const [secondFactorChallenge, setSecondFactorChallenge] = useState(null)

  const refreshAuth = useCallback(async () => {
    const runtime = getColophonHostRuntime()

    if (runtime.embedded) {
      const nextSession = runtime.session || null
      const allowed = Boolean(nextSession?.authenticated)
      setSession(nextSession)
      setPermissions(allowed ? hostedPermissionsSnapshot(nextSession) : null)
      setIsAuthenticated(allowed)
      setSecondFactorChallenge(null)
      setAuthError(allowed ? '' : 'Host session is not authenticated.')
      setIsChecking(false)
      return allowed
    }

    try {
      setIsChecking(true)
      setAuthError('')
      const sessionRes = await fetch('/api/session', {
        method: 'GET',
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
      })
      const sessionData = await safeJson(sessionRes)
      const allowed = Boolean(sessionRes.ok && sessionData?.authenticated)
      setSession(sessionData || null)
      const snapshot = allowed ? await getEditorPermissionsSnapshot() : null
      setPermissions(snapshot || null)
      setIsAuthenticated(allowed)
      if (allowed) setSecondFactorChallenge(null)
      if (!allowed) setAuthError('')
      return allowed
    } catch (error) {
      setSession(null)
      setPermissions(null)
      setIsAuthenticated(false)
      setAuthError(String(error?.message || error))
      return false
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    refreshAuth()
  }, [refreshAuth])

  const login = useCallback(async (credentials) => {
    if (getColophonHostRuntime().embedded) {
      setAuthError('Sign in is managed by the host application.')
      return false
    }

    try {
      setIsChecking(true)
      setAuthError('')
      setSecondFactorChallenge(null)
      const body = typeof credentials === 'string'
        ? { token: credentials.trim() }
        : {
            ...(credentials?.email ? { email: String(credentials.email).trim() } : {}),
            ...(credentials?.password ? { password: String(credentials.password) } : {}),
            ...(credentials?.token ? { token: String(credentials.token).trim() } : {}),
          }
      const res = await fetch('/api/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await safeJson(res)
      if (res.ok && data?.requiresSecondFactor && data?.challengeId) {
        setSession(null)
        setPermissions(null)
        setIsAuthenticated(false)
        setSecondFactorChallenge({ id: data.challengeId, methods: data.methods || ['totp'] })
        return false
      }
      if (!res.ok || !data?.authenticated) {
        setSession(null)
        setPermissions(null)
        setIsAuthenticated(false)
        setAuthError(data?.error || 'Login failed.')
        return false
      }
      return refreshAuth()
    } catch (error) {
      setSession(null)
      setPermissions(null)
      setIsAuthenticated(false)
      setAuthError(String(error?.message || error))
      return false
    } finally {
      setIsChecking(false)
    }
  }, [refreshAuth])

  const completeSecondFactor = useCallback(async (code) => {
    if (getColophonHostRuntime().embedded) {
      setAuthError('Second-factor authentication is managed by the host application.')
      return false
    }
    if (!secondFactorChallenge?.id) return false

    try {
      setIsChecking(true)
      setAuthError('')
      const res = await fetch('/api/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          challengeId: secondFactorChallenge.id,
          code: String(code || '').trim(),
        }),
      })
      const data = await safeJson(res)
      if (!res.ok || !data?.authenticated) {
        setAuthError(data?.error || 'Verification failed.')
        return false
      }
      setSecondFactorChallenge(null)
      return refreshAuth()
    } catch (error) {
      setAuthError(String(error?.message || error))
      return false
    } finally {
      setIsChecking(false)
    }
  }, [refreshAuth, secondFactorChallenge])

  const passkeyLogin = useCallback(async (email) => {
    if (getColophonHostRuntime().embedded) {
      setAuthError('Passkey authentication is managed by the host application.')
      return false
    }

    try {
      setIsChecking(true)
      setAuthError('')
      setSecondFactorChallenge(null)
      await authenticateWithPasskey(email)
      return refreshAuth()
    } catch (error) {
      setAuthError(String(error?.message || error))
      return false
    } finally {
      setIsChecking(false)
    }
  }, [refreshAuth])

  const logout = useCallback(async () => {
    if (getColophonHostRuntime().embedded) {
      return true
    }

    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
      })
    } catch {}

    setSession(null)
    setPermissions(null)
    setIsAuthenticated(false)
    setAuthError('')
    setSecondFactorChallenge(null)
    setIsChecking(false)
    return true
  }, [])

  const value = useMemo(() => ({
    isAuthenticated,
    isChecking,
    authError,
    permissions,
    session,
    secondFactorChallenge,
    role: session?.role || '',
    capabilities: Array.isArray(session?.capabilities) ? session.capabilities : [],
    login,
    completeSecondFactor,
    passkeyLogin,
    logout,
    refreshAuth,
  }), [
    authError,
    completeSecondFactor,
    isAuthenticated,
    isChecking,
    login,
    logout,
    passkeyLogin,
    permissions,
    refreshAuth,
    secondFactorChallenge,
    session,
  ])

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider')
  return ctx
}

async function safeJson(res) {
  try {
    return await res.json()
  } catch {
    return null
  }
}
