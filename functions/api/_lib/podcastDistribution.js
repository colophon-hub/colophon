import { ensurePodcastHostingTables } from './podcastHosting.js'
import { getExistingNativeEntry } from './nativePublicContent.js'
import { findPodcastShow } from './podcastSettings.js'

const DESTINATIONS = new Set(['website','rss','youtube','peertube'])
const RETRYABLE_STATES = new Set(['failed','retrying','queued'])

export async function queueEpisodeDistribution(db, episode, show, destinations = ['website','rss']) {
  await ensurePodcastHostingTables(db)
  const unique = [...new Set(destinations.map((value)=>String(value||'').toLowerCase()).filter((value)=>DESTINATIONS.has(value)))]
  for(const destination of unique){
    const local = destination === 'website' || destination === 'rss'
    const remoteUrl = destination === 'website' ? `/post/${episode.slug}` : destination === 'rss' ? show.rssFeedUrl : ''
    await db.prepare(`INSERT INTO podcast_distribution_jobs(id,episode_id,show_id,destination,state,attempts,remote_id,remote_url,metadata_json,error,updated_at)
      VALUES(?,?,?,?,?,0,'',?,'{}','',CURRENT_TIMESTAMP)
      ON CONFLICT(episode_id,destination) DO UPDATE SET show_id=excluded.show_id,state=CASE WHEN podcast_distribution_jobs.state='published' THEN 'published' ELSE excluded.state END,remote_url=CASE WHEN podcast_distribution_jobs.remote_url<>'' THEN podcast_distribution_jobs.remote_url ELSE excluded.remote_url END,error='',updated_at=CURRENT_TIMESTAMP`)
      .bind(`distribution-${episode.id}-${destination}`,episode.id,show.id,destination,local?'published':'queued',remoteUrl).run()
  }
  return listDistributionJobs(db,{episodeId:episode.id})
}

export async function listDistributionJobs(db, options = {}) {
  await ensurePodcastHostingTables(db)
  const clauses=[],binds=[]
  if(options.showId){clauses.push('show_id=?');binds.push(options.showId)}
  if(options.episodeId){clauses.push('episode_id=?');binds.push(options.episodeId)}
  const where=clauses.length?`WHERE ${clauses.join(' AND ')}`:''
  const stmt=db.prepare(`SELECT * FROM podcast_distribution_jobs ${where} ORDER BY updated_at DESC LIMIT 250`)
  const rows=(binds.length?await stmt.bind(...binds).all():await stmt.all()).results||[]
  return rows.map(row=>({...row,metadata:safeJson(row.metadata_json,{})}))
}

export async function runDistributionJob(db, env, jobId) {
  await ensurePodcastHostingTables(db)
  const job=await db.prepare('SELECT * FROM podcast_distribution_jobs WHERE id=? LIMIT 1').bind(jobId).first()
  if(!job)throw httpError('distribution job not found',404)
  if(job.state==='published')return job
  if(!RETRYABLE_STATES.has(job.state))throw httpError(`distribution job is ${job.state}`,409)
  const destination=String(job.destination||'').toLowerCase()
  if(destination==='website'||destination==='rss')return markPublished(db,job,{remoteUrl:job.remote_url})
  await updateState(db,job.id,'preparing','')
  const adapter=distributionAdapter(env,destination)
  if(!adapter){await updateState(db,job.id,'failed',`${destination} distribution is not configured`);return {...job,state:'failed',error:`${destination} distribution is not configured`}}
  await updateState(db,job.id,'uploading','')
  try{
    const episode=await getExistingNativeEntry(db,job.episode_id)
    const show=await findPodcastShow(db,job.show_id)
    const response=await fetch(adapter.url,{method:'POST',headers:{'content-type':'application/json','accept':'application/json',...(adapter.token?{'authorization':`Bearer ${adapter.token}`}:{})},body:JSON.stringify({episodeId:job.episode_id,showId:job.show_id,destination,episode:{title:episode?.title||'',summary:episode?.podcastSummary||episode?.excerpt||'',publishedAt:episode?.publishedAt||'',guid:episode?.sourceExternalId||'',audioUrl:episode?.podcastAudioUrl||'',coverImage:episode?.podcastCoverImage||''},show:{title:show?.podcastTitle||'',author:show?.author||'',websiteUrl:show?.websiteUrl||'',rssFeedUrl:show?.rssFeedUrl||''}})})
    const text=await response.text();let payload={};try{payload=JSON.parse(text)}catch{payload={message:text.slice(0,500)}}
    if(!response.ok)throw new Error(payload.error||payload.message||`${destination} adapter returned ${response.status}`)
    return markPublished(db,job,{remoteId:String(payload.remoteId||payload.id||''),remoteUrl:String(payload.remoteUrl||payload.url||''),metadata:payload})
  }catch(error){await db.prepare("UPDATE podcast_distribution_jobs SET state='failed',attempts=attempts+1,error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(String(error?.message||error).slice(0,1000),job.id).run();return {...job,state:'failed',error:String(error?.message||error)}}
}

export async function retryDistributionJob(db, jobId) {
  await ensurePodcastHostingTables(db)
  const result=await db.prepare("UPDATE podcast_distribution_jobs SET state='retrying',error='',updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='failed'").bind(jobId).run()
  if(!Number(result?.meta?.changes||0))throw httpError('only failed jobs can be retried',409)
  await db.prepare("UPDATE podcast_distribution_jobs SET state='queued',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(jobId).run()
  return true
}

function distributionAdapter(env,destination){
  if(destination==='youtube'){
    const url=String(env?.PODCAST_DISTRIBUTION_YOUTUBE_URL||'').trim(),token=String(env?.PODCAST_DISTRIBUTION_YOUTUBE_TOKEN||'').trim();return url?{url,token}:null
  }
  if(destination==='peertube'){
    const url=String(env?.PODCAST_DISTRIBUTION_PEERTUBE_URL||'').trim(),token=String(env?.PODCAST_DISTRIBUTION_PEERTUBE_TOKEN||'').trim();return url?{url,token}:null
  }
  return null
}
async function updateState(db,id,state,error){await db.prepare('UPDATE podcast_distribution_jobs SET state=?,error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(state,error,id).run()}
async function markPublished(db,job,{remoteId='',remoteUrl='',metadata={}}={}){await db.prepare("UPDATE podcast_distribution_jobs SET state='published',attempts=attempts+1,remote_id=?,remote_url=?,metadata_json=?,error='',updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(remoteId||job.remote_id||'',remoteUrl||job.remote_url||'',JSON.stringify(metadata||{}),job.id).run();return {...job,state:'published',remote_id:remoteId||job.remote_id||'',remote_url:remoteUrl||job.remote_url||'',metadata}}
function safeJson(value,fallback){try{return JSON.parse(value||'')||fallback}catch{return fallback}}
function httpError(message,status=400){const error=new Error(message);error.status=status;return error}
