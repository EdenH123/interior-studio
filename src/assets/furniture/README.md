# Furniture 3D models

Drop `.glb` files here, then reference them from `src/components/canvas/furnitureCatalog.js`
on the matching `FURNITURE` entry:

```js
{
  type: 'sofa',
  // ...
  model: new URL('../../assets/furniture/sofa.glb', import.meta.url).href,
}
```

Vite's `import.meta.url` pattern ensures the asset is fingerprinted into the
build and the URL is correct in both `dev` and `build`.

## Conventions

- The viewer scales each model to the catalog entry's `width × depth × height`
  by `Box3().setFromObject` of the loaded scene. Author models with arbitrary
  units; we normalise. (For best results, model with `+Y` up and origin at
  the bottom-centre.)
- Avoid heavy textures — large GLBs slow the first 3D render. Keep total
  asset size under ~500 KB per item when possible.
- One material per mesh keeps the per-instance material clone cheap.

## Status today

All `model` fields in the catalog are `null` — the BoxGeometry fallback
(required by the `three-scene` skill) is what renders. The GLB pipeline is
wired up; populate the field to switch any single item over.
