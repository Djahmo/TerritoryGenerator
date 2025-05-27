import { useParams, useNavigate } from "react-router"
import { useTranslation } from "react-i18next"
import Wrapper from "#/ui/Wrapper"
import { useTerritoryCache } from "@/hooks/useTerritoryCache"
import Paint from "@/components/modules/Paint"
import { finalWidth, finalHeight } from "@/hooks/useConfig"

const Territory = () => {
  const { num } = useParams<{ num: string }>()
  const { t } = useTranslation()
  const { cache } = useTerritoryCache()
  const navigate = useNavigate()

  // Cherche le territoire
  const territory = cache?.territories?.find(t => t.num === num)

  if (!territory)
    return (
      <Wrapper className="mt-4 px-4 flex flex-col items-center gap-6 overflow-y-auto h-full">
        <h1 className="text-2xl font-bold">{t("territory.notfound", "Territoire introuvable")}</h1>
        <button onClick={() => navigate(-1)} className="btn-primary px-4 py-2 rounded mt-2">
          {t("common.back", "Retour")}
        </button>
      </Wrapper>
    )

  return (
    <Wrapper className="mt-4 px-4 pb-8 flex flex-col items-center gap-6 overflow-y-auto h-full">
      <h1 className="text-3xl font-bold">{t("territory.view", `Territoire ${territory.num} - ${territory.name}`)}</h1>

      <div className="w-full flex justify-center">
        <div className=" rounded-lg overflow-hidden border border-muted/50 shadow-xl bg-white/80 max-w-[90vw] md:max-w-[60vw] w-full flex justify-center items-center p-4 " style={{ minHeight: 100 }} >
          <Paint src={territory.large || territory.image || ""} width={finalWidth} height={finalHeight} />
        </div>
      </div>
    </Wrapper>
  )
}

export default Territory
