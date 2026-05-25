import { useRef } from 'react'
import useStore from '../store/useStore'
import { getStage } from '../components/canvas/stageHandle'
import { getSceneExport } from '../components/viewer3d/sceneExportHandle'
import {
  buildExportData, validateImport, downloadBlob, downloadDataUrl,
  readJsonFile, timestampForFilename,
} from '../utils/projectIO'

// Pixels per metre in Konva world units (matches canvas/constants.js).
const KONVA_PX_PER_M = 50

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

  async function exportPdf() {
    const stage = getStage()
    if (!stage) {
      pushToast('Canvas not ready yet — try again in a moment.', 'error')
      return
    }
    const pixelRatio = 2
    const dataUrl = stage.toDataURL({ pixelRatio })
    const stageScale = stage.scaleX()

    const img = await new Promise((resolve) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.src = dataUrl
    })

    // A4 landscape: 297 × 210 mm, 10 mm margin, 15 mm footer for scale bar.
    const pageW = 297, pageH = 210, margin = 10
    const maxW = pageW - 2 * margin
    const maxH = pageH - 2 * margin - 15
    const aspect = img.width / img.height
    let iw = maxW, ih = iw / aspect
    if (ih > maxH) { ih = maxH; iw = ih * aspect }

    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const ix = (pageW - iw) / 2
    const iy = margin
    doc.addImage(dataUrl, 'PNG', ix, iy, iw, ih)

    // Scale bar: 1 m = KONVA_PX_PER_M * stageScale * pixelRatio PNG pixels
    // = (those pixels / img.width) * iw mm in the PDF.
    const pxPerMeter = KONVA_PX_PER_M * stageScale * pixelRatio
    const mmPerMeter = (pxPerMeter / img.width) * iw
    if (mmPerMeter > 2 && mmPerMeter < pageW) {
      const barY = iy + ih + 7
      doc.setDrawColor(160, 160, 160)
      doc.setLineWidth(0.3)
      doc.line(ix, barY, ix + mmPerMeter, barY)
      doc.line(ix, barY - 1.5, ix, barY + 1.5)
      doc.line(ix + mmPerMeter, barY - 1.5, ix + mmPerMeter, barY + 1.5)
      doc.setFontSize(7)
      doc.setTextColor(160, 160, 160)
      doc.text('0', ix, barY + 3.5)
      doc.text('1 m', ix + mmPerMeter, barY + 3.5, { align: 'center' })
    }

    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text(
      `Interior Studio  ·  ${new Date().toLocaleDateString()}`,
      pageW / 2, pageH - 4,
      { align: 'center' },
    )
    doc.save(`interior-studio-${timestampForFilename()}.pdf`)
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

  async function exportGlb() {
    const exportFn = getSceneExport()
    if (!exportFn) {
      pushToast('Open the 3D view first, then export GLB.', 'error')
      return
    }
    try {
      pushToast('Exporting GLB…', 'info')
      const buffer = await exportFn()
      const blob = new Blob([buffer], { type: 'model/gltf-binary' })
      downloadBlob(`interior-studio-${timestampForFilename()}.glb`, blob)
    } catch (err) {
      pushToast(err?.message ?? 'GLB export failed.', 'error')
    }
  }

  return { exportPng, exportPdf, exportJson, openJson, exportGlb, importInputRef, handleImportFile }
}
