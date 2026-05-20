// Single material swatch used by room + wall material pickers in the
// PropertiesPanel. Renders a small colour chip with a label underneath;
// active state gets a blue ring. Passing `color={null}` shows the default
// (sky-gradient) chip used for "no material set" options.
//
// `title` shows on hover via the browser's native tooltip. When omitted,
// the label is used. Pass `<name> <code>` from a paint catalog for
// at-a-glance identification.
export default function Swatch({ label, color, active, onClick, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      className={`flex flex-col items-center gap-1 p-1 rounded border ${
        active ? 'border-blue-500 bg-gray-800' : 'border-gray-700 hover:border-gray-500'
      }`}
    >
      <div
        style={color ? { background: color } : undefined}
        className={`w-full h-6 rounded-sm ${color ? '' : 'bg-gradient-to-br from-sky-500/30 to-sky-500/10'}`}
      />
      <span className="text-[10px] text-gray-400 truncate w-full text-center">{label}</span>
    </button>
  )
}
