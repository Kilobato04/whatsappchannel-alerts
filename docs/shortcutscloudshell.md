# 📋 Comandos de Monitoreo - Sistema de Alertas de Calidad del Aire

## 🚀 Comandos Más Importantes (Quick Access)

### Test Rápido de Lambda
```bash
aws lambda invoke --function-name smability-generate-alert --payload '{}' --cli-binary-format raw-in-base64-out /tmp/t.json && sleep 40 && cat /tmp/t.json | jq '.body' -r | jq '.success' && rm /tmp/t.json
```

### Ver Logs Últimos 10 Minutos (Solo Eventos Importantes)
```bash
aws logs tail /aws/lambda/smability-generate-alert --since 10m | grep -E "(Estación|Contaminante|Ciudad|Publicado|Error)"
```

### Ver Última Imagen Generada
```bash
ultima
```

### Abrir Canal de Telegram
```bash
echo "https://t.me/smability"
```

### Ver Estado de Lambda
```bash
aws lambda get-function --function-name smability-generate-alert --query 'Configuration.[FunctionName,LastModified,LastUpdateStatus,CodeSize]' --output table
```

---

## 🧪 Tests Completos

### Test con Resultado Resumido
```bash
rm -f response.json

aws lambda invoke \
  --function-name smability-generate-alert \
  --payload '{}' \
  --cli-binary-format raw-in-base64-out \
  response.json

echo "⏳ Esperando 40 segundos..."
sleep 40

echo ""
echo "=== RESULTADO ==="
cat response.json | jq '.body' -r | jq '{
  success,
  station: {
    name: .station.name,
    ias: .station.ias,
    category: .station.category,
    city: .station.city,
    risk: .station.risk
  },
  telegram: {
    success: .telegram.success,
    captionLength: .telegram.captionLength,
    messageId: .telegram.messageId
  },
  timestamp: .timestamp
}'

rm response.json
```

### Test con Resultado Completo
```bash
rm -f response.json

aws lambda invoke \
  --function-name smability-generate-alert \
  --payload '{}' \
  --cli-binary-format raw-in-base64-out \
  response.json

sleep 40

echo "=== RESULTADO COMPLETO ==="
cat response.json | jq '.body' -r | jq '.'

rm response.json
```

---

## 📊 Monitoreo de Logs

### Ver Logs en Tiempo Real (Últimos 5 Min)
```bash
aws logs tail /aws/lambda/smability-generate-alert --since 5m --follow
```

### Ver Últimas 3 Ejecuciones Completas
```bash
aws logs tail /aws/lambda/smability-generate-alert --since 3h | grep -E "(Iniciando|Estación|IAS:|Contaminante|Ciudad|Caption|Publicado)" | tail -20
```

### Ver Solo Errores (Última Hora)
```bash
aws logs tail /aws/lambda/smability-generate-alert --since 1h | grep -i error
```

### Ver Ejecución de Hora Específica
```bash
# Ejemplo: ejecución de las 18:20
aws logs tail /aws/lambda/smability-generate-alert --since 2h | grep "18:20"
```

---

## 📸 Gestión de Imágenes

### Última Imagen
```bash
ultima
# O comando completo:
./ultima-imagen.sh
```

### Todas las Imágenes de Hoy
```bash
hoy
# O comando completo:
./imagenes-hoy.sh
```

### Solo URL de la Última (Copiar/Pegar)
```bash
url-ultima
```

### Listar Últimas 10 Imágenes
```bash
aws s3 ls s3://smability-whatsapp-alerts/alertas/ --recursive | sort | tail -10
```

### Contar Imágenes de Hoy
```bash
TODAY=$(date +%Y-%m-%d)
aws s3 ls s3://smability-whatsapp-alerts/alertas/ | grep $TODAY | wc -l
```

### Ver Imágenes de Estación Específica
```bash
# Ejemplo: Tultitlán (TLI)
aws s3 ls s3://smability-whatsapp-alerts/alertas/ | grep "alert-TLI"
```

