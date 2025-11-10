# Guía de Deployment

## Testing Local

### 1. Clonar repositorio
```bash
git clone https://github.com/tu-usuario/smability-whatsapp-alerts.git
cd smability-whatsapp-alerts
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Ejecutar servidor local
```bash
npm run dev
```

Abre: http://localhost:8080

---

## Deployment en Netlify

### 1. Conectar GitHub a Netlify

1. Ve a [Netlify](https://app.netlify.com)
2. Click en "Add new site" → "Import an existing project"
3. Conecta tu cuenta de GitHub
4. Selecciona el repositorio `smability-whatsapp-alerts`

### 2. Configuración de Build

- **Build command:** (dejar vacío)
- **Publish directory:** `public`
- **Branch to deploy:** `main`

### 3. Variables de Entorno

No se requieren variables de entorno para esta fase.

### 4. Deploy

Click en "Deploy site"

URL de ejemplo: `https://smability-whatsapp.netlify.app`

---

## Deployment en AWS Lambda (Fase 2)

### Prerequisitos

- AWS CLI configurado
- Node.js 20.x
- Cuenta de AWS con permisos necesarios

### 1. Preparar función Lambda
```bash
cd lambda/generate-alert
npm install
zip -r function.zip index.js node_modules/ package.json
```

### 2. Crear función en AWS
```bash
aws lambda create-function \
  --function-name smability-generate-alert \
  --runtime nodejs20.x \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 2048
```

### 3. Configurar EventBridge
```bash
# Regla para :05 de cada hora
aws events put-rule \
  --name smability-alert-05 \
  --schedule-expression "cron(5 * * * ? *)"

# Regla para :20 de cada hora
aws events put-rule \
  --name smability-alert-20 \
  --schedule-expression "cron(20 * * * ? *)"
```

### 4. Asociar Lambda con EventBridge
```bash
aws lambda add-permission \
  --function-name smability-generate-alert \
  --statement-id eventbridge-invoke-05 \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-east-1:YOUR_ACCOUNT:rule/smability-alert-05
```

---

## Deployment en WhatsApp Channel (Fase 3)

### 1. Configurar Meta Cloud API

1. Ve a [Facebook Developers](https://developers.facebook.com)
2. Crea una App de tipo "Business"
3. Agrega el producto "WhatsApp"
4. Obtén el `PHONE_ID` y `ACCESS_TOKEN`

### 2. Crear Canal

1. En WhatsApp Business Manager, crea un nuevo Canal
2. Obtén el `CHANNEL_ID`

### 3. Configurar Lambda para publicar

Edita `lambda/publish-whatsapp/index.js` con tus credenciales:
```javascript
const CONFIG = {
    WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN,
    WHATSAPP_PHONE_ID: process.env.WHATSAPP_PHONE_ID,
    CHANNEL_ID: process.env.CHANNEL_ID
};
```

### 4. Variables de entorno en Lambda
```bash
aws lambda update-function-configuration \
  --function-name smability-publish-whatsapp \
  --environment Variables="{
    WHATSAPP_TOKEN=your_token,
    WHATSAPP_PHONE_ID=your_phone_id,
    CHANNEL_ID=your_channel_id
  }"
```

---

## Monitoreo

### CloudWatch Logs
```bash
# Ver logs de Lambda
aws logs tail /aws/lambda/smability-generate-alert --follow
```

### Métricas

- **Invocaciones:** Número de ejecuciones
- **Errores:** Fallos en la ejecución
- **Duración:** Tiempo de ejecución promedio

---

## Rollback

Si hay problemas en producción:
```bash
# Deshabilitar reglas de EventBridge
aws events disable-rule --name smability-alert-05
aws events disable-rule --name smability-alert-20
```

---

## Costos Estimados

| Servicio | Costo Mensual |
|----------|---------------|
| Netlify | $0 (Free tier) |
| Lambda | ~$0.02 |
| S3 (imágenes) | ~$0.02 |
| WhatsApp API | $0 (Canal gratis) |
| **Total** | **~$0.04/mes** |

---

## Soporte

Para reportar issues: [GitHub Issues](https://github.com/tu-usuario/smability-whatsapp-alerts/issues)
