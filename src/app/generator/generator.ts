import { InjectionToken } from '@angular/core';

export interface Propozycja {
  przod: string;
  tyl: string;
}

/**
 * Źródło propozycji fiszek na podstawie wklejonego tekstu.
 *
 * Interfejs, a nie konkretna klasa, z dwóch powodów:
 *  - aplikacja ma działać bez klucza do API — demo nie może pytać o sekret,
 *  - komponent nie ma prawa wiedzieć, czy odpowiedź policzył model, czy heurystyka.
 *
 * Podmiana idzie przez `provide: GENERATOR` w `app.config.ts`, więc dołożenie
 * dostawcy nie dotyka ani jednego komponentu.
 */
export interface GeneratorFiszek {
  /** Krótka nazwa pokazywana w interfejsie, np. „heurystyka" albo „Gemini". */
  readonly nazwa: string;
  generuj(tekst: string): Promise<Propozycja[]>;
}

export const GENERATOR = new InjectionToken<GeneratorFiszek>('GeneratorFiszek');

/** Wspólny limit — żeby jedno wklejenie nie zasypało talii setką kart. */
export const MAKS_PROPOZYCJI = 20;
