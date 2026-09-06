import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright";

import { url as departamentosUrl } from "./departaments.type";
import type { Root as DepartamentosRoot } from "./departaments.type";
import { url as provinciasBaseUrl } from "../provinces.type";
import type {
  Root as ProvinciasRoot,
  Feature as ProvinciaFeature,
} from "../provinces.type";
import { url as distritosBaseUrl } from "./districts.type";
import type {
  Root as DistritosRoot,
  Feature as DistritoFeature,
} from "./districts.type";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OUT_DIR = path.resolve(process.cwd(), "output");
const PROVINCES_DIR = path.join(OUT_DIR, "provinces");
const DISTRICTS_DIR = path.join(PROVINCES_DIR, "districts");

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 8000;

// Límite conservador para no saturar el servidor público.
const REQUEST_INTERVAL_MS = 2500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function rateLimit(): Promise<void> {
  await sleep(REQUEST_INTERVAL_MS);
}

async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}

// Cloudflare requiere una sesión de navegador. El navegador se abre visible
// para completar cualquier verificación que el sitio presente.
let browser: Browser;
let page: Page;

async function initBrowser(): Promise<void> {
  browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  page = await context.newPage();
}

async function closeBrowser(): Promise<void> {
  await browser?.close();
}

async function fetchJson<T>(url: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      if (!res) throw new Error("sin respuesta");
      const body = await res.text();
      if (!res.ok() || body.trim().startsWith("<")) {
        throw new Error(`bloqueado/HTTP ${res.status()}`);
      }
      return JSON.parse(body) as T;
    } catch (err) {
      lastError = err;
      console.warn(
        `  intento ${attempt}/${MAX_RETRIES} fallo para ${url}: ${(err as Error).message}`,
      );
      if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  throw new Error(
    `No se pudo descargar ${url}: ${(lastError as Error)?.message}`,
  );
}

async function saveJson(filePath: string, data: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, JSON.stringify(data), "utf-8");
}

async function readExistingJson<T>(filePath: string): Promise<T | undefined> {
  if (!existsSync(filePath)) return undefined;
  try {
    return JSON.parse(await readFile(filePath, "utf-8")) as T;
  } catch {
    console.warn(
      `  Archivo existente inválido; se volverá a descargar: ${filePath}`,
    );
    return undefined;
  }
}

async function getJson<T>(url: string, filePath: string): Promise<T> {
  const existing = await readExistingJson<T>(filePath);
  if (existing) return existing;
  await rateLimit();
  const data = await fetchJson<T>(url);
  await saveJson(filePath, data);
  return data;
}

function featureCollection(features: unknown[]) {
  return { type: "FeatureCollection", features };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await ensureDir(OUT_DIR);
  await ensureDir(PROVINCES_DIR);
  await ensureDir(DISTRICTS_DIR);
  await initBrowser();

  // 1. Departamentos (archivo unico, url fija)
  console.log(
    "Abrió Chromium. Completa la verificación de Cloudflare si aparece; luego vuelve a esta terminal.",
  );
  console.log("Descargando departamentos...");
  const departamentosPath = path.join(OUT_DIR, "departamentos.geojson");
  const departamentos = await getJson<DepartamentosRoot>(
    departamentosUrl,
    departamentosPath,
  );
  await saveJson(
    path.join(OUT_DIR, "all-departamentos.geojson"),
    departamentos,
  );
  console.log(`  ${departamentos.features.length} departamentos guardados.`);

  const allProvinciaFeatures: ProvinciaFeature[] = [];
  const allDistritoFeatures: DistritoFeature[] = [];
  const errors: string[] = [];

  // 2. Provincias por departamento. El archivo de ONPE usa el id GeoJSON
  // numérico (p. ej. 150000), no properties.id (PE-LIM).
  for (const deptFeature of departamentos.features) {
    if (deptFeature.properties.TYPE === "Lake") continue;
    const deptId = deptFeature.id;
    const deptName = deptFeature.properties.name;
    const provinciaUrl = `${provinciasBaseUrl}${deptId}.json`;

    console.log(`Descargando provincias de ${deptName} (id=${deptId})...`);
    let provincias: ProvinciasRoot;
    try {
      const provinciaPath = path.join(PROVINCES_DIR, `${deptId}.geojson`);
      provincias = await getJson<ProvinciasRoot>(provinciaUrl, provinciaPath);
    } catch (err) {
      errors.push(`provincias deptId=${deptId}: ${(err as Error).message}`);
      console.error(
        `  ERROR provincias deptId=${deptId}: ${(err as Error).message}`,
      );
      continue;
    }

    allProvinciaFeatures.push(...provincias.features);

    // 3. Distritos por cada provincia (id sacado de properties.ID)
    for (const provFeature of provincias.features) {
      const provId = provFeature.properties.ID;
      const provName = provFeature.properties.name;
      const distritoUrl = `${distritosBaseUrl}${provId}.json`;

      console.log(`  Descargando distritos de ${provName} (id=${provId})...`);
      try {
        const distritoPath = path.join(DISTRICTS_DIR, `${provId}.geojson`);
        const distritos = await getJson<DistritosRoot>(
          distritoUrl,
          distritoPath,
        );
        allDistritoFeatures.push(...distritos.features);
      } catch (err) {
        errors.push(`distritos provId=${provId}: ${(err as Error).message}`);
        console.error(
          `  ERROR distritos provId=${provId}: ${(err as Error).message}`,
        );
      }
    }
  }

  // 4. Archivos combinados
  await saveJson(
    path.join(OUT_DIR, "all-provincias.geojson"),
    featureCollection(allProvinciaFeatures),
  );
  await saveJson(
    path.join(OUT_DIR, "all-distritos.geojson"),
    featureCollection(allDistritoFeatures),
  );

  console.log("\n== Resumen ==");
  console.log(`Departamentos: ${departamentos.features.length}`);
  console.log(`Provincias: ${allProvinciaFeatures.length}`);
  console.log(`Distritos: ${allDistritoFeatures.length}`);
  if (errors.length) {
    console.log(`\nErrores (${errors.length}):`);
    errors.forEach((e) => console.log(`  - ${e}`));
  }

  await closeBrowser();
}

main().catch(async (err) => {
  console.error("Fallo fatal:", err);
  await closeBrowser();
  process.exit(1);
});
