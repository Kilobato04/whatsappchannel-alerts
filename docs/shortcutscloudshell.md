
# Si no estás en el proyecto, navega:
cd ~/whatsappchannel-alerts/lambda/generate-alert

# Ver última imagen
~/ultima

# Ver todas de hoy
~/hoy

# Solo URL (copiar/pegar directo)
url-ultima

# Ultima imagen
./ultima-imagen.sh

# O con alias:
ultima

# Todas hoy
./imagenes-hoy.sh

# O con alias:
hoy

# Ultima:
url-ultima

# tests:

# Test de integración con Telegram
rm -f response.json
aws lambda invoke \
  --function-name smability-generate-alert \
  --payload '{"test_telegram": true}' \
  --cli-binary-format raw-in-base64-out \
  response.json

echo "⏳ Esperando 40 segundos..."
sleep 40

# Ver resultado
echo ""
echo "=== RESULTADO ==="
cat response.json | jq '.body' -r | jq '{
  success,
  station: .station.name,
  ias: .station.ias,
  category: .station.category,
  imageUrl: .image.url,
  telegramSent: .telegram.success,
  telegramMessageId: .telegram.messageId
}'
