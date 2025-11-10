/**
 * Lógica principal del panel de alertas para WhatsApp
 * Basado en master-api-panels.js con simplificaciones
 */

(function() {
    'use strict';
    
    let currentStationData = null;
    let updateInterval = null;
    
    /**
     * Inicializar panel
     */
    async function init() {
        console.log('🚀 Inicializando panel de alertas WhatsApp...');
        
        try {
            await loadWorstStation();
            setupAutoUpdate();
            console.log('✅ Panel inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando panel:', error);
            showError('Error al cargar datos. Intenta recargar la página.');
        }
    }
    
    /**
     * Cargar estación con peor IAS
     */
    async function loadWorstStation() {
        console.log('📊 Buscando estación con peor IAS...');
        
        const response = await fetch(CONFIG.API.CURRENT_IAS);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        const stations = Array.isArray(data) ? data : data.stations;
        
        if (!stations || stations.length === 0) {
            throw new Error('No hay datos de estaciones disponibles');
        }
        
        // Encontrar estación con mayor IAS
        const worstStation = stations.reduce((worst, current) => {
            const worstIAS = worst.ias?.value || 0;
            const currentIAS = current.ias?.value || 0;
            return currentIAS > worstIAS ? current : worst;
        });
        
        console.log(`🎯 Estación con peor IAS: ${worstStation.station_name} (${worstStation.ias.value})`);
        
        currentStationData = worstStation;
        await updatePanel(worstStation);
    }
    
    /**
     * Actualizar panel con datos de estación
     */
    async function updatePanel(station) {
        console.log(`🔄 Actualizando panel para: ${station.station_name}`);
        
        // Header
        updateElement('stationName', station.station_name);
        updateElement('stationSubtitle', getDeviceTypeLabel(station.device_type));
        
        // IAS Principal
        const ias = station.ias;
        updateElement('iasValue', ias.value);
        updateElement('iasCategory', ias.category);
        updateElement('iasRisk', ias.risk_level);
        updateElement('iasEmoji', getIASEmoji(ias.value));
        
        // Indicador circular
        const indicator = document.getElementById('iasIndicator');
        if (indicator) {
            indicator.style.backgroundColor = ias.color_code;
        }
        
        // Colores dinámicos
        updatePanelColors(ias.color_code, ias.value);
        
        // Contaminante dominante
        const pollutantName = CONFIG.POLLUTANTS[ias.dominant_pollutant] || ias.dominant_pollutant.toUpperCase();
        updateElement('dominantPollutant', pollutantName);
        updateElement('pollutantValue', `${ias.dominant_value.value.toFixed(2)} ${ias.dominant_value.unit}`);
        
        // Recomendaciones de salud
        const health = station.health_recommendations;
        updateElement('healthGroupA', health.a.recommendation);
        updateElement('healthGroupB', health.b.recommendation);
        updateElement('healthGroupC', health.c.recommendation);
        
        // Última actualización
        updateLastReading();
        
        // Cargar gráfica histórica
        await loadHistoricalChart(station.station_id, station.station_name);
    }
    
    /**
     * Cargar y renderizar gráfica histórica
     */
    async function loadHistoricalChart(stationId, stationName) {
        console.log(`📈 Cargando gráfica para ${stationId}...`);
        
        const url = CONFIG.API.HISTORICAL
            .replace('{station_id}', stationId) +
            `?variable=${CONFIG.PARAMS.HISTORICAL_VARIABLE}&hours=${CONFIG.PARAMS.HISTORICAL_HOURS}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const apiResponse = await response.json();
            
            if (!apiResponse.data || apiResponse.data.length === 0) {
                console.warn('No hay datos históricos disponibles');
                showChartPlaceholder('No hay datos históricos disponibles');
                return;
            }
            
            renderChart(apiResponse.data, stationName);
            
        } catch (error) {
            console.error('Error cargando gráfica:', error);
            showChartPlaceholder('Error al cargar gráfica');
        }
    }
    
    /**
     * Renderizar gráfica con Plotly
     */
    function renderChart(historicalData, stationName) {
        const chartDiv = document.getElementById('iasChart');
        if (!chartDiv || !window.Plotly) return;
        
        // Procesar datos
        const processedData = historicalData
            .filter(reading => reading.value !== null)
            .map(reading => ({
                timestamp: new Date(reading.timestamp),
                value: reading.value,
                color: getIASColorByValue(reading.value)
            }))
            .sort((a, b) => a.timestamp - b.timestamp);
        
        const trace = {
            x: processedData.map(item => {
                const date = item.timestamp;
                const day = String(date.getDate()).padStart(2, '0');
                const hour = String(date.getHours()).padStart(2, '0');
                return `${day}/${hour}:00`;
            }),
            y: processedData.map(item => item.value),
            type: 'bar',
            name: stationName,
            marker: {
                color: processedData.map(item => item.color),
                line: { color: '#999999', width: 1 },
                opacity: 0.9
            },
            hovertemplate: '<b>%{x}</b><br>IAS: %{y}<extra></extra>'
        };
        
        const layout = {
            margin: { t: 20, r: 15, l: 45, b: 50 },
            yaxis: {
                title: { text: 'IAS', font: { size: 11, color: '#333' } },
                zeroline: false,
                showgrid: true,
                gridcolor: 'rgba(200, 200, 200, 0.3)',
                tickfont: { size: 9, color: '#666' }
            },
            xaxis: {
                showgrid: false,
                tickfont: { size: 8, color: '#666' },
                tickangle: -45
            },
            plot_bgcolor: 'transparent',
            paper_bgcolor: 'transparent',
            font: { family: 'DIN Pro, Arial, sans-serif', color: '#333' },
            showlegend: false,
            bargap: 0.15,
            hovermode: 'closest'
        };
        
        const config = {
            responsive: true,
            displayModeBar: false,
            displaylogo: false
        };
        
        Plotly.newPlot(chartDiv, [trace], layout, config)
            .then(() => {
                console.log('✅ Gráfica renderizada');
            })
            .catch(error => {
                console.error('Error renderizando gráfica:', error);
            });
    }
    
    /**
     * Configurar actualización automática
     */
    function setupAutoUpdate() {
        console.log('⏰ Configurando actualización automática...');
        
        // Limpiar intervalo previo si existe
        if (updateInterval) {
            clearInterval(updateInterval);
        }
        
        // Verificar cada minuto si es hora de actualizar
        updateInterval = setInterval(() => {
            const now = new Date();
            const minutes = now.getMinutes();
            
            // Actualizar en los minutos configurados
            if (minutes === CONFIG.UPDATE_SCHEDULE.FIRST || 
                minutes === CONFIG.UPDATE_SCHEDULE.SECOND) {
                console.log(`🔄 Actualización programada (${minutes} minutos)`);
                loadWorstStation();
            }
        }, 60000); // Verificar cada minuto
        
        console.log(`✅ Actualizaciones programadas: :${CONFIG.UPDATE_SCHEDULE.FIRST} y :${CONFIG.UPDATE_SCHEDULE.SECOND} de cada hora`);
    }
    
    /**
     * Helpers
     */
    
    function updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
    
    function updatePanelColors(colorCode, iasValue) {
        const panel = document.querySelector('.whatsapp-alert-panel');
        if (!panel) return;
        
        const rgb = hexToRgb(colorCode);
        if (rgb) {
            panel.style.setProperty('--alert-color', colorCode);
            panel.style.setProperty('--alert-color-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        }
        
        // Actualizar posición en barra IAS
        updateIASBarPosition(iasValue);
    }
    
    function updateIASBarPosition(iasValue) {
        const iasBar = document.getElementById('iasBar');
        if (!iasBar) return;
        
        let position = 0;
        
        if (iasValue <= 50) {
            position = (iasValue / 50) * 20;
        } else if (iasValue <= 100) {
            position = 20 + ((iasValue - 50) / 50) * 20;
        } else if (iasValue <= 150) {
            position = 40 + ((iasValue - 100) / 50) * 20;
        } else if (iasValue <= 200) {
            position = 60 + ((iasValue - 150) / 50) * 20;
        } else {
            position = 80 + Math.min(((iasValue - 200) / 100) * 20, 20);
        }
        
        position = Math.max(0, Math.min(100, position));
        iasBar.style.setProperty('--ias-position', `${position}%`);
    }
    
    function getDeviceTypeLabel(deviceType) {
        const labels = {
            'reference': 'Monitor de Referencia',
            'smability-SMAA': 'Monitor Smability',
            'smability-SMAAso2': 'Monitor Smability SO₂',
            'smability-SMAAmicro': 'Monitor Smability Micro'
        };
        return labels[deviceType] || 'Monitor';
    }
    
    function getIASEmoji(value) {
        if (value <= 50) return '😊';
        if (value <= 100) return '😐';
        if (value <= 150) return '😷';
        if (value <= 200) return '🤢';
        return '☠️';
    }
    
    function getIASColorByValue(value) {
        if (value <= 50) return '#00E400';
        if (value <= 100) return '#FFFF00';
        if (value <= 150) return '#FF7E00';
        if (value <= 200) return '#FF0000';
        return '#8F3F97';
    }
    
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    function updateLastReading() {
        const now = new Date();
        const formatted = now.toLocaleString('es-MX', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        updateElement('lastUpdate', `Última lectura: ${formatted}`);
    }
    
    function showError(message) {
        const panel = document.querySelector('.whatsapp-alert-panel');
        if (panel) {
            panel.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #cc0000;">
                    <h2>⚠️ Error</h2>
                    <p>${message}</p>
                </div>
            `;
        }
    }
    
    function showChartPlaceholder(message) {
        const chartDiv = document.getElementById('iasChart');
        if (chartDiv) {
            chartDiv.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 200px; color: #666; font-size: 14px;">
                    ${message}
                </div>
            `;
        }
    }
    
    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Exponer para debugging
    window.WhatsAppPanel = {
        reload: loadWorstStation,
        getCurrentStation: () => currentStationData
    };
    
})();

console.log('✅ whatsapp-panel.js loaded');
