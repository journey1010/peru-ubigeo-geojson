export interface Root {
  type: string
  features: Feature[]
}

export interface Feature {
  type: string
  geometry: Geometry
  properties: Properties
  id: string
}

export interface Geometry {
  type: string
  coordinates: number[][][]
}

export interface Properties {
  name: string
  id: string
  CNTRY: string
  TYPE: string
}

export const url = 'https://resultadohistorico-eg2026.onpe.gob.pe/assets/lib/amcharts5/geodata/json/peruLow.json'