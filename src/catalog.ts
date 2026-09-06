import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

type SourceFeature = { id?: string; properties: Record<string, string> }
type SourceCollection = { features: SourceFeature[] }

const RAW_DIR = path.resolve(process.cwd(), 'output')
const CATALOG_DIR = path.resolve(process.cwd(), 'catalog')
const readJson = async <T>(filePath: string): Promise<T> => JSON.parse(await readFile(filePath, 'utf8')) as T

const ubigeo = (value: string | undefined, label: string): string => {
  if (!value || !/^\d{6}$/.test(value)) throw new Error(`${label} sin Ubigeo válido`)
  return value
}

async function main(): Promise<void> {
  const [departamentos, provincias, distritos] = await Promise.all([
    readJson<SourceCollection>(path.join(RAW_DIR, 'all-departamentos.geojson')),
    readJson<SourceCollection>(path.join(RAW_DIR, 'all-provincias.geojson')),
    readJson<SourceCollection>(path.join(RAW_DIR, 'all-distritos.geojson')),
  ])

  const departmentRows = departamentos.features
    .filter((feature) => feature.properties.TYPE !== 'Lake')
    .map((feature) => ({ id: ubigeo(feature.id, 'Departamento'), nombre: feature.properties.name }))
  const provinceRows = provincias.features.map((feature) => {
    const id = ubigeo(feature.properties.ID, 'Provincia')
    return { id, nombre: feature.properties.name, departamentoId: `${id.slice(0, 2)}0000` }
  })
  const districtRows = distritos.features.map((feature) => {
    const id = ubigeo(feature.properties.ID, 'Distrito')
    return {
      id,
      nombre: feature.properties.name,
      departamentoId: `${id.slice(0, 2)}0000`,
      provinciaId: `${id.slice(0, 4)}00`,
    }
  })

  await rm(CATALOG_DIR, { recursive: true, force: true })
  await mkdir(CATALOG_DIR, { recursive: true })
  await Promise.all([
    writeFile(path.join(CATALOG_DIR, 'departamentos.json'), `${JSON.stringify(departmentRows, null, 2)}\n`),
    writeFile(path.join(CATALOG_DIR, 'provincias.json'), `${JSON.stringify(provinceRows, null, 2)}\n`),
    writeFile(path.join(CATALOG_DIR, 'distritos.json'), `${JSON.stringify(districtRows, null, 2)}\n`),
  ])

  console.log(`Departamentos: ${departmentRows.length}`)
  console.log(`Provincias: ${provinceRows.length}`)
  console.log(`Distritos: ${districtRows.length}`)
  console.log(`Salida sin geometrías: ${CATALOG_DIR}`)
}

main().catch((error) => {
  console.error('No se pudo crear el catálogo:', error)
  process.exit(1)
})
