import { vi } from "./vi";
import { en } from "./en";

export type Language = "vi" | "en";
export type TranslationType = typeof vi;

export const translations: Record<Language, TranslationType> = {
  vi,
  en,
};

export const defaultLanguage: Language = "vi";
