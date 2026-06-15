#!/bin/bash
# ══════════════════════════════════════════════════════════════════
# Weeklink — Scripts de build para aplicación móvil
# ══════════════════════════════════════════════════════════════════

set -e

DOMAIN="https://boostmarketingboost.com"

echo "🚀 Weeklink App Build Script"
echo "Domain: $DOMAIN"
echo ""

# Función de ayuda
help() {
    echo "Uso: ./scripts/app-build.sh [comando]"
    echo ""
    echo "Comandos:"
    echo "  android     Abrir proyecto Android en Android Studio"
    echo "  ios         Abrir proyecto iOS en Xcode (requiere Mac)"
    echo "  sync        Sincronizar cambios web → app nativa"
    echo "  devices     Listar dispositivos conectados"
    echo ""
}

# Sync web → native
sync() {
    echo "📦 Sincronizando proyecto..."
    npx cap sync
    echo "✅ Sync completo"
}

# Android
android() {
    echo "🤖 Preparando Android..."
    npx cap add android 2>/dev/null || true
    npx cap sync android
    npx cap open android
}

# iOS (solo Mac)
ios() {
    echo "🍎 Preparando iOS..."
    npx cap add ios 2>/dev/null || true
    npx cap sync ios
    npx cap open ios
}

# Ejecutar comando
case "$1" in
    android) android ;;
    ios)     ios ;;
    sync)    sync ;;
    *)       help ;;
esac
