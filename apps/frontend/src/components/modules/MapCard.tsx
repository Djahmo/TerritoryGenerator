import type { Territory } from "%/types/"
import { useTranslation } from "react-i18next"
import Loader from "@/components/ui/Loader"
import { FC, useState } from "react"
import { Check } from "lucide-react"
import { Link } from "react-router"

type MapCardProps = {
  territory: Territory
  onRename?: (num: string, nom: string) => void
  visible?: boolean
}

const MapCard: FC<MapCardProps> = ({ territory, onRename, visible }) => {
  const { t } = useTranslation()
  const { num, miniature, name, isDefault } = territory

  const [editMode, setEditMode] = useState(false)
  const [inputNum, setInputNum] = useState(num)
  const [inputName, setInputNom] = useState(name || "")

  if (!miniature) return null

  const handleValidate = () => {
    setEditMode(false)
    if (onRename) onRename(inputNum, inputName)
  }

  return (
    <div className=" relative bg-muted/60 border border-muted/50 rounded-lg shadow-xl hover:shadow-2xl p-0 w-90 flex flex-col items-center overflow-hidden cursor-pointer hover:scale-102 transition duration-100 ease-in-out"
      style={{ display: !visible ? "none" : "flex" }}>
      {!editMode ? (
        <span
          className="absolute top-3 left-3 bg-positive text-white text-xs px-3 py-1 rounded-full font-bold shadow-sm z-10 cursor-pointer hover:bg-positive-hover transition"
          onClick={() => setEditMode(true)}
          title={t("home.rename_territory", "Renommer le territoire")}
        >
          {inputNum} - {inputName}
        </span>
      ) : (
        <div className="absolute top-3 left-3 w-[calc(100%-1.5rem)] flex items-center bg-positive rounded-full px-2 py-1 z-10 shadow gap-2">
          <input
            value={inputNum}
            onChange={e => setInputNum(e.target.value)}
            className="w-12 px-1 text-xs text-white font-bold outline-0"
            placeholder={t("home.num_placeholder", "Numéro")}
            onKeyDown={e => e.key === "Enter" && handleValidate()}
            />
          <span className="mx-1 -mt-1 text-white text-lg font-extralight select-none">-</span>
          <input
            value={inputName}
            onChange={e => setInputNom(e.target.value)}
            className="flex-1 px-1 text-xs text-white font-bold outline-0"
            placeholder={t("home.nom_placeholder", "Nom")}
            onKeyDown={e => e.key === "Enter" && handleValidate()}
            autoFocus
          />
          <button onClick={handleValidate} className="ml-1 text-success hover:text-success-hover transition cursor-pointer">
            <Check size={18} strokeWidth={3} />
          </button>
        </div>
      )}

      <Link to={"/territory/"+num} className="w-full from-gray-200 via-gray-100 to-white flex items-center justify-center relative overflow-hidden">
        <img
          src={miniature}
          alt={`Territoire ${inputNum}`}
          className={`object-contain w-full h-full transition-opacity duration-300 `}
        />
        <Loader enabled={isDefault} />
      </Link>
    </div>
  )
}

export default MapCard
