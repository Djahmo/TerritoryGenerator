"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className = "", ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    className={`inline-flex h-5 w-9 items-center rounded-full border-2 border-transparent transition-colors cursor-pointer shadow-sm
      focus-visible:outline-0 focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2
      disabled:cursor-not-allowed disabled:opacity-50
      data-[state=checked]:bg-accent data-[state=unchecked]:bg-accent-unactive ${className}`}
    {...props}
  >
    <SwitchPrimitives.Thumb
      className="block h-4 w-4 rounded-full bg-light dark:bg-dark shadow-md transition-transform
        data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
    />
  </SwitchPrimitives.Root>
))

Switch.displayName = "Switch"

export { Switch }
