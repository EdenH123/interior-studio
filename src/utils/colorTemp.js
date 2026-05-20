// Kelvin colour-temperature to sRGB using Tanner Helland's curve fit.
// Valid range: 1000–40000 K.  Values outside are clamped.
//
// Reference: https://tannerhelland.com/2012/09/18/convert-temperature-rgb-algorithm-code.html
export function kelvinToRgb(temp) {
  const t = Math.max(1000, Math.min(40000, temp)) / 100
  let r, g, b

  r = t <= 66
    ? 255
    : clamp(Math.round(329.698727446 * Math.pow(t - 60, -0.1332047592)))

  g = t <= 66
    ? clamp(Math.round(99.4708025861 * Math.log(t) - 161.1195681661))
    : clamp(Math.round(288.1221695283 * Math.pow(t - 60, -0.0755148492)))

  b = t >= 66
    ? 255
    : t <= 19
    ? 0
    : clamp(Math.round(138.5177312231 * Math.log(t - 10) - 305.0447927307))

  return { r, g, b }
}

function clamp(v) { return Math.max(0, Math.min(255, v)) }

export function kelvinToHex(temp) {
  const { r, g, b } = kelvinToRgb(temp)
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}
