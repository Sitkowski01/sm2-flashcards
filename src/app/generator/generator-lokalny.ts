import { Injectable } from '@angular/core';

import { GeneratorFiszek, MAKS_PROPOZYCJI, Propozycja } from './generator';

/**
 * Generator bez modelu — działa offline i deterministycznie.
 *
 * Szuka w tekście zdań definiujących i zamienia je na pytanie i odpowiedź:
 *
 *   „Fotosynteza to proces..."      → Co to jest: Fotosynteza?
 *   „Mitochondrium jest organellum" → Co to jest: Mitochondrium?
 *   „HTTP — protokół przesyłania"   → Co to jest: HTTP?
 *
 * Po co on, skoro celem był model: demo musi działać u każdego, kto kliknie
 * w link, bez klucza do API i bez kosztu zapytania. Model wchodzi tym samym
 * interfejsem, gdy klucz jest podany.
 */
@Injectable()
export class GeneratorLokalny implements GeneratorFiszek {
  readonly nazwa = 'heurystyka lokalna';

  /** Łączniki definicji, od najbardziej jednoznacznego. */
  private readonly lacza = [' to ', ' jest ', ' oznacza ', ' — ', ' – '];

  async generuj(tekst: string): Promise<Propozycja[]> {
    const zdania = this.naZdania(tekst);
    const propozycje: Propozycja[] = [];
    const juzUzyte = new Set<string>();

    for (const zdanie of zdania) {
      const propozycja = this.zeZdania(zdanie);
      if (!propozycja) continue;

      // Ten sam termin opisany dwa razy dawalby dwie karty pytajace o to samo.
      const klucz = propozycja.przod.toLowerCase();
      if (juzUzyte.has(klucz)) continue;

      juzUzyte.add(klucz);
      propozycje.push(propozycja);
      if (propozycje.length >= MAKS_PROPOZYCJI) break;
    }

    return propozycje;
  }

  private naZdania(tekst: string): string[] {
    return tekst
      .split(/(?<=[.!?])\s+|\n+/)
      .map((z) => z.trim())
      .filter((z) => z.length > 0);
  }

  private zeZdania(zdanie: string): Propozycja | null {
    for (const lacznik of this.lacza) {
      const i = zdanie.indexOf(lacznik);
      if (i <= 0) continue;

      const termin = zdanie.slice(0, i).trim();
      const definicja = zdanie
        .slice(i + lacznik.length)
        .replace(/[.!?]+$/, '')
        .trim();

      // Termin dluzszy niz kilka slow to juz nie termin, tylko zdanie zlozone —
      // karta z takim przodem jest bezuzyteczna przy powtorkach.
      const slowaTerminu = termin.split(/\s+/).length;
      if (slowaTerminu > 5 || termin.length < 2) continue;
      if (definicja.length < 3) continue;

      return { przod: `Co to jest: ${termin}?`, tyl: definicja };
    }
    return null;
  }
}
