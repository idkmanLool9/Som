/** Een school/organisatie uit organisaties.json. */
export interface School {
  uuid: string;
  naam: string;
  plaats: string;
}

/** Antwoord van het OAuth2 token endpoint. */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  somtoday_api_url?: string;
  somtoday_tenant?: string;
}

/** Opgeslagen sessie inclusief vervaltijd en API base url. */
export interface Session {
  accessToken: string;
  refreshToken: string;
  apiUrl: string;
  /** Unix-tijd (ms) waarop het access token verloopt. */
  expiresAt: number;
  tenantUuid: string;
}

/** Leerling zoals teruggegeven door /rest/v1/leerlingen. */
export interface Student {
  links: SomLink[];
  leerlingId?: number;
  roepnaam?: string;
  voornaam?: string;
  achternaam?: string;
  voorvoegsel?: string;
  UUID?: string;
}

export interface SomLink {
  id: number;
  rel: string;
  type: string;
  href: string;
}

/** Ruwe resultaat-rij (cijfer) zoals Somtoday die teruggeeft. */
export interface RawResult {
  resultaatId?: number;
  links?: SomLink[];
  type?: string;
  vak?: { naam?: string; afkorting?: string };
  periode?: number;
  geldendResultaat?: string;
  resultaat?: string;
  weging?: number;
  leerjaar?: number;
  omschrijving?: string;
  datumInvoer?: string;
  isVoldoende?: boolean;
  teltNietmee?: boolean;
  resultaatLabel?: string;
  resultaatLabelAfkorting?: string;
  // Verrijkte velden via ?additional= (vaknaam, resultaatkolom met weging enz.).
  additionalObjects?: Record<string, any>;
  [key: string]: unknown;
}

/** Een lijst-antwoord van de REST API. */
export interface ItemsResponse<T> {
  items: T[];
}

/** Ruw huiswerk/studiewijzer-item. */
export interface RawHomework {
  links?: SomLink[];
  studiewijzerItem?: {
    onderwerp?: string;
    omschrijving?: string;
    huiswerkType?: string;
  };
  datumTijd?: string;
  datum?: string;
  vak?: { naam?: string; afkorting?: string };
  [key: string]: unknown;
}
