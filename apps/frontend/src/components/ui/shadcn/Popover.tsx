"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { useState } from "react"

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className = '', align = "center", sideOffset = 4, ...props }, ref) => {
  const [open, setOpen] = useState(false)

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        onOpenAutoFocus={() => setOpen(true)}
        onCloseAutoFocus={() => setOpen(false)}
        className={`z-50 w-72 rounded-md border bg-lightnd dark:bg-darknd p-4 shadow-md outline-0 origin-[--radix-popover-content-transform-origin] ${className}`}
        style={{
          opacity: open ? 1 : 0,
          transform: `
            ${open ? 'scale(0.95)' : 'scale(1)'}
            ${props.side === 'top' ? 'translateY(0.5rem)' : ''}
            ${props.side === 'bottom' ? 'translateY(-0.5rem)' : ''}
            ${props.side === 'left' ? 'translateX(0.5rem)' : ''}
            ${props.side === 'right' ? 'translateX(-0.5rem)' : ''}
          `,
          transition: 'all 200ms ease'
        }}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
})
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
