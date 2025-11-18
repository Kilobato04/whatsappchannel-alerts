/**
 * Lambda Function: Generar Alerta de Calidad del Aire - commit 18112025
 */
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Crear cliente S3 con AWS SDK v3 (más estable que v2)
const s3Client = new S3Client({
    region: 'us-east-1'
});

// Configuración
const CONFIG = {
    S3_BUCKET: process.env.S3_BUCKET || 'smability-whatsapp-alerts',
    PANEL_URL: process.env.PANEL_URL || 'https://whatsairegpt.netlify.app',
    API_URL: process.env.API_URL || 'https://y4zwdmw7vf.execute-api.us-east-1.amazonaws.com/prod/api/air-quality/ias/current',
    CLOUDFRONT_URL: process.env.CLOUDFRONT_URL || null
};

/**
 * Handler principal
 */
exports.handler = async (event) => {
    console.log('🚀 Iniciando generación de alerta...');
    console.log('Event:', JSON.stringify(event, null, 2));
    
    let browser = null;
    
    try {
        const worstStation = await getWorstStation();
        console.log(`📍 Estación: ${worstStation.station_name} (IAS: ${worstStation.ias.value})`);
        
        browser = await launchBrowser();
        const imageBuffer = await capturePanel(browser, worstStation);
        console.log(`📸 Captura generada: ${imageBuffer.length} bytes`);
        
        const imageUrl = await uploadToS3(imageBuffer, worstStation);
        console.log(`☁️ Imagen subida: ${imageUrl}`);
        
        // Generar mensaje optimizado
        const messageData = generateWhatsAppMessage(worstStation);
        console.log(`💬 Mensaje generado con ${messageData.recommendations.length} caracteres de recomendaciones`);
        
        // Publicar en Telegram
        const telegramResult = await publishToTelegram(imageUrl, messageData, worstStation);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                station: {
                    id: worstStation.station_id,
                    name: worstStation.station_name,
                    ias: worstStation.ias.value,
                    category: worstStation.ias.category,
                    city: worstStation.city
                },
                image: {
                    url: imageUrl,
                    size: imageBuffer.length
                },
                message: whatsappMessage,
                telegram: telegramResult,  // ⭐ AGREGAR ESTO
                timestamp: new Date().toISOString()
            })
        };
        
    } catch (error) {
        console.error('❌ Error:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message,
                stack: error.stack
            })
        };
        
    } finally {
        if (browser) {
            await browser.close();
            console.log('🔒 Browser cerrado');
        }
    }
};

/**
 * Obtener estación con peor IAS
 */
async function getWorstStation() {
    console.log('📊 Consultando API de calidad del aire...');
    
    const https = require('https');
    
    return new Promise((resolve, reject) => {
        https.get(CONFIG.API_URL, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const stations = Array.isArray(parsed) ? parsed : parsed.stations;
                    
                    if (!stations || stations.length === 0) {
                        throw new Error('No hay datos de estaciones disponibles');
                    }
                    
                    const worstStation = stations.reduce((worst, current) => {
                        const worstIAS = worst.ias?.value || 0;
                        const currentIAS = current.ias?.value || 0;
                        return currentIAS > worstIAS ? current : worst;
                    });
                    
                    resolve(worstStation);
                    
                } catch (error) {
                    reject(error);
                }
            });
            
        }).on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * Lanzar navegador Chromium
 */
async function launchBrowser() {
    console.log('🌐 Lanzando Chromium...');
    
    const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: {
            width: 480,
            height: 1200,
            deviceScaleFactor: 2
        },
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
    });
    
    console.log('✅ Chromium lanzado');
    return browser;
}

/**
 * Capturar panel con Puppeteer
 */
