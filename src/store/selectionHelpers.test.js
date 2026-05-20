import { describe, it, expect } from 'vitest'
import {
  selectionItems,
  isSelected,
  getSingleItem,
  commonKind,
} from './selectionHelpers'

describe('selectionHelpers', () => {
  describe('selectionItems', () => {
    it('returns empty array for null', () => {
      expect(selectionItems(null)).toEqual([])
    })

    it('returns empty array for undefined', () => {
      expect(selectionItems(undefined)).toEqual([])
    })

    it('returns items array from selection', () => {
      const sel = { items: [{ kind: 'wall', id: 'w1' }] }
      expect(selectionItems(sel)).toEqual([{ kind: 'wall', id: 'w1' }])
    })

    it('returns multiple items', () => {
      const sel = { items: [{ kind: 'wall', id: 'w1' }, { kind: 'furniture', id: 'f1' }] }
      expect(selectionItems(sel)).toHaveLength(2)
    })
  })

  describe('isSelected', () => {
    const sel = { items: [{ kind: 'wall', id: 'w1' }, { kind: 'furniture', id: 'f1' }] }

    it('returns true for a selected item', () => {
      expect(isSelected(sel, 'wall', 'w1')).toBe(true)
      expect(isSelected(sel, 'furniture', 'f1')).toBe(true)
    })

    it('returns false for a non-selected item', () => {
      expect(isSelected(sel, 'wall', 'w2')).toBe(false)
      expect(isSelected(sel, 'opening', 'o1')).toBe(false)
    })

    it('returns false for null selection', () => {
      expect(isSelected(null, 'wall', 'w1')).toBe(false)
    })
  })

  describe('getSingleItem', () => {
    it('returns null for null selection', () => {
      expect(getSingleItem(null)).toBeNull()
    })

    it('returns the item when exactly one is selected', () => {
      const sel = { items: [{ kind: 'wall', id: 'w1' }] }
      expect(getSingleItem(sel)).toEqual({ kind: 'wall', id: 'w1' })
    })

    it('returns null when multiple items are selected', () => {
      const sel = { items: [{ kind: 'wall', id: 'w1' }, { kind: 'furniture', id: 'f1' }] }
      expect(getSingleItem(sel)).toBeNull()
    })

    it('returns null when selection has no items', () => {
      expect(getSingleItem({ items: [] })).toBeNull()
    })
  })

  describe('commonKind', () => {
    it('returns null for empty selection', () => {
      expect(commonKind(null)).toBeNull()
    })

    it('returns the kind when all items share one kind', () => {
      const sel = { items: [{ kind: 'wall', id: 'w1' }, { kind: 'wall', id: 'w2' }] }
      expect(commonKind(sel)).toBe('wall')
    })

    it('returns null for mixed kinds', () => {
      const sel = { items: [{ kind: 'wall', id: 'w1' }, { kind: 'furniture', id: 'f1' }] }
      expect(commonKind(sel)).toBeNull()
    })

    it('returns the kind for a single-item selection', () => {
      const sel = { items: [{ kind: 'furniture', id: 'f1' }] }
      expect(commonKind(sel)).toBe('furniture')
    })
  })
})
