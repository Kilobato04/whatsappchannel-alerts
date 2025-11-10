# Smability WhatsApp Alerts

Sistema automatizado de alertas de calidad del aire para Canal de WhatsApp.

## 🎯 Objetivo

Generar alertas automáticas cada hora mostrando la estación con peor IAS en el Valle de México, incluyendo:
- Valor IAS y categoría
- Contaminante dominante
- Recomendaciones de salud por grupo
- Gráfica histórica de 36 horas

## 📊 APIs Utilizadas

- **Current IAS**: `https://y4zwdmw7vf.execute-api.us-east-1.amazonaws.com/prod/api/air-quality/ias/current`
- **Historical Data**: `https://y4zwdmw7vf.execute-api.us-east-1.amazonaws.com/prod/api/air-quality/satation/{station_id}/historical?variable=ias&hours=36`

## 🚀 Deployment

### Testing Local
```bash
npm install
npm run dev
```

### Netlify (Preview)
- URL: https://smability-whatsapp.netlify.app
- Auto-deploy desde `main` branch

### AWS Lambda (Producción)
Ver `lambda/README.md` para deployment instructions

## ⏰ Schedule

Alertas se generan:
- **:05** de cada hora (primera actualización)
- **:20** de cada hora (segunda actualización)

Ejemplo: 14:05, 14:20, 15:05, 15:20...

## 📐 Especificaciones

- **Dimensiones**: 1200x630px (optimizado para WhatsApp)
- **Idioma**: Español mexicano
- **Estación**: Automáticamente la de peor IAS
- **Gráfica**: Solo IAS (últimas 36 horas)

## 📝 Licencia

© 2024 Smability. Todos los derechos reservados.
```

---

### 2. `.gitignore`
```
# Dependencies
node_modules/
package-lock.json

# Environment variables
.env
.env.local
.env.production

# Build output
dist/
build/
.cache/

# Lambda layers
lambda/**/node_modules/
lambda/**/*.zip
lambda/**/chromium/

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Logs
logs/
*.log
npm-debug.log*

# Temporary files
tmp/
temp/
*.tmp

# Generated images
public/assets/images/generated/
alertas/
