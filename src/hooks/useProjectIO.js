import { useRef } from 'react'
import useStore from '../store/useStore'
import { getStage } from '../components/canvas/stageHandle'
import {
  buildExportData, validateImport, downloadBlob, downloadDataUrl,
  readJsonFile, timestampForFilename,
} from '../utils/projectIO'

// Bundles the toolbar's PNG export, .studio.json save, and .studio.json
// open flows behind a single hook so Toolbar stays small. Returns the
// three button handlers, plus the ref + change handler to wire onto a
// hidden file input.
export default function useProjectIO() {
  const walls = useStore((s) => s.walls)
  const furniture = useStore((s) => s.furniture)
  const roomMeta = useStore((s) => s.roomMeta)
  const underlay = useStore((s) => s.underlay)
  const loadProject = useStore((s) => s.loadProject)
  const pushToast = useStore((s) => s.pushToast)
  const importInputRef = useRef(null)

  function exportPng() {
    const stage = getStage()
    if (!stage) {
      pushToast('Canvas not ready yet — try again in a moment.', 'error')
      return
    }
    const dataUrl = stage.toDataURL({ pixelRatio: 2 })
    downloadDataUrl(`interior-studio-${timestampForFilename()}.png`, dataUrl)
  }

  function exportJson() {
    const payload = buildExportData({ walls, furniture, roomMeta, underlay })
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    downloadBlob(`interior-studio-${timestampForFilename()}.studio.json`, blob)
  }

  function openJson() {
    importInputRef.current?.click()
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-importing the same file
    if (!file) return
    const hasExisting = walls.length > 0 || furniture.length > 0 || !!underlay
    if (hasExisting && !window.confirm('Replace your current design with the imported project? This cannot be undone.')) {
      return
    }
    try {
      const raw = await readJsonFile(file)
      const data = validateImport(raw)
      loadProject(data)
      pushToast('Project loaded.', 'info')
    } catch (err) {
      pushToast(err?.message ?? 'Could not open that file.', 'error')
    }
  }

  return { exportPng, exportJson, openJson, importInputRef, handleImportFile }
}