async function capturePanel(browser, station) {
    console.log('📸 Capturando panel...');
    
    const page = await browser.newPage();
    
    await page.setViewport({
        width: 480,
        height: 1200,
        deviceScaleFactor: 2
    });
    
    console.log(`🔗 Navegando a: ${CONFIG.PANEL_URL}`);
    await page.goto(CONFIG.PANEL_URL, {
        waitUntil: 'networkidle0',
        timeout: 30000
    });
    
    await page.waitForSelector('.whatsapp-alert-panel', { timeout: 10000 });
    
    await page.waitForFunction(
        () => {
            const iasElement = document.getElementById('iasValue');
            return iasElement && iasElement.textContent !== '--';
        },
        { timeout: 15000 }
    );
    
    console.log('⏳ Panel cargado, esperando 2 segundos para gráfica...');
    await page.waitForTimeout(2000);
    
    const panelElement = await page.$('.whatsapp-alert-panel');
    const boundingBox = await panelElement.boundingBox();
    
    console.log('📐 Dimensiones del panel:', {
        width: Math.round(boundingBox.width),
        height: Math.round(boundingBox.height)
    });
    
    const screenshot = await panelElement.screenshot({
        type: 'jpeg',
        quality: 90
    });
    
    console.log('✅ Captura completada');
    return screenshot;
}

/**
 * Subir imagen a S3 con AWS SDK v3 (con sanitización de metadata)
 */
async function uploadToS3(imageBuffer, station) {
    console.log('☁️ Subiendo a S3...');
    
    const timestamp = Date.now();
    const fileName = `alert-${station.station_id}-${timestamp}.jpg`;
    const key = `alertas/${fileName}`;
    
    // Función helper para sanitizar metadata (solo caracteres ASCII)
    const sanitizeMetadata = (str) => {
        if (!str) return '';
        return str
            .normalize('NFD')  // Descomponer caracteres acentuados
            .replace(/[\u0300-\u036f]/g, '')  // Remover acentos
            .replace(/[^\x00-\x7F]/g, '')  // Remover caracteres no-ASCII
            .trim();
    };
    
    const command = new PutObjectCommand({
        Bucket: CONFIG.S3_BUCKET,
        Key: key,
        Body: imageBuffer,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=3600',
        Metadata: {
            'station-id': sanitizeMetadata(station.station_id),
            'station-name': sanitizeMetadata(station.station_name),  // "Tultitlán" → "Tultitlan"
            'ias': String(station.ias.value),
            'category': sanitizeMetadata(station.ias.category),
            'timestamp': new Date().toISOString()
        }
    });
    
    try {
        await s3Client.send(command);
        console.log('✅ Imagen subida exitosamente a S3');
    } catch (error) {
        console.error('❌ Error subiendo a S3:', error);
        throw error;
    }
    
    if (CONFIG.CLOUDFRONT_URL) {
        return `${CONFIG.CLOUDFRONT_URL}/${key}`;
    }
    
    return `https://${CONFIG.S3_BUCKET}.s3.amazonaws.com/${key}`;
}

/**
 * Generar mensaje con recomendaciones optimizado para Telegram (<780 chars)
 */
function generateWhatsAppMessage(station) {
    const category = station.ias.category;
    
    // Mapeo de riesgo según categoría
    const riskLevel = {
        'Buena': 'Ninguno',
        'Aceptable': 'Bajo, solo grupos sensibles',
        'Mala': 'Moderado para toda la población',
        'Muy Mala': 'Alto para toda la población',
        'Extremadamente Mala': 'Crítico para todos'
    };
    
    const risk = riskLevel[category] || 'Consulta información oficial';
    
    // Recomendaciones optimizadas por categoría
    let recommendations = '';
    
    switch(category) {
        case 'Buena':
            recommendations = `✅ *Recomendaciones:*
- Calidad del aire aceptable
- Disfruta actividades al aire libre`;
            break;
            
        case 'Aceptable':
            recommendations = `⚠️ *Recomendaciones:*
- Grupos sensibles: limita esfuerzos prolongados al aire libre
- Población general puede realizar actividades normalmente`;
            break;
            
        case 'Mala':
            recommendations = `🚨 *Recomendaciones:*
- Población general: reduce actividades intensas al aire libre
- Niños, adultos mayores y personas con problemas respiratorios: limita salidas
- Usa cubrebocas si sales`;
            break;
            
        case 'Muy Mala':
            recommendations = `⛔ *Recomendaciones:*
- Evita actividades al aire libre
- Grupos sensibles: permanece en interiores
- Cierra ventanas y puertas
- Usa cubrebocas KN95 si debes salir`;
            break;
            
        case 'Extremadamente Mala':
            recommendations = `🆘 *EMERGENCIA - Recomendaciones:*
- TODOS: permanece en interiores
- Cierra puertas y ventanas
- Usa purificador de aire si es posible
- Evita ejercicio incluso en interiores
- Consulta médico si tienes síntomas`;
            break;
            
        default:
            recommendations = `⚠️ *Recomendaciones:*
- Consulta información oficial en tiempo real`;
    }
    
    return {
        recommendations: recommendations,
        risk: risk
    };
}

