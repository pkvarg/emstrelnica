export const locales = ["sk", "hu"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "sk";
