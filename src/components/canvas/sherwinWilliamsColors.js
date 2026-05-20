// Curated subset of popular Sherwin-Williams paint colors. Hex values are
// approximate digital representations — real paint chips vary by lighting,
// substrate, and sheen, so these should be treated as "close enough for a
// design preview" rather than spec-accurate.
//
// Shape: { id, name, code, hex }. The `id` follows the convention `sw-<slug>`
// so it's globally unique once mixed with benjamin-moore + wood ids.
//
// Sourced from Sherwin-Williams' published catalog (color names + codes are
// trademarks of The Sherwin-Williams Company; only names and rough RGB samples
// are used here for design-preview purposes).

export const SHERWIN_WILLIAMS = [
  // Whites
  { id: 'sw-pure-white',          name: 'Pure White',          code: 'SW 7005', hex: '#EEEAE0' },
  { id: 'sw-alabaster',           name: 'Alabaster',           code: 'SW 7008', hex: '#ECE9DA' },
  { id: 'sw-snowbound',           name: 'Snowbound',           code: 'SW 7004', hex: '#EDEAE0' },
  { id: 'sw-extra-white',         name: 'Extra White',         code: 'SW 7006', hex: '#F2F2EC' },
  { id: 'sw-westhighland-white',  name: 'Westhighland White',  code: 'SW 7566', hex: '#E3DAC9' },

  // Grays
  { id: 'sw-repose-gray',         name: 'Repose Gray',         code: 'SW 7015', hex: '#BDB5A8' },
  { id: 'sw-agreeable-gray',      name: 'Agreeable Gray',      code: 'SW 7029', hex: '#C3B9A8' },
  { id: 'sw-mindful-gray',        name: 'Mindful Gray',        code: 'SW 7016', hex: '#B8B2A4' },
  { id: 'sw-useful-gray',         name: 'Useful Gray',         code: 'SW 7050', hex: '#C2BAA8' },
  { id: 'sw-worldly-gray',        name: 'Worldly Gray',        code: 'SW 7043', hex: '#C0B5A0' },
  { id: 'sw-anew-gray',           name: 'Anew Gray',           code: 'SW 7030', hex: '#B5A99A' },
  { id: 'sw-gauntlet-gray',       name: 'Gauntlet Gray',       code: 'SW 7019', hex: '#7F7672' },
  { id: 'sw-iron-ore',            name: 'Iron Ore',            code: 'SW 7069', hex: '#4C4847' },
  { id: 'sw-tricorn-black',       name: 'Tricorn Black',       code: 'SW 6258', hex: '#2D2A2A' },

  // Beige / tan
  { id: 'sw-accessible-beige',    name: 'Accessible Beige',    code: 'SW 7036', hex: '#C3B69E' },
  { id: 'sw-natural-linen',       name: 'Natural Linen',       code: 'SW 9109', hex: '#DBD0BB' },
  { id: 'sw-kilim-beige',         name: 'Kilim Beige',         code: 'SW 6106', hex: '#C5B194' },

  // Blues
  { id: 'sw-naval',               name: 'Naval',               code: 'SW 6244', hex: '#3B4A60' },
  { id: 'sw-sea-salt',            name: 'Sea Salt',            code: 'SW 6204', hex: '#D0D5C6' },
  { id: 'sw-rainwashed',          name: 'Rainwashed',          code: 'SW 6211', hex: '#BDD2CB' },

  // Greens
  { id: 'sw-evergreen-fog',       name: 'Evergreen Fog',       code: 'SW 9130', hex: '#969A7E' },
  { id: 'sw-rosemary',            name: 'Rosemary',            code: 'SW 6187', hex: '#6E7A55' },
  { id: 'sw-privilege-green',     name: 'Privilege Green',     code: 'SW 6193', hex: '#919A78' },

  // Browns / clays
  { id: 'sw-urbane-bronze',       name: 'Urbane Bronze',       code: 'SW 7048', hex: '#5A544A' },
  { id: 'sw-cavern-clay',         name: 'Cavern Clay',         code: 'SW 7701', hex: '#B57854' },
  { id: 'sw-pottery-red',         name: 'Pottery Red',         code: 'SW 7710', hex: '#934E3A' },

  // Yellows
  { id: 'sw-restrained-gold',     name: 'Restrained Gold',     code: 'SW 6129', hex: '#B89968' },

  // Near-blacks
  { id: 'sw-caviar',              name: 'Caviar',              code: 'SW 6990', hex: '#2C2929' },
  { id: 'sw-cyberspace',          name: 'Cyberspace',          code: 'SW 7964', hex: '#4A4D50' },
  { id: 'sw-black-magic',         name: 'Black Magic',         code: 'SW 6991', hex: '#2A2628' },
]
