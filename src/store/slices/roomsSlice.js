// Room metadata keyed by polygon fingerprint (see roomDetection.js). Rooms
// themselves are derived from `walls` each render — only their name +
// floor material live in the store, persisting across reloads.
export const createRoomsSlice = (set) => ({
  roomMeta: {},
  updateRoomMeta: (id, patch) =>
    set((s) => ({
      roomMeta: { ...s.roomMeta, [id]: { ...(s.roomMeta[id] ?? {}), ...patch } },
    })),
})
