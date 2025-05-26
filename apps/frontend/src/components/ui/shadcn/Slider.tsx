"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={`relative flex w-full items-center touch-none select-none ${className ?? ''}`}
    {...props}
  >
    <SliderPrimitive.Track className="relative w-full h-1.5 grow overflow-hidden rounded-full bg-muted/20">
      <SliderPrimitive.Range className="absolute h-full bg-accent" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className="
        block h-4 w-4 rounded-full border bg-light dark:bg-dark shadow
        transition-colors
        focus:outline-none focus:ring-1 focus:ring-ring
        disabled:pointer-events-none disabled:opacity-50
      "
    />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
