#!/usr/bin/env bash
#
# Start de Expo dev-server in een GitHub Codespace ZONDER ngrok-tunnel.
# Gebruikt de publieke poort-forwarding van Codespaces zelf, zodat je niet
# afhankelijk bent van de ngrok-dienst (die soms storingen heeft).
#
# Gebruik:  npm run codespace
#
set -e

if [ -z "$CODESPACE_NAME" ]; then
  echo "Dit script werkt alleen in een GitHub Codespace (CODESPACE_NAME is leeg)."
  echo "Op een gewone machine kun je 'npm run tunnel' of 'npm start' gebruiken."
  exit 1
fi

DOMAIN="${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
export EXPO_PACKAGER_PROXY_URL="https://${CODESPACE_NAME}-8081.${DOMAIN}"

# Probeer poort 8081 automatisch op 'public' te zetten (anders krijgt je iPad
# een GitHub-loginpagina i.p.v. de app). Lukt dit niet, doe het dan handmatig.
if command -v gh >/dev/null 2>&1; then
  gh codespace ports visibility 8081:public -c "$CODESPACE_NAME" >/dev/null 2>&1 || true
fi

echo "──────────────────────────────────────────────────────────────"
echo " Expo proxy-URL : $EXPO_PACKAGER_PROXY_URL"
echo ""
echo " BELANGRIJK: zet poort 8081 op 'Public' in het tabblad POORTEN"
echo " (rechtermuisklik op poort 8081 → Port Visibility → Public)."
echo " Anders kan je iPad de app niet laden."
echo "──────────────────────────────────────────────────────────────"

exec npx expo start
