
import { Loader2 } from "lucide-react"

interface LoaderProps {
  enabled: boolean
}

const Loader = ({enabled}:LoaderProps) => {
  if(!enabled) return null
  return <div className='bg-dark/10 absolute w-full h-full z-10 flex items-center justify-center'><Loader2 className="animate-spin w-12 h-12 text-light text-positive" /></div>
}

export default Loader
