function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

export async function onRequestPost() {
  return json({
    ok: false,
    error: 'Server transcription is not configured in core. Use local transcription or install a provider adapter.',
  }, 501)
}
