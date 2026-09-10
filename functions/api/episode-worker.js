import { getBoundDb } from './_lib/database.js'
import { permissionHasCapability, resolvePublicSitePermission } from './_lib/publicSiteAuth.js'
import { listDistributionJobs, retryDistributionJob, runDistributionJob } from './_lib/podcastDistribution.js'

export async function onRequestPost(context){
  const permission=await resolvePublicSitePermission(context)
  const configured=String(context.env?.EPISODE_WORKER_TOKEN||'').trim(), supplied=bearer(context.request)
  const worker=Boolean(configured&&supplied&&timingSafeTextEqual(configured,supplied))
  if(!worker&&!permissionHasCapability(permission,'publishing:write')&&!permission.canEdit)return json({ok:false,error:'publishing permission or EPISODE_WORKER_TOKEN required'},403)
  const db=getBoundDb(context);if(!db)return json({ok:false,error:'BF_DB binding is required'},503)
  try{
    const body=await context.request.json().catch(()=>({})),action=String(body.action||'run')
    if(action==='retry'){await retryDistributionJob(db,String(body.jobId||''));return json({ok:true})}
    let jobs=await listDistributionJobs(db,{showId:String(body.showId||'')})
    if(body.jobId)jobs=jobs.filter(job=>job.id===body.jobId)
    else jobs=jobs.filter(job=>['queued','retrying'].includes(job.state)).slice(0,Math.max(1,Math.min(20,Number(body.limit||5))))
    const results=[]
    for(const job of jobs)results.push(await runDistributionJob(db,context.env,job.id))
    return json({ok:true,processed:results.length,results})
  }catch(error){return json({ok:false,error:String(error?.message||error)},Number(error?.status)||500)}
}
function bearer(request){const raw=String(request.headers.get('authorization')||'');return /^Bearer\s+/i.test(raw)?raw.replace(/^Bearer\s+/i,'').trim():''}
function timingSafeTextEqual(a,b){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i+=1)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
function json(value,status=200){return new Response(JSON.stringify(value,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
