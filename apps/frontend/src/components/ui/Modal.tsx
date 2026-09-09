import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router'
interface ModalProps { children: ReactNode; isOpen?: boolean; className?: string; onClose?: () => void; title?: string }

export default function Modal({ children, isOpen, className, onClose, title = 'Fenêtre de dialogue' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const closeRef = useRef(onClose)
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    if (previousPath.current !== pathname) closeRef.current?.()
    previousPath.current = pathname
  }, [pathname])
  useEffect(() => {
    const dialog = ref.current
    if (!dialog || !isOpen) return
    // Native dialogs contain keyboard focus and restore it to the opening control.
    dialog.showModal()
    return () => dialog.close()
  }, [isOpen])
  return createPortal(<dialog ref={ref} className="modal-panel" aria-label={title} onCancel={e => { e.preventDefault(); onClose?.() }}
    onClick={e => {
      if (e.target !== e.currentTarget) return
      const box = e.currentTarget.getBoundingClientRect()
      if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) onClose?.()
    }}>
    {isOpen && <div className={`modal-content ${className || ''}`}>{children}</div>}
  </dialog>, document.body)
}
