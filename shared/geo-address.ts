export type HostCountry = {
  code: string;
  name: string;
  dial: string;
};

/** Common host markets first; rest still typeable. One list drives the phone
    picker, address forms, and dial-code detection — add approved markets here. */
export const HOST_COUNTRIES: HostCountry[] = [
  { code: "AU", name: "Australia", dial: "+61" },
  { code: "IN", name: "India", dial: "+91" },
  { code: "NZ", name: "New Zealand", dial: "+64" },
  { code: "SG", name: "Singapore", dial: "+65" },
  { code: "MY", name: "Malaysia", dial: "+60" },
  { code: "ID", name: "Indonesia", dial: "+62" },
  { code: "TH", name: "Thailand", dial: "+66" },
  { code: "PH", name: "Philippines", dial: "+63" },
  { code: "VN", name: "Vietnam", dial: "+84" },
  { code: "JP", name: "Japan", dial: "+81" },
  { code: "KR", name: "South Korea", dial: "+82" },
  { code: "CN", name: "China", dial: "+86" },
  { code: "TW", name: "Taiwan", dial: "+886" },
  { code: "HK", name: "Hong Kong", dial: "+852" },
  { code: "NP", name: "Nepal", dial: "+977" },
  { code: "LK", name: "Sri Lanka", dial: "+94" },
  { code: "BD", name: "Bangladesh", dial: "+880" },
  { code: "PK", name: "Pakistan", dial: "+92" },
  { code: "AE", name: "United Arab Emirates", dial: "+971" },
  { code: "SA", name: "Saudi Arabia", dial: "+966" },
  { code: "QA", name: "Qatar", dial: "+974" },
  { code: "KW", name: "Kuwait", dial: "+965" },
  { code: "OM", name: "Oman", dial: "+968" },
  { code: "BH", name: "Bahrain", dial: "+973" },
  { code: "US", name: "United States", dial: "+1" },
  { code: "CA", name: "Canada", dial: "+1" },
  { code: "GB", name: "United Kingdom", dial: "+44" },
  { code: "IE", name: "Ireland", dial: "+353" },
  { code: "FR", name: "France", dial: "+33" },
  { code: "DE", name: "Germany", dial: "+49" },
  { code: "IT", name: "Italy", dial: "+39" },
  { code: "ES", name: "Spain", dial: "+34" },
  { code: "NL", name: "Netherlands", dial: "+31" },
  { code: "CH", name: "Switzerland", dial: "+41" },
  { code: "SE", name: "Sweden", dial: "+46" },
  { code: "NO", name: "Norway", dial: "+47" },
  { code: "DK", name: "Denmark", dial: "+45" },
  { code: "FI", name: "Finland", dial: "+358" },
  { code: "PT", name: "Portugal", dial: "+351" },
  { code: "AT", name: "Austria", dial: "+43" },
  { code: "BE", name: "Belgium", dial: "+32" },
  { code: "PL", name: "Poland", dial: "+48" },
  { code: "GR", name: "Greece", dial: "+30" },
  { code: "TR", name: "Turkey", dial: "+90" },
  { code: "ZA", name: "South Africa", dial: "+27" },
  { code: "BR", name: "Brazil", dial: "+55" },
  { code: "MX", name: "Mexico", dial: "+52" },
  { code: "AR", name: "Argentina", dial: "+54" },
  { code: "EG", name: "Egypt", dial: "+20" },
  { code: "NG", name: "Nigeria", dial: "+234" },
  { code: "KE", name: "Kenya", dial: "+254" },
  { code: "FJ", name: "Fiji", dial: "+679" },
];

export function countryFlag(code?: string): string {
  if (!code || code.length !== 2) return "🌐";
  const upper = code.toUpperCase();
  const first = 127397 + upper.charCodeAt(0);
  const second = 127397 + upper.charCodeAt(1);
  return String.fromCodePoint(first, second);
}

export function countryByCode(code?: string): HostCountry | undefined {
  if (!code) return undefined;
  return HOST_COUNTRIES.find((row) => row.code.toLowerCase() === code.toLowerCase());
}