/**
 * Publicar en Telegram Channel (optimizado <780 caracteres)
 */
async function publishToTelegram(imageUrl, messageData, station) {
    console.log('📱 Publicando en Telegram...');
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;
    
    if (!botToken || !channelId) {
        console.log('⚠️ Credenciales de Telegram no configuradas, saltando publicación');
        return { skipped: true, reason: 'No credentials' };
    }
    
    const axios = require('axios');
    
    try {
        // Emoji según categoría
        const categoryEmoji = {
            'Buena': '✅',
            'Aceptable': '⚠️',
            'Mala': '🚨',
            'Muy Mala': '⛔',
            'Extremadamente Mala': '🆘'
        };
        
        const emoji = categoryEmoji[station.ias.category] || '📊';
        
        // Obtener información del contaminante
        const pollutant = station.ias.pollutant || 'N/A';
        const pollutantValue = station.ias.pollutant_value || station.ias.value;
        const pollutantUnit = station.ias.pollutant_unit || 'µg/m³';
        
        // Formatear fecha y hora
        const dateTime = new Date().toLocaleString('es-MX', { 
            timeZone: 'America/Mexico_City',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Construir mensaje optimizado
        const telegramCaption = `${emoji} *Alerta de Calidad del Aire*

📍 *${station.station_name}*, ${station.city}
📊 *IAS: ${station.ias.value}* - ${station.ias.category}
🧪 Contaminante: ${pollutant} (${pollutantValue} ${pollutantUnit})
⚠️ Riesgo: ${messageData.risk}

${messageData.recommendations}

💬 [AIreGPT - alertas en WhatsApp](https://wa.me/525519566483)
🗺️ [Mapa](https://smability.io/airegpt/network/map.html)
📊 [Widget](https://whatsairegpt.netlify.app)

_${dateTime}_`;

        const captionLength = telegramCaption.length;
        console.log(`📏 Caption: ${captionLength} caracteres`);
        
        // Verificación de seguridad
        if (captionLength > 780) {
            console.warn(`⚠️ ADVERTENCIA: Mensaje excede 780 chars (${captionLength})`);
        }

        // Enviar foto con caption
        const response = await axios.post(
            `https://api.telegram.org/bot${botToken}/sendPhoto`,
            {
                chat_id: channelId,
                photo: imageUrl,
                caption: telegramCaption,
                parse_mode: 'Markdown'
            },
            {
                timeout: 10000
            }
        );
        
        console.log(`✅ Publicado en Telegram (${captionLength} chars)`);
        
        return {
            success: true,
            messageId: response.data.result?.message_id,
            channelId: channelId,
            captionLength: captionLength
        };
        
    } catch (error) {
        console.error('❌ Error publicando en Telegram:', error.response?.data || error.message);
        
        return {
            success: false,
            error: error.response?.data?.description || error.message
        };
    }
}

/**
 * Obtener recomendaciones cortas según categoría
 */
function getShortRecommendations(category) {
    const recommendations = {
        'Buena': '✅ Calidad del aire aceptable. Disfruta actividades al aire libre.',
        'Aceptable': '⚠️ Grupos sensibles: limita actividades intensas prolongadas.',
        'Mala': '🚨 Grupos sensibles: evita actividades al aire libre.',
        'Muy Mala': '⛔ Todos: evita actividades prolongadas al aire libre.',
        'Extremadamente Mala': '🆘 EMERGENCIA: permanece en interiores con ventanas cerradas.'
    };
    
    return recommendations[category] || '⚠️ Consulta recomendaciones oficiales.';
}
