#!/usr/bin/env bash
#
# Start de Expo dev-server in een GitHub Codespace ZONDER ngrok en ZONDER dat je
# handmatig een poort op 'Public' hoeft te zetten.
#
# Werking: we openen een gratis Cloudflare-quicktunnel naar poort 8081 (geen
# account nodig) en geven die publieke https-URL aan Expo mee via
# EXPO_PACKAGER_PROXY_URL. Cloudflare serveert de Expo-manifest dan rechtstreeks
# (geen GitHub-loginpagina ertussen), zodat Expo Go op je iPad het kan laden.
#
# Gebruik:  npm run codespace
#
set -e

PORT=8081
CF_BIN="${TMPDIR:-/tmp}/cloudflared"
CF_LOG="${TMPDIR:-/tmp}/cloudflared.log"

# 1. cloudflared ophalen indien nodig (klein, eenmalig).
if command -v cloudflared >/dev/null 2>&1; then
  CF_BIN="$(command -v cloudflared)"
elif [ ! -x "$CF_BIN" ]; then
  echo "→ cloudflared downloaden (eenmalig)…"
  ARCH="$(uname -m)"
  case "$ARCH" in
    x86_64|amd64) CF_ARCH=amd64 ;;
    aarch64|arm64) CF_ARCH=arm64 ;;
    *) CF_ARCH=amd64 ;;
  esac
  curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}" -o "$CF_BIN"
  chmod +x "$CF_BIN"
fi

# 2. Tunnel starten en de publieke URL uit de log vissen.
echo "→ Cloudflare-tunnel starten…"
rm -f "$CF_LOG"
"$CF_BIN" tunnel --no-autoupdate --url "http://localhost:${PORT}" >"$CF_LOG" 2>&1 &
CF_PID=$!
trap 'kill $CF_PID 2>/dev/null || true' EXIT

URL=""
for _ in $(seq 1 40); do
  URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$CF_LOG" | head -1 || true)"
  [ -n "$URL" ] && break
  sleep 1
done

if [ -z "$URL" ]; then
  echo "✗ Kon de Cloudflare-tunnel niet opzetten. Log:"
  cat "$CF_LOG"
  echo ""
  echo "Val terug op ngrok:  npm run tunnel"
  exit 1
fi

export EXPO_PACKAGER_PROXY_URL="$URL"

echo "──────────────────────────────────────────────────────────────"
echo " Publieke URL : $URL"
echo " Open de app via Expo Go (verschijnt onder 'Development servers'"
echo " als je met hetzelfde account bent ingelogd via 'npx expo login')."
echo " Geen poort-instellingen nodig."
echo "──────────────────────────────────────────────────────────────"

# 3. Expo starten (op de voorgrond; tunnel sluit automatisch bij stoppen).
npx expo start
