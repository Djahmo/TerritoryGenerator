import { expect, it } from 'vitest'
import { geometryChanged } from '../src/utils/territoryFiles'
import { planGeneration } from '../src/services/generationPlan'
const first = { num: '1', name: 'Centre', polygon: [], image: '/one.png', miniature: '/one.webp', originalLarge: '/wide-original.png', large: '/wide.png' }
const second = { num: '2', name: 'Sud', polygon: [], image: '/two.png', miniature: '/two.webp' }
const describeJobs = (jobs: ReturnType<typeof planGeneration>) => jobs.map(job => `${job.territory.num}:${job.format}`)
it('regenerates complete territories and their existing large plans when requested', () => {
  expect(describeJobs(planGeneration([first, second], [first, second], { regenerateAll: true }))).toEqual(['1:standard', '1:large', '2:standard'])
})
it('keeps unchanged complete images when regeneration is unchecked', () => {
  expect(planGeneration([first, second], [first, second])).toEqual([])
})
it('restores large plans whose geometry invalidated the stored images', () => {
  expect(describeJobs(planGeneration([first], [], { previous: [first] }))).toEqual(['1:standard', '1:large'])
})
it('generates missing thumbnails without creating unrequested large plans or removed territories', () => {
  expect(describeJobs(planGeneration([second], [{ ...second, miniature: undefined }], { previous: [first, second] }))).toEqual(['2:standard'])
})

it('compares GPX and CSV coordinates by value regardless of property order', () => {
  const gpx = { ...first, polygon: [{ lat: 48, lon: 2 }] }
  const csv = { ...first, polygon: [{ lon: 2, lat: 48 }] }
  expect(geometryChanged(gpx, csv)).toBe(false)
  expect(geometryChanged(gpx, { ...csv, polygon: [{ lon: 3, lat: 48 }] })).toBe(true)
})
