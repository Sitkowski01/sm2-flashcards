import { StanPowtorki } from './sm2';

export interface Karta {
  id: string;
  przod: string;
  tyl: string;
  /** Skąd karta pochodzi — ręcznie dopisana czy wygenerowana z tekstu. */
  zrodlo: 'reczna' | 'wygenerowana';
  stan: StanPowtorki;
}

export interface Talia {
  id: string;
  nazwa: string;
  opis: string;
  karty: Karta[];
}

/** Podsumowanie talii liczone na bieżąco, nietrzymane w stanie. */
export interface StatystykiTalii {
  wszystkie: number;
  doPowtorki: number;
  nowe: number;
  zalegle: number;
  sredniaLatwosc: number;
}

export function nowyId(): string {
  // crypto.randomUUID jest w kazdej przegladarce, ktora obsluguje Angulara 22;
  // fallback jest po to, zeby testy w jsdom bez crypto tez przechodzily.
  return globalThis.crypto?.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2, 11)}`;
}
