import { useEffect, useMemo, useState } from 'react'
import { AdminFrame } from './AdminRail'
import { useAdminAuth } from './AdminAuthContext'
import { createAdminUserAccount, deleteAdminUserAccount, fetchAdminUsers, updateAdminUserAccount } from '../lib/adminUsersApi'

const ROLES = ['owner', 'admin', 'editor', 'contributor', 'viewer']
const ROLE_HELP = {
  owner: 'Full control, including owners and account security.',
  admin: 'Editorial control plus users, site settings, analytics, and system tools.',
  editor: 'Create, edit, review, publish, schedule, and manage media. No user or site administration.',
  contributor: 'Create and edit their own unpublished work, manage their own media, submit for review, and participate in editorial comments. Cannot publish.',
  viewer: 'Read-only admin access and analytics.',
}
const EMPTY_FORM = { email: '', displayName: '', password: '', role: 'contributor', status: 'active' }

export function AdminUsersPage() {
  const { session, refreshAuth } = useAdminAuth()
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState('')
  const [passwords, setPasswords] = useState({})
  const currentRole = session?.role || ''
  const currentUserId = session?.user?.id || ''
  const isOwner = currentRole === 'owner'
  const ownerCount = useMemo(() => users.filter((user) => user.role === 'owner' && user.status === 'active').length, [users])

  async function load() {
    try { setState('loading'); setError(''); const data = await fetchAdminUsers(); setUsers(Array.isArray(data.items) ? data.items : []); setState('loaded') }
    catch (err) { setState('error'); setError(String(err?.message || err)) }
  }
  useEffect(() => { load() }, [])

  async function createUser(event) {
    event.preventDefault()
    try { setBusyId('new'); setError(''); setNotice(''); const data = await createAdminUserAccount(form); setUsers((current) => [...current.filter((item) => item.id !== data.user.id), data.user]); setForm(EMPTY_FORM); setNotice(`Account created for ${data.user.email}.`) }
    catch (err) { setError(String(err?.message || err)) } finally { setBusyId('') }
  }
  function patchLocal(id, field, value) { setUsers((current) => current.map((user) => user.id === id ? { ...user, [field]: value } : user)) }
  async function saveUser(user) {
    try {
      setBusyId(user.id); setError(''); setNotice('')
      const password = String(passwords[user.id] || '')
      const data = await updateAdminUserAccount({ id: user.id, email: user.email, displayName: user.displayName, role: user.role, status: user.status, ...(password ? { password } : {}) })
      setUsers((current) => current.map((item) => item.id === data.user.id ? data.user : item)); setPasswords((current) => ({ ...current, [user.id]: '' })); setNotice(`Saved ${data.user.email}.`); await refreshAuth()
    } catch (err) { setError(String(err?.message || err)); await load() } finally { setBusyId('') }
  }
  async function removeUser(user) {
    if (!window.confirm(`Delete the Colophon account for ${user.email}? This does not delete their authored content.`)) return
    try { setBusyId(user.id); setError(''); setNotice(''); await deleteAdminUserAccount(user.id); setUsers((current) => current.filter((item) => item.id !== user.id)); setNotice(`Deleted ${user.email}.`) }
    catch (err) { setError(String(err?.message || err)) } finally { setBusyId('') }
  }

  return <AdminFrame><main className="page wp-admin-screen admin-users-page">
    <div className="wp-screen-header"><div><h1>Users & Access</h1><p className="description">Accounts use server-enforced role capabilities. Contributor ownership is tracked separately from the public byline.</p></div></div>
    {error ? <div className="notice notice-error" role="alert"><p><strong>User operation failed:</strong> {error}</p></div> : null}
    {notice ? <div className="notice notice-success" role="status"><p>{notice}</p></div> : null}
    <section className="newsroom-stat-grid" aria-label="Account summary">
      <article className="review-summary-card"><div className="review-summary-card__eyebrow">accounts</div><strong>{users.length}</strong><span>provisioned identities</span></article>
      <article className="review-summary-card"><div className="review-summary-card__eyebrow">active owners</div><strong>{ownerCount}</strong><span>final owner is protected</span></article>
      <article className="review-summary-card"><div className="review-summary-card__eyebrow">your role</div><strong>{currentRole || '—'}</strong><span>{session?.user?.email || 'current session'}</span></article>
    </section>
    <section className="wp-meta-box"><h2>Create account</h2><p className="description">Contributor is the normal writing role. Editors are the smaller group allowed to make review decisions and publish.</p>
      <form className="wp-settings-form admin-users-create" onSubmit={createUser}>
        <label><span>Email</span><input type="email" autoComplete="off" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} required /></label>
        <label><span>Display name</span><input value={form.displayName} onChange={(e) => setForm((c) => ({ ...c, displayName: e.target.value }))} /></label>
        <label><span>Initial password</span><input type="password" autoComplete="new-password" minLength={12} value={form.password} onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))} required /><small>Minimum 12 characters.</small></label>
        <label><span>Role</span><select value={form.role} onChange={(e) => setForm((c) => ({ ...c, role: e.target.value }))}>{ROLES.filter((role) => isOwner || role !== 'owner').map((role) => <option key={role} value={role}>{role}</option>)}</select><small>{ROLE_HELP[form.role]}</small></label>
        <p><button className="button button--primary" type="submit" disabled={busyId === 'new'}>{busyId === 'new' ? 'Creating…' : 'Create account'}</button></p>
      </form>
    </section>
    <section className="wp-meta-box"><h2>Accounts</h2>{state === 'loading' ? <p className="description">Loading accounts…</p> : null}{state === 'loaded' && !users.length ? <p className="description">No individual accounts exist yet.</p> : null}
      {users.length ? <div className="content-table-wrap"><table className="content-table wp-posts-table admin-users-table"><thead><tr><th>User</th><th>Role</th><th>Status</th><th>New password</th><th>Last login</th><th>Actions</th></tr></thead><tbody>
        {users.map((user) => { const isProtectedOwner = user.role === 'owner' && !isOwner; return <tr key={user.id}>
          <td><input aria-label={`Display name for ${user.email}`} value={user.displayName} onChange={(e) => patchLocal(user.id, 'displayName', e.target.value)} disabled={isProtectedOwner} /><input aria-label={`Email for ${user.email}`} type="email" value={user.email} onChange={(e) => patchLocal(user.id, 'email', e.target.value)} disabled={isProtectedOwner} />{user.id === currentUserId ? <small className="description">current account</small> : null}</td>
          <td><select aria-label={`Role for ${user.email}`} value={user.role} onChange={(e) => patchLocal(user.id, 'role', e.target.value)} disabled={isProtectedOwner}>{ROLES.filter((role) => isOwner || role !== 'owner').map((role) => <option key={role} value={role}>{role}</option>)}</select><small className="description">{ROLE_HELP[user.role]}</small></td>
          <td><select aria-label={`Status for ${user.email}`} value={user.status} onChange={(e) => patchLocal(user.id, 'status', e.target.value)} disabled={isProtectedOwner}><option value="active">active</option><option value="disabled">disabled</option></select></td>
          <td><input aria-label={`New password for ${user.email}`} type="password" autoComplete="new-password" minLength={12} value={passwords[user.id] || ''} placeholder="leave unchanged" onChange={(e) => setPasswords((c) => ({ ...c, [user.id]: e.target.value }))} disabled={isProtectedOwner} /></td>
          <td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'never'}</td>
          <td><div className="wp-row-actions"><button className="button" type="button" onClick={() => saveUser(user)} disabled={busyId === user.id || isProtectedOwner}>{busyId === user.id ? 'Saving…' : 'Save'}</button><button className="button button-link-delete" type="button" onClick={() => removeUser(user)} disabled={busyId === user.id || isProtectedOwner || user.id === currentUserId}>Delete</button></div></td>
        </tr> })}
      </tbody></table></div> : null}
    </section>
    <section className="wp-meta-box"><h2>Role boundaries</h2><dl className="admin-role-boundaries">{ROLES.map((role) => <div key={role}><dt>{role}</dt><dd>{ROLE_HELP[role]}</dd></div>)}</dl></section>
  </main></AdminFrame>
}
