import { useEffect, useRef } from "react"
import { useLocation } from 'react-router'
import { AnimatePresence, motion } from "framer-motion"

interface ModalProps {
  children: React.ReactNode
  isOpen?: boolean
  className?: string
  onClose?: () => void
}

const Modal = ({ children, isOpen, className, onClose }: ModalProps) => {
  const innerRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    onClose?.()
  }, [location.pathname])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (innerRef.current && !innerRef.current.contains(e.target as Node)) {
      onClose?.()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          onMouseDown={handleStart}
          onTouchStart={handleStart}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="fixed inset-0 z-50 h-screen flex items-center justify-center md:bottom-0 bottom-16 bg-black/40 dark:text-lightnd text-darknd"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="bg-lightnd dark:bg-dark rounded-md max-w-[90vw] shadow-lg border border-muted/20 relative overflow-y-auto overflow-x-hidden"
          >
            <div
              ref={innerRef}
              className={`flex flex-col max-h-[80vh] ${className || 'w-fit h-fit'}`}
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default Modal
