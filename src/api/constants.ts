/**
 * Centrale configuratie voor de (onofficiële) Somtoday OAuth2 + REST API.
 *
 * Bron: reverse-engineerde documentatie van de Somtoday API
 * (https://github.com/elisaado/somtoday-api-docs). Dit zijn geen officiële
 * endpoints; Topicus kan ze zonder aankondiging wijzigen.
 */

/** Lijst met alle scholen/organisaties die Somtoday gebruiken. */
export const ORGANISATIES_URL = 'https://servers.somtoday.nl/organisaties.json';

/** OAuth2 authorize endpoint (login-scherm). */
export const AUTHORIZE_URL = 'https://inloggen.somtoday.nl/oauth2/authorize';

/** OAuth2 token endpoint (code -> tokens, en refresh). */
export const TOKEN_URL = 'https://inloggen.somtoday.nl/oauth2/token';

/** Client id van de officiële Somtoday-leerling app (publieke native client). */
export const CLIENT_ID = 'somtoday-leerling-native';

/** Redirect uri (deeplink) die het login-scherm aanroept als het klaar is. */
export const REDIRECT_URI = 'somtoday://nl.topicus.somtoday.leerling/oauth/callback';

/** Gevraagde scope. */
export const SCOPE = 'openid';

/** Fallback API base; de echte komt uit het tokenantwoord (`somtoday_api_url`). */
export const DEFAULT_API_URL = 'https://api.somtoday.nl';
