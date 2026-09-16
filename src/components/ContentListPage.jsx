import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPieces } from '../lib/pieces'
import { createNativeEntryFromImportedPiece, deleteNativeEntry, loadNativeCollection, slugify, upsertNativeEntry } from '../lib/nativePublicContent'
import { AdminFrame } from './AdminRail'
import { WpAdminNotices, useAdminNotices } from './WpAdminNotices'
import { adminRoutes } from '../routing/routes'

function normalizeTermList(value) {
  if (Array.isArray(value)) return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))]
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getBucket(item) {
  if (item.status === 'trash') return 'trash'
  if (item.status === 'archived' || item.workflowState === 'archived') return 'archived'
  if (item.workflowState === 'review' || item.workflowState === 'in_review') return 'review'
  if (item.status === 'scheduled' || item.workflowState === 'scheduled' || item.scheduledFor) return 'scheduled'
  if (item.status === 'published' || item.workflowState === 'published') return 'published'
  return 'drafts'
}

const TABS = ['all', 'drafts', 'review', 'scheduled', 'published', 'archived', 'trash']

export function ContentListPage() {
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('all')
  const [selectedIds, setSelectedIds] = useState([])
  const [quickEditId, setQuickEditId] = useState('')
  const [bulkAction, setBulkAction] = useState('')
  const [quickEdit, setQuickEdit] = useState({ title: '', slug: '', status: 'draft', tags: '', categories: '', collections: '' })
  const { pushNotice } = useAdminNotices()

  useEffect(() => {
    loadNativeCollection({ includeFuture: 1 }).then((loaded) => setItems(Array.isArray(loaded) ? loaded : []))
  }, [])

  const allRows = useMemo(() => {
    const nativeSlugKeys = new Set(items.map((item) => String(item.slug || '').toLowerCase()).filter(Boolean))
    const nativeSourceKeys = new Set(items.map((item) => String(item.sourcePostId || item.sourceExternalId || '').toLowerCase()).filter(Boolean))
    const importedRows = getPieces()
      .filter((piece) => {
        const slugKey = String(piece.slug || '').toLowerCase()
        const sourceKey = String(piece.sourcePostId || piece.id || '').toLowerCase()
        return !nativeSlugKeys.has(slugKey) && !nativeSourceKeys.has(sourceKey)
      })
      .map((piece) => ({
        ...createNativeEntryFromImportedPiece(piece),
        isImportedArchive: true,
        importSlug: piece.slug,
      }))

    return [...items, ...importedRows]
  }, [items])

  const categories = useMemo(() => [...new Set(allRows.flatMap((item) => item.projects || item.categories || []))].filter(Boolean), [allRows])
  const [categoryFilter, setCategoryFilter] = useState('all')

  const visible = useMemo(() => {
    const q = query.toLowerCase()
    return allRows.filter((item) => {
      const bucket = getBucket(item)
      if (tab === 'all' && bucket === 'trash') return false
      if (tab !== 'all' && bucket !== tab) return false
      if (categoryFilter !== 'all' && !(item.projects || item.categories || []).includes(categoryFilter)) return false
      return !q || [
        item.title,
        item.slug,
        item.author,
        item.excerpt,
        item.body,
        item.bodyHtml,
        item.contentType,
        item.type,
        item.format,
        item.collection,
        ...(item.collections || []),
        ...(item.projects || []),
        ...(item.categories || []),
        ...(item.tags || []),
      ].join(' ').toLowerCase().includes(q)
    })
  }, [allRows, tab, query, categoryFilter])
  const selectableVisible = useMemo(() => visible.filter((item) => !item.isImportedArchive), [visible])
  const trashCount = useMemo(() => items.filter((item) => item.status === 'trash').length, [items])

  async function saveQuickEdit(id) {
    const existing = items.find((item) => item.id === id)
    if (!existing) return
    const parsedCategories = normalizeTermList(quickEdit.categories)
    const nextItem = {
      ...existing,
      title: quickEdit.title,
      slug: slugify(quickEdit.slug || quickEdit.title),
      status: quickEdit.status,
      tags: normalizeTermList(quickEdit.tags),
      collections: normalizeTermList(quickEdit.collections),
      categories: parsedCategories,
      projects: parsedCategories,
    }
    const next = await upsertNativeEntry(items, nextItem, 'quick edit')
    setItems(next)
    setQuickEditId('')
    pushNotice('Post saved.', 'success')
  }

  async function permanentlyDelete(id) {
    const next = await deleteNativeEntry(items, id)
    setItems(next)
    setSelectedIds((current) => current.filter((value) => value !== id))
    pushNotice('Post deleted permanently.', 'success')
  }

  async function emptyTrash() {
    let next = items
    const trashIds = next.filter((item) => item.status === 'trash').map((item) => item.id)
    for (const id of trashIds) next = await deleteNativeEntry(next, id)
    setItems(next)
    setSelectedIds([])
    pushNotice(trashIds.length ? 'Trash emptied.' : 'Trash is already empty.', 'success')
  }

  function formatPostDate(value) {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isFinite(date.getTime()) ? date.toLocaleDateString() : '—'
  }

  async function applyBulkAction() {
    if (!bulkAction) return
    if (bulkAction !== 'empty-trash' && !selectedIds.length) return
    try {
      if (bulkAction === 'trash') {
        let next = items
        for (const id of selectedIds) {
          const row = next.find((item) => item.id === id)
          if (!row) continue
          next = await upsertNativeEntry(next, { ...row, status: 'trash', workflowState: 'trash' }, 'bulk trash')
        }
        setItems(next)
        pushNotice('Selected posts moved to Trash.', 'warning')
      }
      if (bulkAction === 'restore') {
        let next = items
        for (const id of selectedIds) {
          const row = next.find((item) => item.id === id)
          if (!row) continue
          next = await upsertNativeEntry(next, { ...row, status: 'draft', workflowState: 'draft' }, 'bulk restore')
        }
        setItems(next)
        pushNotice('Selected posts restored.', 'success')
      }
      if (bulkAction === 'empty-trash') await emptyTrash()
      setSelectedIds([])
      setBulkAction('')
    } catch (error) {
      pushNotice(`Bulk action failed: ${String(error?.message || error)}`, 'error')
    }
  }

  return (
    <AdminFrame>
      <main className="page wp-admin-screen">
        <div className="wp-screen-header">
          <h1>Posts</h1>
          <Link className="button button--primary" to={adminRoutes.addNew}>Add New</Link>
        </div>
        <WpAdminNotices />

        <section className="wp-meta-box">
          <div className="wp-list-filters">
            <div className="wp-view-tabs">
              {TABS.map((value) => (
                <button key={value} type="button" className={`wp-view-tab${tab === value ? ' is-active' : ''}`} onClick={() => setTab(value)}>{value[0].toUpperCase() + value.slice(1)}</button>
              ))}
            </div>
            <div className="wp-list-controls">
              <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}>
                <option value="">Bulk actions</option>
                <option value="trash">Move to Trash</option>
                <option value="restore">Restore from Trash</option>
                <option value="empty-trash">Empty Trash</option>
              </select>
              <button type="button" className="button" onClick={applyBulkAction}>Apply</button>
              {tab === 'trash' ? (
                <button type="button" className="button" onClick={() => emptyTrash().catch((error) => pushNotice(`Empty Trash failed: ${String(error?.message || error)}`, 'error'))} disabled={trashCount === 0}>Empty Trash</button>
              ) : null}
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="all">All categories</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Posts" />
            </div>
          </div>

          <table className="content-table wp-posts-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={selectedIds.length === selectableVisible.length && selectableVisible.length > 0} onChange={(e) => setSelectedIds(e.target.checked ? selectableVisible.map((item) => item.id) : [])} /></th>
                <th>Title</th>
                <th>Status</th>
                <th>Author</th>
                <th>Categories</th>
                <th>Tags</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <Fragment key={item.id}>
                  <tr key={item.id}>
                    <td>{item.isImportedArchive ? null : <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(e) => setSelectedIds((current) => e.target.checked ? [...new Set([...current, item.id])] : current.filter((id) => id !== item.id))} />}</td>
                    <td>
                      <strong className="content-table__title">{item.title || 'Untitled'}</strong>
                      <div className="wp-row-actions">
                        <Link to={item.isImportedArchive ? `${adminRoutes.nativeBridge}?import=${item.importSlug || item.slug}` : `${adminRoutes.nativeBridge}?edit=${item.id}`}>Edit</Link>
                        {item.isImportedArchive ? null : <button type="button" onClick={() => { setQuickEditId(item.id); setQuickEdit({ title: item.title || '', slug: item.slug || '', status: item.status || 'draft', tags: (item.tags || []).join(', '), categories: (item.categories || item.projects || []).join(', '), collections: (item.collections || []).join(', ') }) }}>Quick Edit</button>}
                        {item.status === 'published' ? <Link to={`/post/${item.slug}`}>View</Link> : null}
                        {item.isImportedArchive ? <span>Imported archive</span> : item.status !== 'trash' ? (
                          <button type="button" onClick={async () => {
                            try {
                              setItems(await upsertNativeEntry(items, { ...item, status: 'trash', workflowState: 'trash' }, 'trash'))
                              pushNotice('Post moved to Trash.', 'warning')
                            } catch (error) {
                              pushNotice(`Trash failed: ${String(error?.message || error)}`, 'error')
                            }
                          }}>Trash</button>
                        ) : (
                          <>
                            <button type="button" onClick={async () => {
                              try {
                                setItems(await upsertNativeEntry(items, { ...item, status: 'draft', workflowState: 'draft' }, 'restore'))
                                pushNotice('Post restored.', 'success')
                              } catch (error) {
                                pushNotice(`Restore failed: ${String(error?.message || error)}`, 'error')
                              }
                            }}>Restore</button>
                            <button type="button" className="wp-row-action-delete" onClick={() => permanentlyDelete(item.id).catch((error) => pushNotice(`Delete failed: ${String(error?.message || error)}`, 'error'))}>Delete Permanently</button>
                          </>
                        )}
                      </div>
                    </td>
                    <td>{item.isImportedArchive ? 'published / imported' : item.status || item.workflowState || 'draft'}</td>
                    <td>{item.author || 'colophon-hub'}</td>
                    <td>{(item.projects || item.categories || ['Uncategorized']).join(', ')}</td>
                    <td>{(item.tags || []).join(', ') || '—'}</td>
                    <td>{formatPostDate(item.publishedAt || item.updatedAt)}</td>
                  </tr>
                  {quickEditId === item.id ? (
                    <tr className="wp-quick-edit-row" key={`${item.id}-qe`}>
                      <td colSpan={7}>
                        <div className="wp-quick-edit">
                          <input value={quickEdit.title} onChange={(e) => setQuickEdit((c) => ({ ...c, title: e.target.value }))} placeholder="Title" />
                          <input value={quickEdit.slug} onChange={(e) => setQuickEdit((c) => ({ ...c, slug: e.target.value }))} placeholder="Slug" />
                          <select value={quickEdit.status} onChange={(e) => setQuickEdit((c) => ({ ...c, status: e.target.value }))}><option value="draft">Draft</option><option value="published">Published</option><option value="scheduled">Scheduled</option><option value="archived">Archived</option><option value="trash">Trash</option></select>
                          <input value={quickEdit.tags} onChange={(e) => setQuickEdit((c) => ({ ...c, tags: e.target.value }))} placeholder="Tags: tag1, tag2" />
                          <input value={quickEdit.categories} onChange={(e) => setQuickEdit((c) => ({ ...c, categories: e.target.value }))} placeholder="Categories: cat1, cat2" />
                          <input value={quickEdit.collections} onChange={(e) => setQuickEdit((c) => ({ ...c, collections: e.target.value }))} placeholder="Collections: collection-one, collection-two" />
                          <button type="button" className="button button--primary" onClick={() => saveQuickEdit(item.id)}>Update</button>
                          <button type="button" className="button" onClick={() => setQuickEditId('')}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </AdminFrame>
  )
}
