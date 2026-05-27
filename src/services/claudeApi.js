// Browser-side wrapper around Google's Generative Language API (Gemini).
// Exposed as an async generator — callers do:
//   for await (const chunk of streamClaude({ apiKey, model, system, messages }))
//
// The function signature is compatible with the old Anthropic wrapper so
// callers (AiPanel, traceFloorPlan) need no changes. Internally it maps
// Anthropic-style message objects to Gemini's content format, including
// the vision case (Anthropic source.base64 → Gemini inline_data).
//
// Auth: the API key travels in the x-goog-api-key header, not the URL query
// string — a query-string key leaks into browser history, proxy logs, and
// Referer headers. Google's free-tier Gemini Flash is rate-limited to
// 15 RPM / 1 500 RPD at no cost. Same caveat as before — any browser-visible
// key can be extracted from devtools; get a key from
// https://aistudio.google.com/app/apikey and keep its scope narrow.

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// Maps one Anthropic-format message part → Gemini part.
function toGeminiPart(part) {
  if (typeof part === 'string') return { text: part }
  if (part.type === 'text') return { text: part.text }
  if (part.type === 'image') {
    // Anthropic: { source: { type:'base64', media_type, data } }
    // Gemini:    { inline_data: { mime_type, data } }
    const { media_type, data } = part.source
    return { inline_data: { mime_type: media_type, data } }
  }
  return { text: '' }
}

function toGeminiContent(msg) {
  // Gemini roles: 'user' | 'model' (not 'assistant')
  const role = msg.role === 'assistant' ? 'model' : 'user'
  const parts = Array.isArray(msg.content)
    ? msg.content.map(toGeminiPart)
    : [{ text: msg.content ?? '' }]
  return { role, parts }
}

export async function* streamClaude({ apiKey, model, system, messages, maxTokens = 2048 }) {
  const url = `${GEMINI_BASE}/${model}:streamGenerateContent?alt=sse`

  // Drop empty-string messages that the UI may insert as placeholder slots.
  const contents = messages
    .filter((m) => Array.isArray(m.content) ? m.content.length > 0 : m.content !== '')
    .map(toGeminiContent)

  const body = {
    ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
    contents,
    generationConfig: { maxOutputTokens: maxTokens },
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Gemini API ${response.status}: ${parseErrorMessage(text) || response.statusText}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (!payload || payload === '[DONE]') continue
      let event
      try { event = JSON.parse(payload) } catch { continue }
      if (event.error) {
        throw new Error(`Gemini API error: ${event.error.message ?? 'unknown'}`)
      }
      for (const part of event.candidates?.[0]?.content?.parts ?? []) {
        if (part.text) yield part.text
      }
    }
  }
}

function parseErrorMessage(body) {
  try { return JSON.parse(body)?.error?.message } catch { return null }
}
