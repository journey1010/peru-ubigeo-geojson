export interface Root {
  features: Feature[]
  crs: Crs
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
  DISTRITO: string
  name: string
  ID: string
  DEPARTAMEN: string
}

export interface Crs {
  type: string
  properties: Properties2
}

export interface Properties2 {
  name: string
}

export const url = 'https://resultadohistorico-eg2026.onpe.gob.pe/assets/lib/amcharts5/geodata/json/provincias/';
