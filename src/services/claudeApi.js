// Minimal browser-side wrapper around Anthropic's Messages API. No SDK —
// just fetch + the SSE parsing required for streaming. Exposed as an async
// generator so callers can `for await (const chunk of streamClaude(...))`
// and append to the UI as text arrives.
//
// Browser-side access requires the `anthropic-dangerous-direct-browser-access`
// header; the API will reject without it. The "dangerous" framing is
// intentional — pasting an API key into a browser app exposes it to any
// script on the page. This module doesn't try to hide that; the UI
// surfaces a clear warning.

const API_URL = 'https://api.anthropic.com/v1/messages'
const API_VERSION = '2023-06-01'

export async function* streamClaude({ apiKey, model, system, messages, maxTokens = 2048 }) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, stream: true, system, messages }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Claude API ${response.status}: ${parseErrorMessage(body) || response.statusText}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // SSE frames are separated by blank lines; events arrive as
    // `event: <name>\ndata: <json>\n\n`. We only care about the `data:`
    // lines.
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? '' // keep the (possibly incomplete) trailing line
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (!payload || payload === '[DONE]') continue
      let event
      try { event = JSON.parse(payload) } catch { continue }
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        yield event.delta.text
      }
      // Surface API-side errors mid-stream (e.g. overloaded_error)
      if (event.type === 'error') {
        throw new Error(`Claude API error: ${event.error?.message ?? 'unknown'}`)
      }
    }
  }
}

function parseErrorMessage(body) {
  try { return JSON.parse(body)?.error?.message } catch { return null }
}
