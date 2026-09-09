import type { Territory } from '../utils/types'

export type GenerationJob = { territory: Territory; format: 'standard' | 'large' }
export type GenerationOptions = { regenerateAll?: boolean; previous?: Territory[] }

export function planGeneration(territories: Territory[], existing: Territory[], options: GenerationOptions = {}): GenerationJob[] {
  const current = new Map(existing.map(t => [t.num, t]))
  const previous = new Map((options.previous ?? existing).map(t => [t.num, t]))
  return territories.flatMap(territory => {
    const saved = current.get(territory.num)
    const old = previous.get(territory.num)
    const jobs: GenerationJob[] = []
    if (options.regenerateAll || !saved?.image || !saved.miniature) jobs.push({ territory, format: 'standard' })
    // Remember large plans invalidated by a changed polygon during the import.
    const hadLarge = old?.originalLarge || old?.large || saved?.originalLarge || saved?.large
    if (hadLarge && (options.regenerateAll || !saved?.originalLarge || !saved.large)) jobs.push({ territory, format: 'large' })
    return jobs
  })
}
