import { describe, it, expect } from 'vitest'
import {
  FORMAT, VERSION, buildExportData, validateImport, timestampForFilename,
} from './projectIO'

const SAMPLE_STATE = {
  walls: [{ id: 'w1', x1: 0, y1: 0, x2: 100, y2: 0 }],
  openings: [{ id: 'o1', type: 'door', wallId: 'w1', position: 0.5, width: 0.9, height: 2.1, sillHeight: 0 }],
  furniture: [{ id: 'f1', type: 'sofa', x: 0, y: 0, rotation: 0, width: 2, depth: 0.9, height: 0.85, color: '#475569' }],
  roomMeta: { abc: { name: 'Living', floorMaterial: 'wood' } },
  underlay: null,
}

describe('buildExportData', () => {
  it('produces the versioned envelope', () => {
    const out = buildExportData(SAMPLE_STATE)
    expect(out.format).toBe(FORMAT)
    expect(out.version).toBe(VERSION)
    expect(out.exportedAt).toEqual(expect.any(String))
    expect(out.data).toEqual(SAMPLE_STATE)
  })

  it('exportedAt is a valid ISO timestamp', () => {
    const out = buildExportData(SAMPLE_STATE)
    expect(new Date(out.exportedAt).toString()).not.toBe('Invalid Date')
  })
})

describe('validateImport', () => {
  it('round-trips a well-formed export', () => {
    const out = buildExportData(SAMPLE_STATE)
    const data = validateImport(out)
    expect(data).toEqual(SAMPLE_STATE)
  })

  it('throws on non-object input', () => {
    expect(() => validateImport(null)).toThrow()
    expect(() => validateImport('not an object')).toThrow()
  })

  it('throws on wrong format', () => {
    expect(() => validateImport({ ...buildExportData(SAMPLE_STATE), format: 'something-else' })).toThrow(/project file/)
  })

  it('throws on unsupported version', () => {
    expect(() => validateImport({ ...buildExportData(SAMPLE_STATE), version: 999 })).toThrow(/version 999/)
  })

  it('throws on missing data section', () => {
    expect(() => validateImport({ format: FORMAT, version: VERSION })).toThrow(/data/)
  })

  it('coerces missing arrays / objects to empty defaults', () => {
    const out = {
      format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(),
      data: { walls: 'not-an-array', openings: 'nope', furniture: null, roomMeta: 'oops', underlay: 'nope' },
    }
    const data = validateImport(out)
    expect(data).toEqual({ walls: [], openings: [], furniture: [], roomMeta: {}, underlay: null })
  })
})

describe('timestampForFilename', () => {
  it('is filesystem-safe (no colons or dots)', () => {
    const t = timestampForFilename()
    expect(t).not.toMatch(/[:.]/)
  })

  it('matches ISO-ish length (YYYY-MM-DDTHH-MM-SS)', () => {
    expect(timestampForFilename()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/)
  })
})
