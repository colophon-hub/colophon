import { readPublicSiteConfig } from './publicSiteConfig.js'

export async function publicCampaignWithIdentity(db, campaign) {
  let identity = {}
  try { identity = (await readPublicSiteConfig(db, 'global'))?.config?.identity || {} } catch {}
  const configuredLabel = String(identity.correspondenceLabel || '').trim()
  const campaignLabel = String(campaign?.correspondence?.editorLabel || '').trim()
  const editorLabel = campaignLabel && campaignLabel !== 'Publication editor'
    ? campaignLabel
    : configuredLabel || campaignLabel || 'Publication editor'
  return {
    id: campaign.id,
    slug: campaign.slug,
    title: campaign.title,
    shortTitle: campaign.shortTitle,
    correspondence: { ...(campaign.correspondence || {}), editorLabel },
    publicationIdentity: {
      publicationName: String(identity.publicationName || 'Independent Publication'),
      shortName: String(identity.shortName || ''),
      logoUrl: String(identity.logoUrl || ''),
      correspondenceLabel: editorLabel,
      socialIdentity: String(identity.socialIdentity || ''),
      contactEmail: String(identity.contactEmail || ''),
    },
  }
}
