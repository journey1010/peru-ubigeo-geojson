export const url = 'https://resultadohistorico-eg2026.onpe.gob.pe/assets/lib/amcharts5/geodata/json/departamentos';

export interface Root {
  features: Feature[]
  name: string
  type: string
}

export interface Feature {
  geometry: Geometry
  type: string
  properties: Properties
}

export interface Geometry {
  coordinates: number[][][][]
  type: string
}

export interface Properties {
  PROVINCIA: string
  name: string
  ID: string
  DEPARTAMEN: string
}
