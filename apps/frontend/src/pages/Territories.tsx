import { useState } from 'react'
import { Link } from 'react-router'
import { Search, Download, Map, ArrowUpRight } from 'lucide-react'
import { toast } from 'sonner'
import { handleGpxDownload } from '&/useFile'
import { useApiTerritory } from '@/hooks/useApiTerritory'
import MapCard from '@/components/modules/MapCard'
import Input from '@/components/ui/Input'
import Wrapper from '@/components/ui/Wrapper'
import PageHeader from '@/components/ui/PageHeader'
import Loader from '@/components/ui/Loader'

export default function Territories() {
  const { cache, loading, renameTerritory } = useApiTerritory()
  const [search, setSearch] = useState('')
  const territories = cache?.territories ?? []
  const filtered = territories.filter(t => `${t.num} ${t.name}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  const rename = async (num: string, name: string) => {
    try { await renameTerritory(num, name) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Sauvegarde impossible'); throw error }
  }
  return <Wrapper className="page">
    <PageHeader eyebrow="Votre collection" title="Mes territoires" description="Retrouvez vos plans, ajoutez vos repères et préparez votre prochaine sortie."
      actions={<><button className="btn-neutral" disabled={!territories.length} onClick={() => handleGpxDownload(territories)}><Download size={16} />Exporter le GPX</button><Link className="btn-positive" to="/"><Map size={16} />Voir la carte</Link></>} />
    <Loader enabled={loading} />
    {!!territories.length && <div className="collection-toolbar">
      <Input className="collection-search" value={search} onChange={e => setSearch(e.target.value)} type="search" Icon={Search} placeholder="Nom ou numéro du territoire" />
      <span className="result-count" role="status">{filtered.length} territoire{filtered.length > 1 ? 's' : ''}{search ? ` sur ${territories.length}` : ' dans votre collection'}</span>
    </div>}
    <div className="territory-grid">{filtered.map(territory => <MapCard key={territory.num} territory={territory} onRename={rename} />)}</div>
    {!loading && !filtered.length && <div className="empty-state"><Map size={32} />
      <h2>{search ? 'Aucun territoire trouvé' : 'Votre collection commence ici'}</h2>
      <p>{search ? 'Essayez un autre nom ou numéro pour retrouver votre plan.' : 'Importez un fichier CSV ou GPX pour créer vos premières cartes.'}</p>
      {search ? <button className="btn-neutral" onClick={() => setSearch('')}>Effacer la recherche</button> : <Link className="btn-positive" to="/">Importer des territoires<ArrowUpRight size={16} /></Link>}
    </div>}
  </Wrapper>
}
