import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from "libphonenumber-js";

const known = new Set(getCountries());
const names = {
  en: new Intl.DisplayNames(["en"], { type: "region" }),
  ar: new Intl.DisplayNames(["ar"], { type: "region" }),
  fr: new Intl.DisplayNames(["fr"], { type: "region" }),
};

export function isCatalogCountry(value: string): value is CountryCode {
  return known.has(value.toUpperCase() as CountryCode);
}

export function countryFlag(iso2: string) {
  return [...iso2.toUpperCase()]
    .map((character) => String.fromCodePoint(127397 + character.charCodeAt(0)))
    .join("");
}

export function authoritativeCountryCatalog() {
  return getCountries().map((iso2) => ({
    iso2,
    dialCode: `+${getCountryCallingCode(iso2)}`,
    flagEmoji: countryFlag(iso2),
    names: {
      en: names.en.of(iso2) || iso2,
      ar: names.ar.of(iso2) || iso2,
      fr: names.fr.of(iso2) || iso2,
    },
  }));
}
