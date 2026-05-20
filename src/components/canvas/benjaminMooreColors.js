// Curated subset of popular Benjamin Moore paint colors. Hex values are
// approximate digital representations — real paint chips vary by lighting,
// substrate, and sheen, so these should be treated as "close enough for a
// design preview" rather than spec-accurate.
//
// Shape: { id, name, code, hex }. The `id` follows the convention `bm-<slug>`
// so it's globally unique once mixed with sherwin-williams + wood ids.
//
// Sourced from Benjamin Moore's published catalog (color names + codes are
// trademarks of Benjamin Moore & Co.; only names and rough RGB samples are
// used here for design-preview purposes).

export const BENJAMIN_MOORE = [
  // Whites / off-whites
  { id: 'bm-decorators-white',  name: "Decorator's White",  code: 'CC-20',  hex: '#F1EFE7' },
  { id: 'bm-white-dove',        name: 'White Dove',         code: 'OC-17',  hex: '#F1EDE4' },
  { id: 'bm-simply-white',      name: 'Simply White',       code: 'OC-117', hex: '#EFEAD8' },
  { id: 'bm-chantilly-lace',    name: 'Chantilly Lace',     code: 'OC-65',  hex: '#F4F4ED' },
  { id: 'bm-swiss-coffee',      name: 'Swiss Coffee',       code: 'OC-45',  hex: '#EDE6D6' },
  { id: 'bm-cloud-white',       name: 'Cloud White',        code: 'OC-130', hex: '#EEEAD9' },

  // Grays
  { id: 'bm-revere-pewter',     name: 'Revere Pewter',      code: 'HC-172', hex: '#C4BAA8' },
  { id: 'bm-edgecomb-gray',     name: 'Edgecomb Gray',      code: 'HC-173', hex: '#C9C2B0' },
  { id: 'bm-pale-oak',          name: 'Pale Oak',           code: 'OC-20',  hex: '#D2C7B3' },
  { id: 'bm-gray-owl',          name: 'Gray Owl',           code: 'OC-52',  hex: '#BFBDB1' },
  { id: 'bm-stonington-gray',   name: 'Stonington Gray',    code: 'HC-170', hex: '#B5B6B0' },
  { id: 'bm-coventry-gray',     name: 'Coventry Gray',      code: 'HC-169', hex: '#98948C' },
  { id: 'bm-classic-gray',      name: 'Classic Gray',       code: 'OC-23',  hex: '#DDD6C6' },
  { id: 'bm-chelsea-gray',      name: 'Chelsea Gray',       code: 'HC-168', hex: '#80776C' },

  // Beige / tan
  { id: 'bm-manchester-tan',    name: 'Manchester Tan',     code: 'HC-81',  hex: '#D6C3A4' },
  { id: 'bm-shaker-beige',      name: 'Shaker Beige',       code: 'HC-45',  hex: '#D3BD9D' },

  // Blues
  { id: 'bm-hale-navy',         name: 'Hale Navy',          code: 'HC-154', hex: '#3A4A5C' },
  { id: 'bm-newburyport-blue',  name: 'Newburyport Blue',   code: 'HC-155', hex: '#2E4A5E' },
  { id: 'bm-van-deusen-blue',   name: 'Van Deusen Blue',    code: 'HC-156', hex: '#4E6A7E' },
  { id: 'bm-wedgewood-gray',    name: 'Wedgewood Gray',     code: 'HC-146', hex: '#A4B0B4' },
  { id: 'bm-palladian-blue',    name: 'Palladian Blue',     code: 'HC-144', hex: '#B4CFCC' },

  // Greens
  { id: 'bm-saybrook-sage',     name: 'Saybrook Sage',      code: 'HC-114', hex: '#99A88F' },
  { id: 'bm-hunter-green',      name: 'Hunter Green',       code: '2041-10', hex: '#3A4F3A' },
  { id: 'bm-guilford-green',    name: 'Guilford Green',     code: 'HC-116', hex: '#9CA88B' },

  // Reds / earth
  { id: 'bm-caliente',          name: 'Caliente',           code: 'AF-290', hex: '#A93223' },
  { id: 'bm-country-redwood',   name: 'Country Redwood',    code: '2080-10', hex: '#6B362B' },

  // Yellows
  { id: 'bm-hawthorne-yellow',  name: 'Hawthorne Yellow',   code: 'HC-4',   hex: '#E8C880' },

  // Near-blacks
  { id: 'bm-wrought-iron',      name: 'Wrought Iron',       code: '2124-10', hex: '#4C4D4E' },
  { id: 'bm-iron-mountain',     name: 'Iron Mountain',      code: '2134-30', hex: '#56595A' },
  { id: 'bm-black-iron',        name: 'Black Iron',         code: '2120-30', hex: '#3A3A3B' },
]
