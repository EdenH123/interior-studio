// Offline IKEA product catalog — dimensions sourced from IKEA product specs (cm).
// t = template key for glbGenerator.js (sofa/armchair/bed/wardrobe/shelving/cabinet/table/stool)

const C = [
  // ─── Sofas ────────────────────────────────────────────────────────────────
  { n: 'EKTORP 2-seat sofa',         w: 180, d: 88,  h: 88,  t: 'sofa' },
  { n: 'EKTORP 3-seat sofa',         w: 218, d: 88,  h: 88,  t: 'sofa' },
  { n: 'KIVIK 2-seat sofa',          w: 190, d: 83,  h: 83,  t: 'sofa' },
  { n: 'KIVIK 3-seat sofa',          w: 228, d: 83,  h: 83,  t: 'sofa' },
  { n: 'KIVIK chaise longue',        w: 163, d: 83,  h: 83,  t: 'sofa' },
  { n: 'SÖDERHAMN 1-seat section',   w:  96, d: 99,  h: 83,  t: 'sofa' },
  { n: 'SÖDERHAMN 3-seat sofa',      w: 186, d: 99,  h: 83,  t: 'sofa' },
  { n: 'GRÖNLID 2-seat sofa',        w: 185, d: 98,  h: 104, t: 'sofa' },
  { n: 'GRÖNLID 3-seat sofa',        w: 247, d: 98,  h: 104, t: 'sofa' },
  { n: 'FRIHETEN corner sofa-bed',   w: 230, d: 151, h: 66,  t: 'sofa' },
  { n: 'FÄRLÖV 2-seat sofa',         w: 166, d: 88,  h: 89,  t: 'sofa' },
  { n: 'FÄRLÖV 3-seat sofa',         w: 211, d: 88,  h: 89,  t: 'sofa' },
  { n: 'HOLMSUND 2-seat sofa',       w: 186, d: 82,  h: 84,  t: 'sofa' },
  { n: 'VIMLE 2-seat sofa',          w: 193, d: 83,  h: 83,  t: 'sofa' },
  { n: 'ÄPPLARYD 2-seat sofa',       w: 186, d: 97,  h: 79,  t: 'sofa' },
  { n: 'LANDSKRONA 2-seat sofa',     w: 183, d: 89,  h: 78,  t: 'sofa' },
  { n: 'LANDSKRONA 3-seat sofa',     w: 223, d: 89,  h: 78,  t: 'sofa' },

  // ─── Armchairs ────────────────────────────────────────────────────────────
  { n: 'POÄNG armchair',             w:  82, d: 82,  h: 100, t: 'armchair' },
  { n: 'STRANDMON wing chair',       w:  82, d: 96,  h: 101, t: 'armchair' },
  { n: 'EKOLSUND recliner',          w:  91, d: 109, h: 93,  t: 'armchair' },
  { n: 'TULLSTA armchair',           w:  71, d: 77,  h: 79,  t: 'armchair' },
  { n: 'FRÖSET armchair',            w:  63, d: 60,  h: 78,  t: 'armchair' },
  { n: 'LÖVHÖJDEN armchair',         w:  46, d: 49,  h: 87,  t: 'armchair' },

  // ─── Beds ─────────────────────────────────────────────────────────────────
  { n: 'MALM bed frame 90×200',      w:  97, d: 209, h: 100, t: 'bed' },
  { n: 'MALM bed frame 140×200',     w: 148, d: 209, h: 100, t: 'bed' },
  { n: 'MALM bed frame 160×200',     w: 168, d: 209, h: 100, t: 'bed' },
  { n: 'MALM bed frame 180×200',     w: 188, d: 209, h: 100, t: 'bed' },
  { n: 'HEMNES bed frame 90×200',    w: 100, d: 209, h: 116, t: 'bed' },
  { n: 'HEMNES bed frame 140×200',   w: 149, d: 209, h: 116, t: 'bed' },
  { n: 'HEMNES daybed',              w:  89, d: 204, h:  83, t: 'bed' },
  { n: 'BRIMNES bed frame 90',       w:  97, d: 218, h:  47, t: 'bed' },
  { n: 'BRIMNES bed frame 140',      w: 146, d: 218, h:  47, t: 'bed' },
  { n: 'BRIMNES bed frame 160',      w: 166, d: 218, h:  47, t: 'bed' },
  { n: 'GJÖRA bed frame 90×200',     w:  94, d: 208, h:  82, t: 'bed' },
  { n: 'GJÖRA bed frame 140×200',    w: 144, d: 208, h:  82, t: 'bed' },
  { n: 'NORDLI bed frame 90',        w:  94, d: 210, h:  47, t: 'bed' },
  { n: 'NORDLI bed frame 140',       w: 144, d: 210, h:  47, t: 'bed' },
  { n: 'NORDLI bed frame 160',       w: 164, d: 210, h:  47, t: 'bed' },
  { n: 'SONGESAND bed frame 90',     w:  97, d: 208, h: 105, t: 'bed' },
  { n: 'SONGESAND bed frame 140',    w: 148, d: 208, h: 105, t: 'bed' },
  { n: 'LEIRVIK bed frame 90',       w:  95, d: 208, h: 137, t: 'bed' },
  { n: 'LEIRVIK bed frame 140',      w: 143, d: 208, h: 137, t: 'bed' },
  { n: 'TYSSEDAL bed frame 90',      w:  95, d: 210, h: 108, t: 'bed' },
  { n: 'TYSSEDAL bed frame 140',     w: 144, d: 210, h: 108, t: 'bed' },
  { n: 'SLATTUM bed frame 90',       w:  97, d: 212, h:  90, t: 'bed' },
  { n: 'SLATTUM bed frame 140',      w: 147, d: 212, h:  90, t: 'bed' },
  { n: 'NEIDEN bed frame 90',        w:  95, d: 205, h:  50, t: 'bed' },
  { n: 'NEIDEN bed frame 140',       w: 145, d: 205, h:  50, t: 'bed' },

  // ─── Wardrobes ────────────────────────────────────────────────────────────
  { n: 'PAX wardrobe 50×58×201',     w:  50, d: 58,  h: 201, t: 'wardrobe' },
  { n: 'PAX wardrobe 75×58×201',     w:  75, d: 58,  h: 201, t: 'wardrobe' },
  { n: 'PAX wardrobe 100×58×201',    w: 100, d: 58,  h: 201, t: 'wardrobe' },
  { n: 'PAX wardrobe 150×58×201',    w: 150, d: 58,  h: 201, t: 'wardrobe' },
  { n: 'PAX wardrobe 200×58×201',    w: 200, d: 58,  h: 201, t: 'wardrobe' },
  { n: 'PAX wardrobe 100×58×236',    w: 100, d: 58,  h: 236, t: 'wardrobe' },
  { n: 'PAX wardrobe 200×58×236',    w: 200, d: 58,  h: 236, t: 'wardrobe' },
  { n: 'BRIMNES wardrobe 1 door',    w:  78, d: 50,  h: 190, t: 'wardrobe' },
  { n: 'BRIMNES wardrobe 3 doors',   w: 117, d: 50,  h: 190, t: 'wardrobe' },
  { n: 'HEMNES wardrobe 2 doors',    w:  99, d: 59,  h: 197, t: 'wardrobe' },
  { n: 'HEMNES wardrobe 3 doors',    w: 137, d: 59,  h: 197, t: 'wardrobe' },
  { n: 'KLEPPSTAD wardrobe',         w:  79, d: 55,  h: 176, t: 'wardrobe' },

  // ─── Shelving / Bookcases ─────────────────────────────────────────────────
  { n: 'KALLAX shelf unit 1×1',      w:  42, d: 39,  h:  42, t: 'shelving' },
  { n: 'KALLAX shelf unit 1×4',      w:  42, d: 39,  h: 147, t: 'shelving' },
  { n: 'KALLAX shelf unit 2×2',      w:  77, d: 39,  h:  77, t: 'shelving' },
  { n: 'KALLAX shelf unit 2×4',      w:  77, d: 39,  h: 147, t: 'shelving' },
  { n: 'KALLAX shelf unit 4×2',      w: 147, d: 39,  h:  77, t: 'shelving' },
  { n: 'KALLAX shelf unit 4×4',      w: 147, d: 39,  h: 147, t: 'shelving' },
  { n: 'BILLY bookcase 40 cm',       w:  40, d: 28,  h: 202, t: 'shelving' },
  { n: 'BILLY bookcase 80 cm',       w:  80, d: 28,  h: 202, t: 'shelving' },
  { n: 'BILLY bookcase 160 cm',      w: 160, d: 28,  h: 202, t: 'shelving' },
  { n: 'TROFAST storage unit',       w:  99, d: 44,  h:  94, t: 'shelving' },
  { n: 'IVAR shelf unit 89×50×179',  w:  89, d: 50,  h: 179, t: 'shelving' },
  { n: 'IVAR shelf unit 134×50×179', w: 134, d: 50,  h: 179, t: 'shelving' },
  { n: 'VITTSJO shelving unit',      w:  51, d: 36,  h: 175, t: 'shelving' },

  // ─── Drawer units / Cabinets / Storage ────────────────────────────────────
  { n: 'BESTÅ TV bench 60×40×38',    w:  60, d: 40,  h:  38, t: 'cabinet' },
  { n: 'BESTÅ TV bench 120×40×38',   w: 120, d: 40,  h:  38, t: 'cabinet' },
  { n: 'BESTÅ TV bench 180×40×38',   w: 180, d: 40,  h:  38, t: 'cabinet' },
  { n: 'BESTÅ storage combo 60×40×64', w: 60, d: 40, h:  64, t: 'cabinet' },
  { n: 'BESTÅ storage combo 120×40×65',w:120, d: 40, h:  65, t: 'cabinet' },
  { n: 'MALM chest 3 drawers',       w:  80, d: 48,  h:  78, t: 'cabinet' },
  { n: 'MALM chest 6 drawers',       w:  80, d: 48,  h: 123, t: 'cabinet' },
  { n: 'MALM nightstand',            w:  55, d: 40,  h:  55, t: 'cabinet' },
  { n: 'HEMNES chest 3 drawers',     w: 108, d: 50,  h:  78, t: 'cabinet' },
  { n: 'HEMNES chest 6 drawers',     w: 108, d: 50,  h: 131, t: 'cabinet' },
  { n: 'HEMNES chest 8 drawers',     w: 160, d: 50,  h:  97, t: 'cabinet' },
  { n: 'HEMNES bedside table',       w:  46, d: 35,  h:  70, t: 'cabinet' },
  { n: 'BRIMNES chest 3 drawers',    w:  78, d: 49,  h:  95, t: 'cabinet' },
  { n: 'ALEX 5-drawer unit',         w:  36, d: 58,  h:  70, t: 'cabinet' },
  { n: 'ALEX 9-drawer unit',         w:  36, d: 58,  h: 116, t: 'cabinet' },
  { n: 'NORDLI chest 40 cm',         w:  40, d: 49,  h:  99, t: 'cabinet' },
  { n: 'NORDLI chest 80 cm',         w:  80, d: 49,  h:  99, t: 'cabinet' },
  { n: 'RAST chest 3 drawers',       w:  62, d: 30,  h:  68, t: 'cabinet' },
  { n: 'KULLEN nightstand',          w:  46, d: 34,  h:  55, t: 'cabinet' },
  { n: 'TARVA nightstand',           w:  48, d: 40,  h:  62, t: 'cabinet' },

  // ─── Tables ───────────────────────────────────────────────────────────────
  { n: 'LACK coffee table',          w:  90, d: 55,  h:  45, t: 'table' },
  { n: 'LACK side table',            w:  45, d: 45,  h:  55, t: 'table' },
  { n: 'LACK TV bench 90',           w:  90, d: 26,  h:  45, t: 'table' },
  { n: 'LACK TV bench 120',          w: 120, d: 35,  h:  45, t: 'table' },
  { n: 'LISABO dining table 140',    w: 140, d: 78,  h:  74, t: 'table' },
  { n: 'EKEDALEN dining table 120',  w: 120, d: 80,  h:  75, t: 'table' },
  { n: 'EKEDALEN dining table 180',  w: 180, d: 80,  h:  75, t: 'table' },
  { n: 'INGATORP dining table',      w: 110, d: 74,  h:  74, t: 'table' },
  { n: 'MELLTORP dining table',      w:  75, d: 75,  h:  74, t: 'table' },
  { n: 'NORDEN gate-leg table',      w: 152, d: 80,  h:  74, t: 'table' },
  { n: 'STORNÄS dining table',       w: 201, d: 105, h:  74, t: 'table' },
  { n: 'BJURSTA dining table 90',    w:  90, d: 90,  h:  75, t: 'table' },
  { n: 'BJURSTA dining table 140',   w: 140, d: 84,  h:  75, t: 'table' },
  { n: 'DOCKSTA dining table',       w: 103, d: 103, h:  73, t: 'table' },
  { n: 'LERHAMN dining table',       w:  74, d: 74,  h:  74, t: 'table' },

  // ─── Desks ────────────────────────────────────────────────────────────────
  { n: 'MICKE desk 105×50',          w: 105, d: 50,  h:  75, t: 'table' },
  { n: 'MICKE desk 73×50',           w:  73, d: 50,  h:  75, t: 'table' },
  { n: 'MALM desk',                  w: 140, d: 65,  h:  73, t: 'table' },
  { n: 'BEKANT desk 120×80',         w: 120, d: 80,  h:  75, t: 'table' },
  { n: 'BEKANT desk 160×80',         w: 160, d: 80,  h:  75, t: 'table' },
  { n: 'FREDDE gaming desk',         w: 185, d: 74,  h: 146, t: 'table' },
  { n: 'LINNMON/ALEX desk 120',      w: 120, d: 60,  h:  74, t: 'table' },

  // ─── Chairs / Stools ──────────────────────────────────────────────────────
  { n: 'INGOLF chair',               w:  45, d: 52,  h:  91, t: 'stool' },
  { n: 'STEFAN chair',               w:  41, d: 45,  h:  89, t: 'stool' },
  { n: 'TOBIAS chair',               w:  51, d: 51,  h:  84, t: 'stool' },
  { n: 'EKEDALEN chair',             w:  43, d: 55,  h:  98, t: 'stool' },
  { n: 'ODGER armchair',             w:  58, d: 58,  h:  81, t: 'stool' },
  { n: 'JANINGE chair',              w:  43, d: 47,  h:  89, t: 'stool' },
  { n: 'ADDE chair',                 w:  34, d: 37,  h:  77, t: 'stool' },
  { n: 'FRANKLIN bar stool',         w:  46, d: 53,  h: 104, t: 'stool' },
  { n: 'STIG bar stool',             w:  36, d: 32,  h:  98, t: 'stool' },
  { n: 'NILSERIK standing support',  w:  36, d: 56,  h: 100, t: 'stool' },
  { n: 'MARKUS office chair',        w:  62, d: 60,  h: 120, t: 'stool' },
]

// Search by name — returns up to `limit` items whose names contain all words
// from the query (case-insensitive). Empty query returns top items.
export function searchIkeaCatalog(query, limit = 12) {
  if (!query.trim()) return C.slice(0, limit)
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return C.filter((item) => {
    const name = item.n.toLowerCase()
    return words.every((w) => name.includes(w))
  }).slice(0, limit)
}
