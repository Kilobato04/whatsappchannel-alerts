# Lambda Function: Generate Alert

Esta función Lambda genera la imagen de alerta de calidad del aire.

## Funcionalidad

1. Consulta API para obtener estación con peor IAS
2. Genera imagen 1200x630px con Puppeteer
3. Sube imagen a S3
4. Retorna URL de la imagen

## Dependencias

- `@sparticuz/chromium` - Chrome headless
- `puppeteer-core` - Control de Chrome
- `aws-sdk` - SDK de AWS para S3

## Variables de Entorno

- `S3_BUCKET` - Bucket donde guardar imágenes
- `API_URL` - URL de la API de calidad del aire

## Deploy
```bash
cd whatsappchannel-alerts/lambda/generate-alert
git pull origin main
./deploy.sh
```
## Testing Local
```bash
node index.js
```
