import { listContributors, listMessages } from './campaignCorrespondence.js'

export async function ensureCampaignMessageRecipientTable(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS campaign_message_recipients (
    message_id TEXT NOT NULL,
    contributor_id TEXT NOT NULL,
    campaign_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, contributor_id)
  )`).run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_campaign_message_recipients_contributor ON campaign_message_recipients(campaign_id, contributor_id, created_at)').run()
}

export function filterContributorMessages({ allMessages = [], publicMessages = [], recipientMessageIds = [] } = {}, contributorId = '') {
  const id = String(contributorId || '').trim()
  if (!id) return []
  const publicIds = new Set(publicMessages.map((message) => message.id))
  const recipientIds = new Set(recipientMessageIds)
  return allMessages.filter((message) => message.contributorId === id || recipientIds.has(message.id) || publicIds.has(message.id))
}

export async function listContributorMessages(db, campaignId, contributorId) {
  await ensureCampaignMessageRecipientTable(db)
  const id = String(contributorId || '').trim()
  if (!id) return []
  const [allMessages, publicMessages, recipients] = await Promise.all([
    listMessages(db, campaignId),
    listMessages(db, campaignId, { publicOnly: true }),
    db.prepare('SELECT message_id FROM campaign_message_recipients WHERE campaign_id = ? AND contributor_id = ?').bind(campaignId, id).all(),
  ])
  return filterContributorMessages({ allMessages, publicMessages, recipientMessageIds: (recipients?.results || []).map((row) => row.message_id) }, id)
}

export async function listAdminMessagesWithRecipients(db, campaignId) {
  await ensureCampaignMessageRecipientTable(db)
  const [messages, rows] = await Promise.all([
    listMessages(db, campaignId),
    db.prepare(`SELECT r.message_id, r.contributor_id, c.display_name, c.byline
      FROM campaign_message_recipients r
      LEFT JOIN campaign_contributors c ON c.id = r.contributor_id
      WHERE r.campaign_id = ? ORDER BY r.created_at ASC`).bind(campaignId).all(),
  ])
  const assignments = new Map()
  for (const row of rows?.results || []) {
    if (!assignments.has(row.message_id)) assignments.set(row.message_id, [])
    assignments.get(row.message_id).push({ id: row.contributor_id, displayName: row.byline || row.display_name || 'Field contributor' })
  }
  return messages.map((message) => {
    const recipients = assignments.get(message.id) || []
    const recipientRequired = message.senderRole === 'editor' && message.visibility === 'private' && recipients.length === 0
    return {
      ...message,
      recipientContributorIds: recipients.map((item) => item.id),
      recipientContributorNames: recipients.map((item) => item.displayName),
      recipientRequired,
    }
  })
}

export async function assignPrivateEditorRecipient(db, campaignId, messageId, requestedContributorId = '') {
  await ensureCampaignMessageRecipientTable(db)
  const contributors = (await listContributors(db, campaignId)).filter((item) => !item.revokedAt)
  let contributorId = String(requestedContributorId || '').trim()
  if (!contributorId) {
    if (contributors.length !== 1) throw scopedError(contributors.length ? 'Choose which contributor should receive this private message.' : 'Create an active contributor before sending a private message.', 400)
    contributorId = contributors[0].id
  }
  const contributor = contributors.find((item) => item.id === contributorId)
  if (!contributor) throw scopedError('Private-message recipient is not an active contributor in this campaign.', 400)
  await db.prepare(`INSERT INTO campaign_message_recipients (message_id, contributor_id, campaign_id, created_at)
    VALUES (?, ?, ?, ?) ON CONFLICT(message_id, contributor_id) DO NOTHING`)
    .bind(messageId, contributorId, campaignId, new Date().toISOString()).run()
  return contributorId
}

export async function repairPrivateEditorRecipient(db, messageId, requestedContributorId = '') {
  await ensureCampaignMessageRecipientTable(db)
  const message = await db.prepare(`SELECT id, campaign_id, sender_role, visibility FROM campaign_messages WHERE id = ? LIMIT 1`).bind(String(messageId || '')).first()
  if (!message) throw scopedError('message not found', 404)
  if (message.sender_role !== 'editor' || message.visibility !== 'private') throw scopedError('Only private editor messages can be assigned to a contributor.', 400)
  await db.prepare('DELETE FROM campaign_message_recipients WHERE message_id = ?').bind(message.id).run()
  const contributorId = await assignPrivateEditorRecipient(db, message.campaign_id, message.id, requestedContributorId)
  return { messageId: message.id, campaignId: message.campaign_id, contributorId }
}

export async function deleteMessageRecipients(db, messageId) {
  await ensureCampaignMessageRecipientTable(db)
  await db.prepare('DELETE FROM campaign_message_recipients WHERE message_id = ?').bind(messageId).run()
}

function scopedError(message, status = 400) { const error = new Error(message); error.status = status; return error }
