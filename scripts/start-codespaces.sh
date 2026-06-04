#!/usr/bin/env bash
#
# Start de Expo dev-server in een GitHub Codespace via Codespaces' EIGEN
# poort-forwarding. Geen externe tunneldienst (ngrok/cloudflare) die plat kan
# gaan, en de URL is STABIEL: hij verandert niet bij elke herstart, dus Expo Go
# blijft werken na een reload.
#
# Eén eenmalige stap: poort 8081 moet op 'Public' staan (zie melding onderaan).
#
# Gebruik:  npm run codespace
#
set -e

PORT=8081

if [ -z "$CODESPACE_NAME" ]; then
  echo "Dit script werkt alleen in een GitHub Codespace (CODESPACE_NAME is leeg)."
  echo "Op een gewone machine: 'npm start' of 'npm run tunnel'."
  exit 1
fi

# 0. Dependencies synchroniseren (na git pull kunnen er nieuwe packages zijn).
echo "→ Dependencies synchroniseren (npm install)…"
npm install --no-audit --no-fund

# 0b. Expo-login check (anders verschijnt de app niet in Expo Go).
if ! npx expo whoami >/dev/null 2>&1; then
  echo ""
  echo "⚠️  Je bent nog niet ingelogd bij Expo. Run eenmalig:  npx expo login"
  echo "    (zelfde account als in de Expo Go-app op je iPad)"
  echo ""
fi

# 1. Stabiele publieke URL van Codespaces zelf.
DOMAIN="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
export EXPO_PACKAGER_PROXY_URL="https://${CODESPACE_NAME}-${PORT}.${DOMAIN}"

# 2. Poort 8081 op 'public' proberen te zetten (anders krijgt je iPad een
#    GitHub-loginpagina i.p.v. de app). Best effort; lukt dit niet, doe het dan
#    handmatig via het POORTEN-tabblad.
if command -v gh >/dev/null 2>&1; then
  gh codespace ports visibility "${PORT}:public" -c "$CODESPACE_NAME" >/dev/null 2>&1 \
    && echo "✓ Poort ${PORT} staat op Public." \
    || echo "ℹ️  Kon poort ${PORT} niet automatisch op Public zetten (zie hieronder)."
fi

echo "──────────────────────────────────────────────────────────────"
echo " Stabiele URL : $EXPO_PACKAGER_PROXY_URL"
echo ""
echo " Werkt het niet? Zet poort ${PORT} op 'Public':"
echo "   tabblad POORTEN → rechtermuisklik op ${PORT} → Port Visibility → Public"
echo " Deze URL verandert NIET bij herstart, dus dit is eenmalig."
echo "──────────────────────────────────────────────────────────────"

# 3. Expo starten.
exec npx expo start
