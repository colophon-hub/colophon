import { getBoundDb } from './_lib/database.js'
import { listNativeEntries } from './_lib/nativePublicContent.js'
import { fetchPodcastFeed } from './_lib/podcastRssImport.js'
import { findPodcastShow, upsertPodcastShow } from './_lib/podcastSettings.js'
import { permissionHasCapability, resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { ensurePodcastHostingTables, migrateRemotePodcastAudio, migrateRemotePodcastArtwork, podcastDownloadSummary, publishNativeEpisode } from './_lib/podcastHosting.js'
import { queueEpisodeDistribution, listDistributionJobs } from './_lib/podcastDistribution.js'

const MIGRATION_BATCH = 25

export async function onRequestGet(context) {
  const permission = await resolvePublicSitePermission(context)
  if (!permissionHasCapability(permission, 'publishing:write') && !permission.canEdit) return json({ ok:false,error:'publishing permission required' },403)
  const db=getBoundDb(context); if(!db)return json({ok:false,error:'BF_DB binding is required'},503)
  await ensurePodcastHostingTables(db)
  const url=new URL(context.request.url), showId=String(url.searchParams.get('showId')||'').trim()
  const jobs=showId ? await db.prepare('SELECT * FROM podcast_hosting_jobs WHERE show_id=? ORDER BY updated_at DESC LIMIT 20').bind(showId).all() : {results:[]}
  const analytics=await podcastDownloadSummary(db,showId)
  const distribution=await listDistributionJobs(db,{showId})
  return json({ok:true,jobs:jobs.results||[],analytics,distribution})
}

export async function onRequestPost(context) {
  const permission=await resolvePublicSitePermission(context)
  if(!permissionHasCapability(permission,'publishing:write')&&!permission.canEdit)return json({ok:false,error:'publishing permission required'},403)
  const db=getBoundDb(context);if(!db)return json({ok:false,error:'BF_DB binding is required'},503)
  await ensurePodcastHostingTables(db)
  try{
    const body=await context.request.json(), action=String(body.action||'').trim(), showId=String(body.showId||'').trim()
    if(!showId)return json({ok:false,error:'showId is required'},400)
    const show=await findPodcastShow(db,showId);if(!show)return json({ok:false,error:'podcast show not found'},404)
    if(action==='publish-episode'){
      const episode=await publishNativeEpisode(db,{showId,input:body.episode||{},requestUrl:context.request.url})
      const destinations=Array.isArray(body.destinations)?body.destinations:['website','rss']
      await queueEpisodeDistribution(db,episode,show,destinations)
      return json({ok:true,episode,distribution:await listDistributionJobs(db,{episodeId:episode.id})})
    }
    if(action==='start-migration'){
      const source=String(body.feedUrl||show.sourceFeedUrl||'').trim();if(!source)return json({ok:false,error:'source feed URL is required'},400)
      const feed=await fetchPodcastFeed(source), id=`podcast-migration-${crypto.randomUUID()}`
      await db.prepare(`INSERT INTO podcast_hosting_jobs(id,show_id,source_feed_url,state,cursor,total,migrated,failed,errors_json) VALUES(?,?,?,'queued',0,?,0,0,'[]')`).bind(id,show.id,feed.sourceUrl,feed.parsed.episodes.length).run()
      let defaultCoverArt=show.defaultCoverArt
      if(feed.parsed.podcast?.imageUrl){
        try{const artwork=await migrateRemotePodcastArtwork(db,{showId:show.id,imageUrl:feed.parsed.podcast.imageUrl,requestUrl:context.request.url,env:context.env});defaultCoverArt=artwork.url}catch{/* retain remote artwork if migration fails; audio migration can still proceed */}
      }
      await upsertPodcastShow(db,{...show,defaultCoverArt,migrationState:'queued',legacyFeedUrl:feed.sourceUrl},{showId:show.id})
      return json({ok:true,jobId:id,total:feed.parsed.episodes.length,artworkUrl:defaultCoverArt})
    }
    if(action==='migrate-batch') return json(await migrateBatch(db,show,body.jobId,context))
    if(action==='make-native'){
      const result=await upsertPodcastShow(db,{...show,hostingMode:'native',nativeSince:show.nativeSince||new Date().toISOString(),migrationState:show.migrationState==='failed'?'failed':'complete',legacyFeedUrl:show.legacyFeedUrl||show.sourceFeedUrl},{showId:show.id})
      return json({ok:true,show:result.show})
    }
    if(action==='directory-redirect'){
      const result=await upsertPodcastShow(db,{...show,directoryRedirectUrl:String(body.url||'').trim()},{showId:show.id});return json({ok:true,show:result.show})
    }
    return json({ok:false,error:'unsupported podcast hosting action'},400)
  }catch(error){return json({ok:false,error:String(error?.message||error)},Number(error?.status)||500)}
}

async function migrateBatch(db,show,jobId,context){
  const job=await db.prepare('SELECT * FROM podcast_hosting_jobs WHERE id=? AND show_id=? LIMIT 1').bind(String(jobId||''),show.id).first()
  if(!job)return {ok:false,error:'migration job not found'}
  if(['complete','paused'].includes(job.state))return {ok:true,job}
  const feed=await fetchPodcastFeed(job.source_feed_url), episodes=feed.parsed.episodes||[], start=Number(job.cursor||0), batch=episodes.slice(start,start+MIGRATION_BATCH)
  const existing=await listNativeEntries(db,{includeFuture:true}), errors=safeJson(job.errors_json,[]);let migrated=Number(job.migrated||0),failed=Number(job.failed||0)
  await db.prepare("UPDATE podcast_hosting_jobs SET state='running',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(job.id).run()
  for(const episode of batch){
    try{
      if(!episode.enclosureUrl)throw new Error('episode has no enclosure URL')
      const match=existing.find((item)=>item.contentType==='podcast'&&String(item.sourceExternalId||'')===String(episode.guid||'')&&(item.podcastShowId===show.id||item.sourceUrl===show.sourceFeedUrl))
      const episodeId=match?.id||`podcast-migrated-${await shortHash(`${show.id}\n${episode.guid}`)}`.slice(0,48)
      const audio=await migrateRemotePodcastAudio(db,{showId:show.id,episodeId,enclosureUrl:episode.enclosureUrl,mimeType:episode.enclosureType,size:episode.enclosureLength,requestUrl:context.request.url,env:context.env})
      await publishNativeEpisode(db,{showId:show.id,input:{id:episodeId,guid:episode.guid,title:episode.title,summary:episode.excerpt,descriptionHtml:episode.descriptionHtml,author:episode.author,publishedAt:episode.publishedAt,duration:episode.duration,episodeNumber:episode.episodeNumber,season:episode.season,coverImage:episode.imageUrl,audio},requestUrl:context.request.url})
      migrated+=1
    }catch(error){failed+=1;errors.push({guid:String(episode.guid||''),title:String(episode.title||''),error:String(error?.message||error)})}
  }
  const cursor=start+batch.length,complete=cursor>=episodes.length,state=complete?'complete':'queued'
  await db.prepare('UPDATE podcast_hosting_jobs SET state=?,cursor=?,total=?,migrated=?,failed=?,errors_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(state,cursor,episodes.length,migrated,failed,JSON.stringify(errors.slice(-100)),job.id).run()
  if(complete)await upsertPodcastShow(db,{...show,hostingMode:'native',nativeSince:show.nativeSince||new Date().toISOString(),migrationState:failed?'failed':'complete',legacyFeedUrl:job.source_feed_url},{showId:show.id})
  else await upsertPodcastShow(db,{...show,migrationState:'running',legacyFeedUrl:job.source_feed_url},{showId:show.id})
  return {ok:true,job:{...job,state,cursor,total:episodes.length,migrated,failed,errors},remaining:Math.max(0,episodes.length-cursor)}
}
function safeJson(value,fallback){try{return JSON.parse(value||'')||fallback}catch{return fallback}}
async function shortHash(value){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function json(value,status=200){return new Response(JSON.stringify(value,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