### Descargar Última Imagen Localmente
```bash
LATEST=$(aws s3 ls s3://smability-whatsapp-alerts/alertas/ | grep "alert-" | sort | tail -n 1 | awk '{print $4}')
aws s3 cp s3://smability-whatsapp-alerts/alertas/$LATEST /tmp/latest-alert.jpg
echo "Imagen descargada: /tmp/latest-alert.jpg"
```

---

## 🕐 Verificar Programación

### Ver Regla de EventBridge
```bash
aws events list-rules --name-prefix smability-generate-alert --output table
```

### Ver Detalles de la Programación
```bash
aws events describe-rule --name smability-generate-alert-schedule
```

### Calcular Próximas 5 Ejecuciones
```bash
echo "Próximas ejecuciones (hora CDMX):"
for i in {0..4}; do
  date -d "+$i hours" -u "+%H:20 UTC = " | tr -d '\n'
  date -d "+$i hours -6 hours" "+%H:%M CDMX"
done
```

---

## 🔍 Información de Lambda

### Variables de Entorno
```bash
aws lambda get-function-configuration \
  --function-name smability-generate-alert \
  --query 'Environment.Variables' \
  --output json
```

### Versión Actual del Código
```bash
aws lambda get-function \
  --function-name smability-generate-alert \
  --query 'Configuration.[Version,CodeSha256,LastModified]' \
  --output table
```

### Información Completa de Configuración
```bash
aws lambda get-function-configuration \
  --function-name smability-generate-alert \
  --output json
```

---

## 📈 Métricas de CloudWatch

### Invocaciones Últimas 24 Horas
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=smability-generate-alert \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum \
  --query 'Datapoints[*].[Timestamp,Sum]' \
  --output table
```

### Duración Promedio de Ejecuciones
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=smability-generate-alert \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average,Maximum \
  --output table
```

### Errores Últimas 24 Horas
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=smability-generate-alert \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum \
  --output table
