#!/bin/bash

# Script de deployment para Lambda function
set -e

echo "📦 Instalando dependencias..."
npm install --production

echo "🗜️ Creando ZIP..."
zip -r function.zip index.js node_modules/ package.json

echo "☁️ Subiendo a Lambda..."
aws lambda update-function-code \
  --function-name smability-generate-alert \
  --zip-file fileb://function.zip

echo "✅ Deployment completado"
echo "📊 Info de la función:"
aws lambda get-function --function-name smability-generate-alert --query 'Configuration.[FunctionName,Runtime,MemorySize,Timeout]'
