# Furniture GLB Credits

All `.glb` files in this directory are **original procedural geometry** generated
by `scripts/generate-furniture-glbs.mjs`, a Node.js script that writes raw
GLTF 2.0 binary files using only the built-in Node `fs` module (no third-party
libraries). No external assets were downloaded or derived.

Released under **CC0 1.0 Universal** (public domain dedication).
You may use, modify, and distribute without restriction.

## Models

| File | Piece | Triangles | Size |
|---|---|---|---|
| `sofa.glb` | 2-seat sofa — seat, backrest, two arms | 48 | 3.4 kB |
| `armchair.glb` | Armchair — seat, backrest, two arms | 48 | 3.4 kB |
| `chair.glb` | Dining/desk chair — seat, back, four legs | 72 | 4.7 kB |
| `coffee-table.glb` | Coffee table — top slab + four legs | 60 | 4.0 kB |
| `dining-table.glb` | Dining table — top slab + four legs | 60 | 4.0 kB |
| `desk.glb` | Writing desk — top slab + four legs | 60 | 4.0 kB |
| `bed.glb` | Double bed — base frame, mattress, headboard | 36 | 2.7 kB |
| `bookshelf.glb` | Bookshelf — sides, back, bottom, three shelves, top | 96 | 5.9 kB |
| `wardrobe.glb` | Wardrobe — carcass + two inset door panels | 84 | 5.3 kB |
| `rug.glb` | Flat rug | 12 | 1.5 kB |
| `lamp.glb` | Floor lamp — circular base, pole, shade | 36 | 2.7 kB |
| `tv.glb` | Television — frame, screen, stand neck + base | 48 | 3.4 kB |

## Geometry conventions

- **Orientation**: +Y up, origin at bottom-centre of the bounding box.
  Matches the `fitToBox()` contract in `furnitureModels.js`.
- **-Z is "back"**: backrests, headboards, and wall-facing surfaces sit toward −Z;
  the "front" (where you interact with the piece) faces +Z.
- **Bounding box** for each model matches the catalog entry's `width × depth × height`
  exactly, so `fitToBox()` applies a 1:1:1 scale with no distortion.
- **One mesh per file**, single PBR material with `metallicFactor 0`,
  `roughnessFactor 0.8`. No textures.

## Regenerating

```bash
node scripts/generate-furniture-glbs.mjs
```

The script is idempotent — re-running overwrites existing files.
