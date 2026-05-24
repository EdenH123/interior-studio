import { useState, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import useStore from '../store/useStore'
import { arrayBufferToBase64 } from '../utils/customModelUrls'

// Pass `editModel` (a customModels entry) to open in edit-dimensions mode
// instead of import mode. No file picker shown; only name/dims/color editable.
export default function ImportModelModal({ onClose, editModel }) {
  const addCustomModel    = useStore((s) => s.addCustomModel)
  const updateCustomModel = useStore((s) => s.updateCustomModel)

  const isEdit = !!editModel

  const [file,    setFile]    = useState(null)
  const [label,   setLabel]   = useState(editModel?.label  ?? '')
  const [width,   setWidth]   = useState(editModel ? editModel.width.toFixed(2)  : '')
  const [depth,   setDepth]   = useState(editModel ? editModel.depth.toFixed(2)  : '')
  const [height,  setHeight]  = useState(editModel ? editModel.height.toFixed(2) : '')
  const [color,   setColor]   = useState(editModel?.color ?? '#94a3b8')
  const [error,   setError]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const processFile = useCallback(async (f) => {
    if (!f.name.toLowerCase().endsWith('.glb')) {
      setError('Only .glb files are supported.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const buffer = await f.arrayBuffer()
      const dims = await detectDimensions(buffer)
      setFile({ name: f.name, buffer })
      setLabel(f.name.replace(/\.glb$/i, '').replace(/[-_]/g, ' '))
      if (dims) {
        setWidth(dims.width.toFixed(2))
        setDepth(dims.depth.toFixed(2))
        setHeight(dims.height.toFixed(2))
      }
    } catch {
      setError('Could not read the file. Make sure it is a valid .glb.')
    } finally {
      setLoading(false)
    }
  }, [])

  function handleFileInput(e) {
    const f = e.target.files?.[0]
    if (f) processFile(f)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) processFile(f)
  }

  function handleSubmit() {
    const w = parseFloat(width), d = parseFloat(depth), h = parseFloat(height)
    if (!isEdit && !file)   { setError('Please select a .glb file.'); return }
    if (!label.trim())      { setError('Please enter a name.'); return }
    if (!w || w <= 0 || !d || d <= 0 || !h || h <= 0) {
      setError('Width, depth, and height must be positive numbers.')
      return
    }
    if (isEdit) {
      updateCustomModel(editModel.id, { label: label.trim(), width: w, depth: d, height: h, color })
    } else {
      const glbData = arrayBufferToBase64(file.buffer)
      addCustomModel({ label: label.trim(), width: w, depth: d, height: h, color, glbData })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-96 p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-gray-200 text-sm font-semibold">
            {isEdit ? `Edit "${editModel.label}"` : 'Import 3D Model'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">×</button>
        </div>

        {/* Drop zone — hidden in edit mode */}
        {!isEdit && (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragging ? 'border-blue-500 bg-blue-950/30' : 'border-gray-600 hover:border-gray-500'
            } ${file ? 'border-green-600 bg-green-950/20' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".glb" className="hidden" onChange={handleFileInput} />
            {loading ? (
              <p className="text-gray-400 text-sm">Analysing model…</p>
            ) : file ? (
              <div>
                <p className="text-green-400 text-sm font-mono truncate">{file.name}</p>
                <p className="text-gray-500 text-[11px] mt-1">dimensions auto-detected below</p>
              </div>
            ) : (
              <div>
                <p className="text-gray-400 text-sm">Drop a <span className="font-mono text-gray-300">.glb</span> file here</p>
                <p className="text-gray-600 text-[11px] mt-1">or click to browse</p>
              </div>
            )}
          </div>
        )}

        {/* Name */}
        <label className="flex flex-col gap-1">
          <span className="text-gray-500 text-[11px] uppercase tracking-wider">Name</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="My Chair"
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-gray-200 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>

        {/* Dimensions */}
        <div>
          <span className="text-gray-500 text-[11px] uppercase tracking-wider">Dimensions (metres)</span>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {[['W', width, setWidth], ['D', depth, setDepth], ['H', height, setHeight]].map(([l, v, s]) => (
              <label key={l} className="flex flex-col gap-0.5">
                <span className="text-gray-600 text-[10px]">{l}</span>
                <input
                  type="number" min="0.01" step="0.01"
                  value={v}
                  onChange={(e) => s(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-xs font-mono focus:border-blue-500 focus:outline-none"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Color */}
        <label className="flex items-center gap-3">
          <span className="text-gray-500 text-[11px] uppercase tracking-wider">Tile color</span>
          <div className="relative">
            <div className="w-6 h-6 rounded border border-gray-600" style={{ background: color }} />
            <input
              type="color" value={color} onChange={(e) => setColor(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </div>
          <span className="text-gray-500 text-[11px] font-mono">{color}</span>
        </label>

        {error && <p className="text-red-400 text-[11px]">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isEdit && (!file || loading)}
            className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors"
          >
            {isEdit ? 'Save Changes' : 'Add to Library'}
          </button>
        </div>
      </div>
    </div>
  )
}

function detectDimensions(buffer) {
  return new Promise((resolve) => {
    const loader = new GLTFLoader()
    loader.parse(buffer, '', (gltf) => {
      try {
        const box  = new THREE.Box3().setFromObject(gltf.scene)
        const size = new THREE.Vector3()
        box.getSize(size)
        // Clamp unreasonably tiny values (unscaled models from some exporters).
        const scale = Math.max(size.x, size.y, size.z) < 0.01 ? 100 : 1
        resolve({
          width:  Math.max(0.01, parseFloat((size.x * scale).toFixed(2))),
          depth:  Math.max(0.01, parseFloat((size.z * scale).toFixed(2))),
          height: Math.max(0.01, parseFloat((size.y * scale).toFixed(2))),
        })
      } catch {
        resolve(null)
      }
    }, () => resolve(null))
  })
}
