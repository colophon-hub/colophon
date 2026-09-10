import { getBoundDb, databaseUnavailable } from './_lib/database.js'
import { getCampaign } from './_lib/campaigns.js'
import { authenticateContributor } from './_lib/campaignCorrespondence.js'
import { listContributorMessages } from './_lib/campaignCorrespondencePrivacy.js'
import { publicCampaignWithIdentity } from './_lib/campaignPublicIdentity.js'

export async function onRequestPost(context) {
  try {
    const db = getBoundDb(context)
    if (!db) return databaseUnavailable('campaign contributor access')
    const body = await context.request.json()
    const result = await authenticateContributor(db, { token: body.token, pin: body.pin, ip: context.request.headers.get('cf-connecting-ip') || '' })
    const campaign = await getCampaign(db, result.contributor.campaignId)
    if (!campaign) return json({ ok: false, error: 'campaign not found' }, 404)
    return json({ ok: true, ...result, campaign: await publicCampaignWithIdentity(db, campaign), messages: await listContributorMessages(db, campaign.id, result.contributor.id) })
  } catch (error) { return json({ ok: false, error: String(error?.message || error) }, Number(error?.status) || 400) }
}
function json(value, status = 200) { return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } }) }
