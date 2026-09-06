import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

type Feature = { type: 'Feature'; geometry: unknown; properties: Record<string, string>; id?: string }
type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] }

const RAW_DIR = path.resolve(process.cwd(), 'output')
const ORGANIZED_DIR = path.resolve(process.cwd(), 'organized')
const readJson = async <T>(filePath: string): Promise<T> => JSON.parse(await readFile(filePath, 'utf8')) as T

const writeJson = async (filePath: string, data: unknown): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

const asCollection = (feature: Feature): FeatureCollection => ({ type: 'FeatureCollection', features: [feature] })
const safeName = (name: string): string => name.replace(/[\\/:*?"<>|]/g, '-').trim()
const comparableName = (name: string): string =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/^EL /, '').trim()

async function main(): Promise<void> {
  const departamentos = await readJson<FeatureCollection>(path.join(RAW_DIR, 'all-departamentos.geojson'))
  const provincias = await readJson<FeatureCollection>(path.join(RAW_DIR, 'all-provincias.geojson'))
  const distritos = await readJson<FeatureCollection>(path.join(RAW_DIR, 'all-distritos.geojson'))

  await rm(ORGANIZED_DIR, { recursive: true, force: true })
  let departmentCount = 0
  let provinceCount = 0
  let districtCount = 0

  for (const department of departamentos.features) {
    if (department.properties.TYPE === 'Lake') continue
    const departmentName = safeName(department.properties.name)
    const departmentKey = comparableName(departmentName)
    await writeJson(
      path.join(ORGANIZED_DIR, 'departamentos', departmentName, `${departmentName}.geojson`),
      asCollection(department),
    )
    departmentCount++

    for (const province of provincias.features.filter(
      (feature) => comparableName(feature.properties.DEPARTAMEN ?? '') === departmentKey,
    )) {
      const provinceName = safeName(province.properties.name)
      const provinceDir = path.join(ORGANIZED_DIR, 'departamentos', departmentName, 'provincias', provinceName)
      await writeJson(path.join(provinceDir, `${provinceName}-provincia.geojson`), asCollection(province))
      provinceCount++
      for (const district of distritos.features.filter(
        (feature) =>
          comparableName(feature.properties.DEPARTAMEN ?? '') === departmentKey &&
          comparableName(feature.properties.PROVINCIA ?? '') === comparableName(provinceName),
      )) {
        const districtName = safeName(district.properties.name)
        await writeJson(path.join(provinceDir, `${districtName}-distrito.geojson`), asCollection(district))
        districtCount++
      }
    }
  }

  console.log(`Departamentos: ${departmentCount}`)
  console.log(`Provincias: ${provinceCount}`)
  console.log(`Distritos: ${districtCount}`)
  console.log(`Salida GeoJSON: ${ORGANIZED_DIR}`)
}

main().catch((error) => {
  console.error('No se pudo organizar los GeoJSON:', error)
  process.exit(1)
})
