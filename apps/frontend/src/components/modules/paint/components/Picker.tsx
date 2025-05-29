import React, { useState } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "#/ui/shadcn"
import { ChromePicker, ColorResult } from "react-color"
import { useConfig } from "@/hooks/useConfig"

const getBackground = (color: string) => {
  const { a } = fromColorString(color)
  const alpha = 1 - (a ?? 1)
  return {
    backgroundImage: `
    linear-gradient(45deg, rgba(238,238,238,${alpha}) 25%, transparent 25%, transparent 75%, rgba(238,238,238,${alpha}) 75%),
    linear-gradient(45deg, rgba(238,238,238,${alpha}) 25%, transparent 25%, transparent 75%, rgba(238,238,238,${alpha}) 75%)
  `,
    backgroundSize: "12px 12px",
    backgroundPosition: "0 0, 6px 6px",
    backgroundColor: color
  }
}

const toRgbaString = ({ r, g, b, a }: { r: number; g: number; b: number; a?: number }) =>
  `rgba(${r},${g},${b},${a ?? 1})`

// Parse un string rgba en objet { r, g, b, a }
const fromColorString = (color: string) => {
  if (color.startsWith("rgba")) {
    const m = color.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/)
    if (!m) return { r: 0, g: 0, b: 0, a: 1 }
    return { r: +m[1], g: +m[2], b: +m[3], a: +m[4] }
  }
  if (color.startsWith("#")) {
    let hex = color.replace("#", "")
    if (hex.length === 3) hex = hex.split("").map(c => c + c).join("")
    const num = parseInt(hex, 16)
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255, a: 1 }
  }
  return { r: 0, g: 0, b: 0, a: 1 }
}

type PickerProps = {
  value: string
  onChange: (color: string) => void
  label?: string
  className?: string
}

const MAX_COLORS = 10

const Picker: React.FC<PickerProps> = ({ value, onChange, label, className }) => {
  const { config, setConfig } = useConfig()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(fromColorString(value))

  const palette = React.useMemo(() => {
    if (config.palette.length < MAX_COLORS) {
      return [...config.palette, ...Array(MAX_COLORS - config.palette.length).fill("rgba(255,255,255,1)")]
    }
    return config.palette.slice(0, MAX_COLORS)
  }, [config.palette])

  const handlePickerChange = (c: ColorResult) => {
    const rgba = toRgbaString(c.rgb)
    setDraft({ ...c.rgb, a: c.rgb.a ?? 1 })
    onChange(rgba)
  }

  const handleCaseClick = (idx: number) => {
    const rgba = palette[idx]
    setDraft(fromColorString(rgba))
    onChange(rgba)
  }

  const handleCaseContextMenu = (idx: number, e: React.MouseEvent) => {
    e.preventDefault()
    const rgba = toRgbaString(draft)
    if (palette[idx] !== rgba) {
      const newPalette = [...palette]
      newPalette[idx] = rgba
      setConfig(cfg => ({ ...cfg, palette: newPalette }))
    }
  }

  React.useEffect(() => { setDraft(fromColorString(value)) }, [value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Ouvrir le sélecteur de couleur"
          className={`w-10 h-10 rounded shadow border border-muted/50 flex items-center justify-center ${className ?? ""}`}
          style={{...getBackground(value)}}
        />
      </PopoverTrigger>
      <PopoverContent className="p-1 flex flex-col items-center w-64 bg-white" align="center">
        {label && <div className="mb-3">{label}</div>}
        <ChromePicker
          color={draft}
          onChange={c => setDraft({ ...c.rgb, a: c.rgb.a ?? 1 })}
          onChangeComplete={handlePickerChange}
          disableAlpha={false}
          styles={{
            default: { picker: { width: "100%", boxShadow: "none" } }
          }}
        />
        <div className="flex flex-col gap-2 mt-3 w-full">
          <div className="flex gap-2 justify-between">
            {palette.slice(0, 5).map((col, idx) => (
              <button
                key={idx}
                type="button"
                title={col}
                className={`w-7 h-7 rounded border outline-0 border-gray-300 flex items-center justify-center`}
                style={{...getBackground(col)}}
                onClick={() => handleCaseClick(idx)}
                onContextMenu={e => handleCaseContextMenu(idx, e)}
              />
            ))}
          </div>
          <div className="flex gap-2 justify-between">
            {palette.slice(5, 10).map((col, idx) => (
              <button
                key={idx + 5}
                type="button"
                title={col}
                className={`w-7 h-7 rounded outline-0 border border-gray-300 flex items-center justify-center`}
                style={{...getBackground(col)}}
                onClick={() => handleCaseClick(idx + 5)}
                onContextMenu={e => handleCaseContextMenu(idx + 5, e)}
              />
            ))}
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-1">Clic droit sur une case pour la remplacer</div>
      </PopoverContent>
    </Popover>
  )
}

export default Picker
