import Modal from "@/components/ui/Modal"
import Auth from "./Auth"
import { useTranslation } from "react-i18next"
import { X } from "lucide-react"

interface NeedLoginProps {
  isOpen?: boolean
  onClose?: () => void
}

const NeedLogin = ({ isOpen, onClose }: NeedLoginProps) => {
  const { t } = useTranslation()
  return (
    <Modal isOpen={isOpen} onClose={onClose} className={`relative px-6 py-8 flex items-center justify-center`}>
      <X size={20} onClick={onClose} className="absolute top-2 right-2 text-muted cursor-pointer" />
      <h2 className="text-2xl font-bold mb-10">{t('c.md.auth.common.needLogin')}</h2>
      <Auth />
    </Modal>
  )
}

export default NeedLogin
