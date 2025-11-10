# Documentación de APIs

## Endpoints Utilizados

### 1. Current IAS Data

**URL:** `https://y4zwdmw7vf.execute-api.us-east-1.amazonaws.com/prod/api/air-quality/ias/current`

**Método:** GET

**Descripción:** Obtiene datos actuales de IAS de todas las estaciones.

**Respuesta de ejemplo:**
```json
[
  {
    "station_id": "TLI",
    "station_name": "Tultitlán",
    "device_type": "reference",
    "latitude": "19.60254200",
    "longitude": "-99.17717300",
    "city": "Estado de Mexico",
    "ias": {
      "value": 108,
      "category": "Mala",
      "risk_level": "Alto",
      "color_name": "Naranja",
      "color_code": "#FF7E00",
      "dominant_pollutant": "pm10",
      "dominant_value": {
        "value": 39.259,
        "unit": "μg/m³"
      }
    },
    "health_recommendations": {
      "a": {
        "group_name": "Grupo Sensible",
        "recommendation": "Reduce las actividades físicas vigorosas..."
      },
      "b": {
        "group_name": "Grupo Vulnerable",
        "recommendation": "Es posible realizar actividades físicas moderadas..."
      },
      "c": {
        "group_name": "Población General",
        "recommendation": "Es posible realizar actividades al aire libre..."
      }
    }
  }
]
```

---

### 2. Historical IAS Data

**URL:** `https://y4zwdmw7vf.execute-api.us-east-1.amazonaws.com/prod/api/air-quality/satation/{station_id}/historical`

**Método:** GET

**Parámetros:**
- `variable`: Variable a consultar (ej: `ias`, `pm25`, `o3`)
- `hours`: Número de horas históricas (ej: `36`)

**Ejemplo de URL:**
```
https://y4zwdmw7vf.execute-api.us-east-1.amazonaws.com/prod/api/air-quality/satation/DVL/historical?variable=ias&hours=36
```

**Respuesta de ejemplo:**
```json
{
  "station_id": "DVL",
  "variable": "ias",
  "hours": 36,
  "data": [
    {
      "timestamp": "2024-11-10 08:00",
      "value": 87,
      "unit": "IAS"
    },
    {
      "timestamp": "2024-11-10 09:00",
      "value": 92,
      "unit": "IAS"
    }
  ]
}
```

---

## Categorías IAS

| Rango | Categoría | Color | Emoji |
|-------|-----------|-------|-------|
| 0-50 | Buena | #00E400 | 😊 |
| 51-100 | Aceptable | #FFFF00 | 😐 |
| 101-150 | Mala | #FF7E00 | 😷 |
| 151-200 | Muy Mala | #FF0000 | 🤢 |
| 201+ | Extremadamente Mala | #8F3F97 | ☠️ |

---

## Contaminantes

| Código | Nombre | Unidad |
|--------|--------|--------|
| o3 | Ozono | ppb |
| pm25 | PM2.5 | μg/m³ |
| pm10 | PM10 | μg/m³ |
| co | Monóxido de Carbono | ppm |
| no2 | Dióxido de Nitrógeno | ppb |
| so2 | Dióxido de Azufre | ppb |

---

## Rate Limits

- **Current IAS:** Sin límite establecido
- **Historical:** Sin límite establecido

**Nota:** Usar caché cuando sea posible para optimizar requests.

---

## Códigos de Error

| Código | Descripción |
|--------|-------------|
| 200 | Éxito |
| 400 | Parámetros inválidos |
| 404 | Estación no encontrada |
| 500 | Error del servidor |

---

## Notas de Implementación

1. **Timestamps:** Todos los timestamps están en UTC-6 (Hora de México)
2. **Actualización:** Los datos se actualizan cada hora
3. **Valores null:** Algunos sensores pueden retornar `null` si no hay lecturas
4. **Estaciones offline:** Verificar `reading_status` en respuesta completa
