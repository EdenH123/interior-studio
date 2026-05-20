import { nanoid } from 'nanoid/non-secure'
import { streamClaude } from './claudeApi'
import { extractJsonBlock } from './aiPrompts'

const TRACE_MODEL = 'claude-opus-4-7'

const TRACE_SYSTEM = `You are an architectural plan digitizer.
Analyze the provided floor plan image and identify all wall line segments.
Return ONLY a JSON code block — no explanation, no prose.

The JSON must have this exact shape:
\`\`\`json
{
  "walls": [
    { "x1": <number>, "y1": <number>, "x2": <number>, "y2": <number> }
  ]
}
\`\`\`

Rules:
- x1, y1, x2, y2 are image pixel coordinates (0,0 = top-left corner).
- Each entry is one wall segment (centerline).
- Include all interior and exterior walls.
- Omit furniture, text labels, and dimension arrows.
- Do not return any text outside the JSON block.`

// Parses a data-URL into { mediaType, base64 }.
export function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) throw new Error('Invalid data URL: expected data:<type>;base64,<data>')
  return { mediaType: match[1], base64: match[2] }
}

// Transforms image-pixel wall coords to Konva world coords using the
// underlay's position and scale. Assigns fresh nanoid ids.
export function transformWalls(rawWalls, underlay) {
  const { x: ox, y: oy, scale } = underlay
  return rawWalls.map((w) => ({
    id: nanoid(6),
    x1: ox + w.x1 * scale,
    y1: oy + w.y1 * scale,
    x2: ox + w.x2 * scale,
    y2: oy + w.y2 * scale,
  }))
}

// Calls Claude vision to trace walls in the underlay image, then returns a
// proposal object `{ walls, furniture: [], openings: [], roomMeta: {} }` in
// Konva world coordinates ready to pass to validateProposedProject.
//
// `underlayDataUrl` is the full data:image/... string.
// `underlay` is the store underlay object { x, y, scale, ... }.
export async function traceFloorPlan({ apiKey, underlayDataUrl, underlay }) {
  const { mediaType, base64 } = parseDataUrl(underlayDataUrl)

  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        },
        {
          type: 'text',
          text: 'Trace all wall segments in this floor plan image. Return the JSON block as instructed.',
        },
      ],
    },
  ]

  let fullText = ''
  for await (const chunk of streamClaude({
    apiKey,
    model: TRACE_MODEL,
    system: TRACE_SYSTEM,
    messages,
    maxTokens: 4096,
  })) {
    fullText += chunk
  }

  const jsonStr = extractJsonBlock(fullText)
  if (!jsonStr) throw new Error('Claude did not return a JSON block in its response.')

  let parsed
  try { parsed = JSON.parse(jsonStr) } catch (e) {
    throw new Error(`Could not parse Claude's JSON: ${e.message}`)
  }

  if (!Array.isArray(parsed.walls)) throw new Error('Response JSON missing "walls" array.')

  const walls = transformWalls(parsed.walls, underlay)
  return { walls, furniture: [], openings: [], roomMeta: {} }
}
