/**
 * Configuración de APIs y constantes
 */

const CONFIG = {
    // URLs de APIs
    API: {
        CURRENT_IAS: 'https://y4zwdmw7vf.execute-api.us-east-1.amazonaws.com/prod/api/air-quality/ias/current',
        HISTORICAL: 'https://y4zwdmw7vf.execute-api.us-east-1.amazonaws.com/prod/api/air-quality/satation/{station_id}/historical'
    },
    
    // Parámetros de consulta
    PARAMS: {
        HISTORICAL_HOURS: 36,
        HISTORICAL_VARIABLE: 'ias'
    },
    
    // Intervalo de actualización (solo :20 de cada hora)
    UPDATE_SCHEDULE: {
        MINUTE: 20  // ← CAMBIO: Solo un intervalo
    },
    
    // Dimensiones del panel (para captura)
    PANEL: {
        WIDTH: 480,
        HEIGHT: 1200
    },
    
    // Traducciones de contaminantes
    POLLUTANTS: {
        'o3': 'Ozono (O₃)',
        'pm25': 'PM2.5',
        'pm10': 'PM10',
        'co': 'Monóxido de Carbono (CO)',
        'no2': 'Dióxido de Nitrógeno (NO₂)',
        'so2': 'Dióxido de Azufre (SO₂)'
    },
    
    // Colores por categoría IAS
    IAS_COLORS: {
        'Buena': '#00E400',
        'Aceptable': '#FFFF00',
        'Mala': '#FF7E00',
        'Muy Mala': '#FF0000',
        'Extremadamente Mala': '#8F3F97'
    },
    
    // Emojis por rango IAS
    IAS_EMOJIS: {
        0: '😊',    // 0-50
        51: '😐',   // 51-100
        101: '😷',  // 101-150
        151: '🤢',  // 151-200
        201: '☠️'   // 201+
    }
};

// Exportar para uso global
window.CONFIG = CONFIG;

console.log('✅ Config loaded');
