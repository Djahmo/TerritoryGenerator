/** Persist document identity and stacking order without changing the SQL schema. */
export type DocumentLayer = {
  id?: string; type: string; visible?: boolean; locked?: boolean;
  style: unknown; data: Record<string, unknown>; timestamp?: number; name?: string;
}
export function encodeLayerData(layer: DocumentLayer, order: number) {
  return JSON.stringify({ ...layer.data, _document: { id: layer.id, order, timestamp: layer.timestamp, name: layer.name } })
}
export function decodeLayer(row: { id: string; layerType: string; layerData: string; style: string; visible: boolean; locked: boolean; createdAt: Date | null }) {
  const { _document, ...data } = JSON.parse(row.layerData)
  return { id: _document?.id ?? row.id, type: row.layerType, data, style: JSON.parse(row.style), visible: row.visible, locked: row.locked,
    timestamp: _document?.timestamp ?? row.createdAt?.getTime() ?? 0, name: _document?.name }
}
export function layerOrder(row: { layerData: string }) {
  const order = JSON.parse(row.layerData)._document?.order
  return typeof order === 'number' ? order : 0
}
