/** ISO-2 country code → display name + flag. Extend as plans are added. */
export const COUNTRIES: Record<string, { name: string; flag: string }> = {
  SG: { name: "Singapore", flag: "🇸🇬" },
  AE: { name: "UAE", flag: "🇦🇪" },
  TH: { name: "Thailand", flag: "🇹🇭" },
  US: { name: "United States", flag: "🇺🇸" },
  GB: { name: "United Kingdom", flag: "🇬🇧" },
  JP: { name: "Japan", flag: "🇯🇵" },
  IN: { name: "India", flag: "🇮🇳" },
  AU: { name: "Australia", flag: "🇦🇺" },
  CA: { name: "Canada", flag: "🇨🇦" },
  DE: { name: "Germany", flag: "🇩🇪" },
  FR: { name: "France", flag: "🇫🇷" },
  MY: { name: "Malaysia", flag: "🇲🇾" },
  ID: { name: "Indonesia", flag: "🇮🇩" },
  VN: { name: "Vietnam", flag: "🇻🇳" },
  HK: { name: "Hong Kong", flag: "🇭🇰" },
};

/** Passport issuing countries offered in the traveller form. */
export const PASSPORT_COUNTRIES = [
  "IN",
  "US",
  "GB",
  "SG",
  "AE",
  "AU",
  "CA",
  "DE",
  "FR",
  "JP",
];

export function countryName(code: string) {
  return COUNTRIES[code]?.name ?? code;
}

export function countryFlag(code: string) {
  return COUNTRIES[code]?.flag ?? "🌐";
}
