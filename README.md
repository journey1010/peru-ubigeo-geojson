# PERÚ GEOJSON
# PERÚ UBIGEO
# GeoJSON y Lista de Ubigeos del Perú

> **Fecha de actualización:** 05/09/2026  
> Catálogo administrativo y límites territoriales vectoriales oficiales del Perú.

---

## Descripción

Este repositorio reúne la información geográfica y administrativa actualizada de los **departamentos, provincias y distritos del Perú**. Incluye mapas en formato **GeoJSON** optimizados para proyectos GIS, análisis de datos e integración en visores web/móviles (Leaflet, Mapbox, OpenLayers), junto con sus respectivas correspondencias de **códigos Ubigeo** (INEI/RENIEC).

---

## Estructura del Repositorio

```text
.
├── catalogo/
│   ├── departamentos.json
│   ├── provincias.json
│   └── distritos.json
└── GEOJSONS/
    ├── departamentos.geojson
    ├── provincias.geojson
    ├── distritos.geojson
    └── por_departamento/
        └── [nombre_dep]/
            ├── departamento.geojson
            └── provincias/
                └── [nombre_prov]/
                    └── distritos/
                        ├── provincia.geojson
                        └── [nombre_dist].geojson
```

## Estructuras de datos

Los archivos de tipos describen la estructura de los datos GeoJSON. A continuación se muestran sus formas como JSON.

### Departamentos

```json
{
    "type": "string",
    "name": "string",
    "features": [
        {
            "type": "string",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[[0]]]]
            },
            "properties": {
                "PROVINCIA": "string",
                "name": "string",
                "ID": "string",
                "DEPARTAMEN": "string"
            }
        }
    ]
}
```

### Provincias

```json
{
    "type": "string",
    "features": [
        {
            "type": "string",
            "id": "string",
            "geometry": {
                "type": "MultiPolygon",
                "coordinates": [[[0]]]
            },
            "properties": {
                "name": "string",
                "id": "string",
                "CNTRY": "string",
                "TYPE": "string"
            }
        }
    ]
}
```

### Distritos

```json
{
    "type": "string",
    "name": "string",
    "crs": {
        "type": "string",
        "properties": {
            "name": "string"
        }
    },
    "features": [
        {
            "type": "string",
            "geometry": {
                "type": "MultiPolygon",
                "coordinates": [[[[0]]]]
            },
            "properties": {
                "PROVINCIA": "string",
                "DISTRITO": "string",
                "name": "string",
                "ID": "string",
                "DEPARTAMEN": "string"
            }
        }
    ]
}
```

