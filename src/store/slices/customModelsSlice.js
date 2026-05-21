import { nanoid } from 'nanoid/non-secure'
import { revokeCustomModelUrl } from '../../utils/customModelUrls'

export function createCustomModelsSlice(set) {
  return {
    customModels: [],

    addCustomModel: ({ label, width, depth, height, color, glbData }) =>
      set((s) => ({
        customModels: [
          ...s.customModels,
          { id: nanoid(6), label, width, depth, height, color: color ?? '#94a3b8', glbData },
        ],
      })),

    removeCustomModel: (id) => {
      revokeCustomModelUrl(id)
      set((s) => ({
        customModels: s.customModels.filter((m) => m.id !== id),
        furniture:    s.furniture.filter((f) => f.customModelId !== id),
      }))
    },
  }
}