export function countryFromPhone(raw: string): HostCountry | undefined {
  const compact = raw.replace(/[^\d+]/g, "");
  return [...HOST_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((c) => compact.startsWith(c.dial));
}

export type AddressLayout = {
  postalLabel: string;
  postalPlaceholder: string;
  stateLabel: string;
  statePlaceholder: string;
  cityLabel: string;
  cityPlaceholder: string;
  streetPlaceholder: string;
};

/** Host types these; do not auto-fill from GPS. */
export function addressLayoutFor(countryCode?: string): AddressLayout {
  switch ((countryCode || "").toUpperCase()) {
    case "US":
      return {
        streetPlaceholder: "123 Market St, Apt 4",
        cityLabel: "City",
        cityPlaceholder: "San Francisco",
        stateLabel: "State",
        statePlaceholder: "CA",
        postalLabel: "ZIP code",
        postalPlaceholder: "94103",
      };
    case "AU":
      return {
        streetPlaceholder: "64 Argyle St",
        cityLabel: "Suburb / city",
        cityPlaceholder: "The Rocks",
        stateLabel: "State / territory",
        statePlaceholder: "NSW",
        postalLabel: "Postcode",
        postalPlaceholder: "2000",
      };
    case "IN":
      return {
        streetPlaceholder: "Beach Rd, Lighthouse",
        cityLabel: "City / town",
        cityPlaceholder: "Kovalam",
        stateLabel: "State",
        statePlaceholder: "Kerala",
        postalLabel: "PIN code",
        postalPlaceholder: "695527",
      };
    case "GB":
      return {
        streetPlaceholder: "10 Downing Street",
        cityLabel: "Town / city",
        cityPlaceholder: "London",
        stateLabel: "County",
        statePlaceholder: "Greater London",
        postalLabel: "Postcode",
        postalPlaceholder: "SW1A 2AA",
      };
    case "AE":
      return {
        streetPlaceholder: "Villa 12, Jumeirah Beach Rd",
        cityLabel: "City / emirate",
        cityPlaceholder: "Dubai",
        stateLabel: "Emirate",
        statePlaceholder: "Dubai",
        postalLabel: "P.O. Box",
        postalPlaceholder: "00000",
      };
    case "CA":
      return {
        streetPlaceholder: "123 Queen St W, Apt 4",
        cityLabel: "City",
        cityPlaceholder: "Toronto",
        stateLabel: "Province / territory",
        statePlaceholder: "ON",
        postalLabel: "Postal code",
        postalPlaceholder: "M5H 2N2",
      };
    case "IE":
      return {
        streetPlaceholder: "12 Grafton Street",
        cityLabel: "Town / city",
        cityPlaceholder: "Dublin",
        stateLabel: "County",
        statePlaceholder: "Dublin",
        postalLabel: "Eircode",
        postalPlaceholder: "D02 AF30",
      };
    case "FR":
      return {
        streetPlaceholder: "12 rue de Rivoli",
        cityLabel: "Ville",
        cityPlaceholder: "Paris",
        stateLabel: "Région",
        statePlaceholder: "Île-de-France",
        postalLabel: "Code postal",
        postalPlaceholder: "75001",
      };
    case "DE":
      return {
        streetPlaceholder: "Friedrichstraße 12",
        cityLabel: "Stadt",
        cityPlaceholder: "Berlin",
        stateLabel: "Bundesland",
        statePlaceholder: "Berlin",
        postalLabel: "Postleitzahl",
        postalPlaceholder: "10117",
      };
    case "ES":
      return {
        streetPlaceholder: "Calle Mayor 12, 2º",
        cityLabel: "Ciudad",
        cityPlaceholder: "Madrid",
        stateLabel: "Comunidad autónoma",
        statePlaceholder: "Madrid",
        postalLabel: "Código postal",
        postalPlaceholder: "28013",
      };
    case "IT":
      return {
        streetPlaceholder: "Via del Corso 12",
        cityLabel: "Città",
        cityPlaceholder: "Roma",
        stateLabel: "Regione",
        statePlaceholder: "Lazio",
        postalLabel: "CAP",
        postalPlaceholder: "00187",
      };
    case "NL":
      return {
        streetPlaceholder: "Damrak 12",
        cityLabel: "Plaats",
        cityPlaceholder: "Amsterdam",
        stateLabel: "Provincie",
        statePlaceholder: "Noord-Holland",
        postalLabel: "Postcode",
        postalPlaceholder: "1012 LG",
      };
    default:
      return {
        streetPlaceholder: "Street and number",
        cityLabel: "City",
        cityPlaceholder: "City",
        stateLabel: "State / region",
        statePlaceholder: "Region",
        postalLabel: "Postcode / ZIP",
        postalPlaceholder: "Postal code",
      };
  }
}

export function formatGps(lat: number, lng: number): string {
  return `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
}

export type AddressParts = {
  line1: string;
  line2: string;
  city: string;
  region: string;
  postal: string;
  countryCode: string;
};

export function emptyAddress(countryCode = "AU"): AddressParts {
  return { line1: "", line2: "", city: "", region: "", postal: "", countryCode };
}

export function formatAddress(parts: AddressParts) {
  const country = countryByCode(parts.countryCode)?.name || "";
  const locality = [parts.city, parts.region, parts.postal].filter(Boolean).join(" ");
  return [parts.line1.trim(), parts.line2.trim(), locality, country].filter(Boolean).join("\n");
}

export function addressOk(parts: AddressParts) {
  return Boolean(parts.line1.trim() && parts.city.trim() && parts.countryCode);
}

export function nationalDigits(raw: string) {
  return raw.replace(/\D/g, "");
}

export function composePhone(dial: string, national: string) {
  const d = dial.startsWith("+") ? dial : `+${nationalDigits(dial)}`;
  let n = nationalDigits(national);
  if (n.startsWith("0")) n = n.slice(1);
  return n ? `${d} ${n}` : "";
}

export function isValidPhone(raw: string) {
  const compact = raw.replace(/[^\d+]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(compact);
}

export function splitPhone(raw: string): { dial: string; national: string } {
  const compact = raw.replace(/[^\d+]/g, "");
  const known = countryFromPhone(compact);
  if (known) return { dial: known.dial, national: compact.slice(known.dial.length) };
  return { dial: "+61", national: nationalDigits(raw) };
}

export type HostLocationFields = {
  country: string;
  countryCode: string;
  state: string;
  city: string;
  address: string;
  phoneCountryCode: string;
  geo?: { lat: number; lng: number };
};

export function locationFromNominatim(payload: {
  address?: Record<string, string>;
  lat?: string;
  lon?: string;
}): HostLocationFields {
  const a = payload.address || {};
  const code = (a.country_code || "").toUpperCase();
  const known = countryByCode(code);
  const lat = Number(payload.lat);
  const lng = Number(payload.lon);
  const city = a.city || a.town || a.village || a.suburb || a.county || "";
  const state = a.state || a.region || a.state_district || "";
  const line = [a.house_number, a.road].filter(Boolean).join(" ");
  return {
    country: known?.name || a.country || "",
    countryCode: known?.code || code,
    state,
    city,
    address: line || a.display_name || "",
    phoneCountryCode: known?.dial || "",
    geo: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined,
  };
}
