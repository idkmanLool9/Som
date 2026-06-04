# Som 📊

Een onofficiële mobiele app (Expo / React Native) die inlogt bij **Somtoday** en
je laat zien hoe je ervoor staat: al je cijfers, gemiddeldes per vak, en wat je
nog moet halen voor een voldoende (of een eigen streefcijfer). Vergelijkbaar met
de "Somtoday Mod" browser-extensie, maar dan voor je telefoon.

> ⚠️ Niet gelieerd aan Topicus/Somtoday. De app praat rechtstreeks met de
> (gereverse-engineerde) Somtoday-API. Endpoints kunnen zonder aankondiging
> wijzigen. Je inloggegevens worden **nooit** opgeslagen — je logt in via het
> echte Somtoday-loginscherm en alleen de tokens worden versleuteld op je
> toestel bewaard.

## Functies

- **Cijferoverzicht** – al je cijfers, gegroepeerd per vak.
- **Gemiddeldes** – automatisch gewogen gemiddelde per vak en een totaalgemiddelde.
  Door Somtoday zelf berekende "gemiddelde"-rijen worden genegeerd zodat er niet
  dubbel geteld wordt.
- **"Wat moet ik halen?"-calculator** – vul de weging van je volgende toets en
  een streefgemiddelde in, en zie precies welk cijfer je minimaal nodig hebt.
  Inclusief een "stel ik haal een X"-voorspelling.
- **Huiswerk** – je huiswerk/studiewijzer voor de komende weken, per dag.

## Hoe het werkt

### Inloggen (OAuth2 + PKCE)

Somtoday gebruikt OAuth2 met PKCE. De app:

1. haalt de scholenlijst op van `servers.somtoday.nl/organisaties.json`;
2. genereert een PKCE `code_verifier` + `code_challenge` (`src/api/pkce.ts`);
3. opent het echte Somtoday-loginscherm in een **WebView** (werkt ook met
   SSO-scholen zoals Microsoft/Google login);
4. vangt de `somtoday://…/oauth/callback?code=…` redirect op en wisselt de code
   in voor tokens (`src/api/auth.ts`).

Tokens worden versleuteld bewaard met `expo-secure-store` en automatisch
ververst (`src/api/client.ts`).

### Cijfers & berekeningen

De API geeft ruwe resultaatrijen terug. `src/logic/grades.ts` normaliseert die
naar een simpel `Grade`-model en groepeert per vak; `src/logic/calculator.ts`
bevat de "wat moet ik halen"-formules. Deze logica is volledig unit-getest
(`__tests__/`).

## Aan de slag

```bash
npm install
npm start           # start de Expo dev-server (scan de QR-code met Expo Go)
# of:
npm run android
npm run ios
```

### Tests & typecheck

```bash
npm test            # jest unit-tests voor de cijfer-/calculatorlogica
npm run typecheck   # tsc --noEmit
```

## Projectstructuur

```
src/
  api/         OAuth/PKCE, REST-client en Somtoday-endpoints
  logic/       cijfers parsen, gemiddeldes en de calculator (unit-getest)
  hooks/       data-hooks (useGrades, useHomework)
  context/     AuthProvider (sessie + client)
  screens/     Login, Cijfers, Vakdetail, Calculator, Huiswerk, Account
  navigation/  tabs + cijfer-stack
__tests__/     unit-tests voor de logica
```

## Disclaimer

Gebruik op eigen risico en alleen met je eigen account. Deze app is een
hobbyproject en geen officieel product van Somtoday/Topicus.
