import { useEffect, useState } from 'react'
import { isServerRuntime } from '../lib/runtime'

export function PodcastHostingPanel({ show, onShowChange }) {
  const [status, setStatus] = useState(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)
  const [jobId, setJobId] = useState('')
  const [audio, setAudio] = useState(null)
  const [episode, setEpisode] = useState({ title: '', guid: '', publishedAt: '', summary: '', duration: '', episodeNumber: '', season: '' })
  const [destinations, setDestinations] = useState({ youtube: false, peertube: false })
  const [redirectUrl, setRedirectUrl] = useState(show?.directoryRedirectUrl || '')

  useEffect(() => { if (show?.id && isServerRuntime()) refresh() }, [show?.id])
  useEffect(() => { setRedirectUrl(show?.directoryRedirectUrl || '') }, [show?.directoryRedirectUrl])

  async function api(path, options = {}) {
    const response = await fetch(path, { credentials: 'same-origin', ...options })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || data.ok === false) throw new Error(data.error || `Request failed (${response.status})`)
    return data
  }
  async function refresh() {
    try { setStatus(await api(`/api/podcast-hosting?showId=${encodeURIComponent(show.id)}`)) } catch (cause) { setError(String(cause?.message || cause)) }
  }
  async function run(action, body = {}) {
    setWorking(true); setError(''); setNotice('')
    try {
      const data = await api('/api/podcast-hosting', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, showId: show.id, ...body }) })
      if (data.show) onShowChange?.(data.show)
      setNotice(action === 'migrate-batch' ? `Migration batch complete. ${data.remaining ?? 0} episodes remain.` : 'Podcast hosting change saved.')
      await refresh(); return data
    } catch (cause) { setError(String(cause?.message || cause)); return null } finally { setWorking(false) }
  }
  async function startMigration() {
    const data = await run('start-migration', { feedUrl: show.sourceFeedUrl })
    if (data?.jobId) setJobId(data.jobId)
  }
  async function migrateBatch() {
    const active = jobId || status?.jobs?.find((job) => !['complete', 'paused'].includes(job.state))?.id
    if (!active) return setError('Start a migration first.')
    await run('migrate-batch', { jobId: active })
  }
  async function publishEpisode(event) {
    event.preventDefault()
    if (!audio) return setError('Choose an audio file first.')
    setWorking(true); setError(''); setNotice('')
    try {
      const form = new FormData(); form.set('showId', show.id); form.set('file', audio)
      const upload = await api('/api/podcast-media', { method: 'POST', body: form })
      const selected = ['website', 'rss', ...(destinations.youtube ? ['youtube'] : []), ...(destinations.peertube ? ['peertube'] : [])]
      const data = await api('/api/podcast-hosting', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'publish-episode', showId: show.id, episode: { ...episode, audio: upload.asset }, destinations: selected }) })
      setNotice(`Published ${data.episode?.title || 'episode'} to the Colophon site and RSS feed.`)
      setAudio(null); setEpisode({ title: '', guid: '', publishedAt: '', summary: '', duration: '', episodeNumber: '', season: '' }); await refresh()
    } catch (cause) { setError(String(cause?.message || cause)) } finally { setWorking(false) }
  }
  async function processDistribution() {
    setWorking(true); setError('')
    try { const data = await api('/api/episode-worker', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ showId: show.id, limit: 10 }) }); setNotice(`Processed ${data.processed || 0} external publishing job(s).`); await refresh() } catch (cause) { setError(String(cause?.message || cause)) } finally { setWorking(false) }
  }
  async function refreshExternalSource() {
    setWorking(true); setError('')
    try { const data = await api('/api/podcast-source-refresh', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ showId: show.id }) }); setNotice(`Source refresh checked ${data.checked || 0} show(s).`); await refresh() } catch (cause) { setError(String(cause?.message || cause)) } finally { setWorking(false) }
  }
  if (!show?.id) return null
  if (!isServerRuntime()) return <section className="wp-meta-box"><h2>Native podcast hosting</h2><p className="description">First-party audio hosting, migration, measured delivery, and external distribution require a server installation with database and media-storage bindings. Local/browser installations keep podcast metadata and imported content portable, but do not pretend a laptop is a public media CDN.</p></section>
  const activeJob = status?.jobs?.[0]
  return <>
    <section className="wp-meta-box"><h2>Native podcast hosting</h2><p className="description">Colophon can become the canonical host for this show. Imported GUIDs and original publication dates are preserved, audio is delivered with byte-range support, and only aggregate daily downloads/bytes are stored.</p>
      <p><strong>Hosting mode:</strong> {show.hostingMode === 'native' ? 'Native Colophon hosting' : 'External RSS source'}{show.nativeSince ? ` since ${new Date(show.nativeSince).toLocaleDateString()}` : ''}</p>
      {show.hostingMode !== 'native' ? <div className="review-card__actions"><button className="button" type="button" onClick={startMigration} disabled={working || !show.sourceFeedUrl}>Start archive migration</button><button className="button" type="button" onClick={migrateBatch} disabled={working || !(jobId || activeJob)}>Migrate next 25</button><button className="button" type="button" onClick={refreshExternalSource} disabled={working || !show.sourceFeedUrl}>Refresh external source</button><button className="button" type="button" onClick={() => run('make-native')} disabled={working}>Switch to native now</button></div> : null}
      <div className="wp-settings-form"><label><span>Legacy-host redirect / subscriber-transfer URL</span><input type="url" value={redirectUrl} onChange={(event) => setRedirectUrl(event.target.value)} placeholder={show.rssFeedUrl || 'https://publisher.example/feeds/podcasts/show.xml'} /><small>Store the URL you give the old host for its 301 or podcast new-feed redirect. Colophon cannot force a third-party host to redirect, but keeps the cutover target with the show.</small></label><button className="button" type="button" disabled={working} onClick={() => run('directory-redirect', { url: redirectUrl || show.rssFeedUrl })}>Save transfer target</button></div>
      {activeJob ? <p className="description">Migration: {activeJob.state} · {activeJob.migrated}/{activeJob.total} migrated · {activeJob.failed} failed · cursor {activeJob.cursor}</p> : null}
      {error ? <div className="notice notice-error" role="alert"><p>{error}</p></div> : null}{notice ? <div className="notice notice-success" role="status"><p>{notice}</p></div> : null}
    </section>
    <section className="wp-meta-box"><h2>Publish a native episode</h2><form className="wp-settings-form" onSubmit={publishEpisode}><label><span>Audio file</span><input type="file" accept="audio/*" onChange={(event) => setAudio(event.target.files?.[0] || null)} /></label><label><span>Episode title</span><input required value={episode.title} onChange={(event) => setEpisode((current) => ({ ...current, title: event.target.value }))} /></label><label><span>GUID (optional)</span><input value={episode.guid} onChange={(event) => setEpisode((current) => ({ ...current, guid: event.target.value }))} /><small>Leave blank for a stable Colophon GUID. Migrated episodes keep their existing GUID.</small></label><label><span>Original publication date</span><input type="datetime-local" value={episode.publishedAt} onChange={(event) => setEpisode((current) => ({ ...current, publishedAt: event.target.value }))} /></label><label><span>Summary</span><textarea rows="4" value={episode.summary} onChange={(event) => setEpisode((current) => ({ ...current, summary: event.target.value }))} /></label><div className="investigation-admin__two"><label><span>Duration</span><input value={episode.duration} onChange={(event) => setEpisode((current) => ({ ...current, duration: event.target.value }))} /></label><label><span>Episode number</span><input value={episode.episodeNumber} onChange={(event) => setEpisode((current) => ({ ...current, episodeNumber: event.target.value }))} /></label></div><label><span><input type="checkbox" checked={destinations.youtube} onChange={(event) => setDestinations((current) => ({ ...current, youtube: event.target.checked }))} /> Queue YouTube adapter</span></label><label><span><input type="checkbox" checked={destinations.peertube} onChange={(event) => setDestinations((current) => ({ ...current, peertube: event.target.checked }))} /> Queue PeerTube adapter</span></label><button className="button button--primary" type="submit" disabled={working}>Upload and publish episode</button></form></section>
    <section className="wp-meta-box"><h2>Delivery and distribution</h2><p><strong>Aggregate downloads:</strong> {status?.analytics?.totals?.downloads || 0} · <strong>Bytes delivered:</strong> {formatBytes(status?.analytics?.totals?.bytes || 0)}</p><div className="review-card__actions"><button className="button" type="button" onClick={processDistribution} disabled={working}>Process queued external destinations</button><button className="button" type="button" onClick={refresh} disabled={working}>Refresh status</button></div>{(status?.distribution || []).slice(0,20).map((job) => <p className="description" key={job.id}><strong>{job.destination}</strong> · {job.state}{job.remote_url ? ` · ${job.remote_url}` : ''}{job.error ? ` · ${job.error}` : ''}</p>)}</section>
  </>
}
function formatBytes(value){const bytes=Number(value||0);if(bytes<1024)return `${bytes} B`;if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} KB`;if(bytes<1024*1024*1024)return `${(bytes/1024/1024).toFixed(1)} MB`;return `${(bytes/1024/1024/1024).toFixed(1)} GB`}