```

---

## 🗄️ Gestión de S3

### Ver Espacio Usado en el Bucket
```bash
aws s3 ls s3://smability-whatsapp-alerts/alertas/ --recursive --summarize | tail -2
```

### Ver Metadata de Última Imagen
```bash
LATEST=$(aws s3 ls s3://smability-whatsapp-alerts/alertas/ | grep "alert-" | sort | tail -n 1 | awk '{print $4}')
aws s3api head-object \
  --bucket smability-whatsapp-alerts \
  --key alertas/$LATEST \
  --query 'Metadata' \
  --output json
```

---

## 🔧 Troubleshooting

### Ver Logs Completos de Última Ejecución
```bash
aws logs tail /aws/lambda/smability-generate-alert --since 30m | tail -50
```

### Verificar Credenciales de Telegram
```bash
aws lambda get-function-configuration \
  --function-name smability-generate-alert \
  --query 'Environment.Variables.[TELEGRAM_BOT_TOKEN,TELEGRAM_CHANNEL_ID]' \
  --output table
```

### Verificar Conectividad con API de Calidad del Aire
```bash
curl -s "https://y4zwdmw7vf.execute-api.us-east-1.amazonaws.com/prod/api/air-quality/ias/current" | jq '.[0] | {station_id, station_name, city, ias}'
```

### Ver Último Mensaje Publicado en Telegram (Logs)
```bash
aws logs tail /aws/lambda/smability-generate-alert --since 30m | grep -A 10 "Caption:"
```

---

## 🔄 Re-deployment

### Re-deployar Código Actualizado desde GitHub
```bash
cd ~/whatsappchannel-alerts
git pull origin main

cd lambda/generate-alert

zip -r /tmp/function-update.zip index.js package.json node_modules/

TIMESTAMP=$(date +%s)

aws s3 cp /tmp/function-update.zip s3://smability-whatsapp-alerts/lambda/function-${TIMESTAMP}.zip

aws lambda update-function-code \
  --function-name smability-generate-alert \
  --s3-bucket smability-whatsapp-alerts \
  --s3-key lambda/function-${TIMESTAMP}.zip \
  --publish

rm /tmp/function-update.zip

echo "✅ Re-deployment completado: function-${TIMESTAMP}.zip"
sleep 30
```

### Verificar Deployment Exitoso
```bash
aws lambda get-function \
  --function-name smability-generate-alert \
  --query 'Configuration.[LastUpdateStatus,LastModified,CodeSize]' \
  --output table
```

---

## 📱 Telegram

### Abrir Canal
```bash
echo "https://t.me/smability"
```

### Verificar Último Mensaje (via logs)
```bash
aws logs tail /aws/lambda/smability-generate-alert --since 1h | grep -E "(Contaminante|Caption|Publicado)" | tail -5
```

---

## 🚀 Navegación

### Ir al Directorio del Proyecto
```bash
cd ~/whatsappchannel-alerts/lambda/generate-alert
```

### Ver Estructura del Proyecto
```bash
ls -la
```

### Ver Último Commit de GitHub
```bash
cd ~/whatsappchannel-alerts
git log -1 --oneline
```

---

## 📝 Información del Sistema

### Stack Completo
- **Lambda:** smability-generate-alert
- **S3 Bucket:** smability-whatsapp-alerts
- **EventBridge:** Cada hora a los :20 (CDMX UTC-6)
- **Telegram Channel:** @smability
- **Panel URL:** https://whatsairegpt.netlify.app
- **API URL:** https://y4zwdmw7vf.execute-api.us-east-1.amazonaws.com/prod/api/air-quality/ias/current

### Retención de Datos
- **Logs CloudWatch:** 7 días
- **Imágenes S3:** 7 días (lifecycle policy)

### Horario de Ejecución
- **Programado:** Cada hora a los :20 minutos
- **Timezone:** America/Mexico_City (UTC-6)
- **Ejemplo:** 18:20 CDMX = 00:20 UTC

---

## 💡 Tips Útiles

### Crear Alias Permanentes (Opcional)
```bash
# Agregar a ~/.bashrc
echo 'alias ultima="~/whatsappchannel-alerts/lambda/generate-alert/ultima-imagen.sh"' >> ~/.bashrc
echo 'alias hoy="~/whatsappchannel-alerts/lambda/generate-alert/imagenes-hoy.sh"' >> ~/.bashrc
echo 'alias url-ultima="aws s3 ls s3://smability-whatsapp-alerts/alertas/ | grep \"alert-\" | sort | tail -n 1 | awk '"'"'{print \"https://smability-whatsapp-alerts.s3.amazonaws.com/alertas/\" \$4}'"'"'"' >> ~/.bashrc
source ~/.bashrc
```

### Ver Solo Success/Failure de Últimas 10 Ejecuciones
```bash
aws logs filter-log-events \
  --log-group-name /aws/lambda/smability-generate-alert \
  --start-time $(($(date +%s) - 43200))000 \
  --filter-pattern "Publicado" \
  | jq -r '.events[].message' | tail -10
```

### Monitoreo Continuo (Loop)
```bash
# Monitorear cada 5 minutos
while true; do
  clear
  echo "=== ESTADO DEL SISTEMA $(date) ==="
  echo ""
  echo "Última ejecución:"
  aws logs tail /aws/lambda/smability-generate-alert --since 10m | grep "Publicado" | tail -1
  echo ""
  echo "Próxima ejecución: $(date -d 'next hour' +'%H'):20 CDMX"
  sleep 300
done
```

---

**Documento generado:** $(date)
**Sistema:** Alertas Automáticas de Calidad del Aire
**Proyecto:** Smability WhatsApp Channel Alerts
**Repo:** https://github.com/Kilobato04/whatsappchannel-alerts
