export async function sendOutboundEmail(env, message = {}) {
  const provider = String(env?.SIGNATURE_EMAIL_PROVIDER || (env?.RESEND_API_KEY ? 'resend' : env?.SIGNATURE_EMAIL_WEBHOOK_URL ? 'webhook' : '')).toLowerCase()
  if (!provider) throw new Error('Outbound signature email is not configured.')
  const from = String(env?.SIGNATURE_EMAIL_FROM || '').trim()
  if (!from) throw new Error('SIGNATURE_EMAIL_FROM is not configured.')
  if (provider === 'resend') {
    const key = String(env?.RESEND_API_KEY || '').trim()
    if (!key) throw new Error('RESEND_API_KEY is not configured.')
    const response = await fetch('https://api.resend.com/emails', { method:'POST', headers:{authorization:`Bearer ${key}`,'content-type':'application/json'}, body:JSON.stringify({from,to:[message.to],subject:message.subject,text:message.text}) })
    if (!response.ok) throw new Error(`Email provider returned ${response.status}`)
    return true
  }
  if (provider === 'webhook') {
    const url = String(env?.SIGNATURE_EMAIL_WEBHOOK_URL || '').trim()
    if (!/^https:\/\//i.test(url)) throw new Error('SIGNATURE_EMAIL_WEBHOOK_URL must be HTTPS.')
    const headers = {'content-type':'application/json'}
    if (env?.SIGNATURE_EMAIL_WEBHOOK_TOKEN) headers.authorization = `Bearer ${String(env.SIGNATURE_EMAIL_WEBHOOK_TOKEN)}`
    const response = await fetch(url,{method:'POST',headers,body:JSON.stringify({from,to:message.to,subject:message.subject,text:message.text})})
    if (!response.ok) throw new Error(`Email webhook returned ${response.status}`)
    return true
  }
  throw new Error(`Unsupported outbound email provider: ${provider}`)
}
