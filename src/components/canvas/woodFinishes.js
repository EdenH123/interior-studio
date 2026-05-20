// Common wood finish tones used for floors and furniture. Each entry is a
// digital sample of a typical stained/finished sample under neutral light;
// real wood varies enormously by grain, age, and finish so these are
// representative rather than authoritative.
//
// Shape: { id, name, hex }. The `id` follows the convention `wood-<slug>`.
// No "code" field — wood finishes don't have manufacturer-assigned codes
// the way commercial paints do.

export const WOOD_FINISHES = [
  { id: 'wood-natural-pine',  name: 'Natural Pine',  hex: '#D4B894' },
  { id: 'wood-birch',         name: 'Birch',         hex: '#E3D2B1' },
  { id: 'wood-maple',         name: 'Maple',         hex: '#D9B083' },
  { id: 'wood-white-oak',     name: 'White Oak',     hex: '#C2A87E' },
  { id: 'wood-honey-oak',     name: 'Honey Oak',     hex: '#B98A57' },
  { id: 'wood-red-oak',       name: 'Red Oak',       hex: '#A06B47' },
  { id: 'wood-teak',          name: 'Teak',          hex: '#A57946' },
  { id: 'wood-pecan',         name: 'Pecan',         hex: '#8B5A36' },
  { id: 'wood-cherry',        name: 'Cherry',        hex: '#8B3A2A' },
  { id: 'wood-mahogany',      name: 'Mahogany',      hex: '#672C1F' },
  { id: 'wood-walnut',        name: 'Walnut',        hex: '#5C3B1E' },
  { id: 'wood-black-walnut',  name: 'Black Walnut',  hex: '#3A2818' },
  { id: 'wood-espresso',      name: 'Espresso',      hex: '#2D1D14' },
  { id: 'wood-ebony',         name: 'Ebony',         hex: '#1F1614' },
  { id: 'wood-driftwood',     name: 'Driftwood',     hex: '#9B9286' },
]
