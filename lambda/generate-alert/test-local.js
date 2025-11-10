/**
 * Test local de la Lambda function
 */

// Simular variables de entorno
process.env.S3_BUCKET = 'smability-whatsapp-alerts';
process.env.PANEL_URL = 'https://whatsairegpt.netlify.app';

const handler = require('./index').handler;

// Simular evento de EventBridge
const event = {
    id: 'test-event-1',
    'detail-type': 'Scheduled Event',
    source: 'aws.events',
    time: new Date().toISOString()
};

// Ejecutar handler
handler(event)
    .then(result => {
        console.log('✅ Test exitoso:');
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Test fallido:');
        console.error(error);
        process.exit(1);
    });
