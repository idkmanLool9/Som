# Som op je iPad draaien (zonder pc)

Je hebt geen pc nodig — alleen je iPad. De dev-server draait in een **GitHub
Codespace** (cloud-terminal in je browser) en de app laadt in de gratis
**Expo Go**-app via een tunnel.

## Eenmalig

1. Installeer **Expo Go** uit de App Store op je iPad.
2. Maak (gratis) een Expo-account aan in de Expo Go-app en **onthoud die login**.

## Elke keer dat je wilt draaien

1. Ga in **Safari** naar de repo op `github.com` → knop **`< > Code`** →
   tab **Codespaces** → **Create codespace on
   `claude/somtoday-mobile-app-HIou6`**.
   (De eerste keer duurt het opstarten + `npm install` een paar minuten;
   dat gebeurt automatisch dankzij de devcontainer.)
2. Open in de Codespace een **terminal** en log in op hetzelfde Expo-account:
   ```bash
   npx expo login
   ```
3. Start de dev-server met tunnel:
   ```bash
   npm run tunnel
   ```
   De eerste keer installeert hij automatisch de tunnel-tool. Laat dit draaien.
4. Open op je iPad de **Expo Go**-app. Omdat je met hetzelfde account bent
   ingelogd, verschijnt **Som** vanzelf onder **"Development servers"** op het
   startscherm. Tik erop → de app laadt.

> Tip: de QR-code in de terminal kun je op een iPad-only opstelling niet
> scannen (je kunt je eigen scherm niet filmen). De account-login uit stap 2
> is daarom de makkelijkste manier — dan hoef je niks te scannen.

## Inloggen in de app

Kies je school, log in op het echte Somtoday-scherm (ook SSO werkt), en je
cijfers verschijnen. Werkt iets in de Somtoday-data niet? Geef de foutmelding
door, dan pas ik de API-aanroep aan.

## "Project is incompatible with this version of Expo Go"?

De App Store biedt op iPhone/iPad maar één Expo Go-versie aan (op dit moment
**SDK 54**). Dit project is daarom op **Expo SDK 54** gezet zodat het in de
gewone Expo Go uit de App Store draait. Zorg dat je Expo Go up-to-date is en je
zou deze melding niet meer moeten zien.

