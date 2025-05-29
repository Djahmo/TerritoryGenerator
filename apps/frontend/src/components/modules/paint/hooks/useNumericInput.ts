import { useCallback } from 'react'

/**
 * Hook réutilisable pour gérer les inputs numériques avec support wheel
 */
export const useNumericInput = (
  value: number,
  setValue: (value: number | ((prev: number) => number)) => void,
  min: number,
  max: number,
  step: number = 1
) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(Number(e.target.value))
  }, [setValue])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -step : step
    setValue((prev: number) => Math.max(min, Math.min(max, prev + delta)))
  }, [setValue, min, max, step])

  return {
    value,
    onChange: handleChange,
    onWheel: handleWheel
  }
}
