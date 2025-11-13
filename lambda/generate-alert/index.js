/**
 * Lambda Function: Generar Alerta de Calidad del Aire
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
        
        const whatsappMessage = generateWhatsAppMessage(worstStation);
        console.log(`💬 Mensaje generado: ${whatsappMessage.length} caracteres`);
        
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
 * Generar mensaje de WhatsApp con recomendaciones
 */
function generateWhatsAppMessage(station) {
    const ias = station.ias;
    const health = station.health_recommendations;
    
    const emoji = ias.value <= 50 ? '😊' : 
                  ias.value <= 100 ? '😐' : 
                  ias.value <= 150 ? '😷' : 
                  ias.value <= 200 ? '🤢' : '☠️';
    
    const message = `${emoji} *Alerta de Calidad del Aire*

📍 *${station.station_name}* - ${station.city}
📊 IAS: *${ias.value}* (${ias.category})
🧪 Contaminante: ${ias.dominant_pollutant.toUpperCase()} - ${ias.dominant_value.value.toFixed(1)} ${ias.dominant_value.unit}
⚠️ Riesgo: ${ias.risk_level}

*Recomendaciones de Salud:*

👥 *Grupo Sensible:*
${health.a.recommendation}

⚠️ *Grupo Vulnerable:*
${health.b.recommendation}

🌍 *Población General:*
${health.c.recommendation}

🗺️ *Ver mapa en tiempo real:*
https://smability.io/airegpt/network/map.html

💬 *¿Quieres alertas personalizadas de TU zona?*
Chatea con AIreGPT: https://wa.me/525519566483`;

    return message;
}
