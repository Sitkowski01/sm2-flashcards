import { inject, Injectable, InjectionToken } from '@angular/core';

import { GeneratorFiszek, MAKS_PROPOZYCJI, Propozycja } from './generator';

export interface KonfiguracjaLlm {
  /** Pełny adres punktu końcowego zgodnego z Chat Completions. */
  adres: string;
  model: string;
  /**
   * Klucz. W demo nie jest ustawiany — front nie jest miejscem na sekret.
   * Docelowo zapytanie idzie przez własny backend, a klucz zostaje na serwerze.
   */
  klucz?: string;
}

export const KONFIGURACJA_LLM = new InjectionToken<KonfiguracjaLlm>('KonfiguracjaLlm');

/**
 * Dostawca oparty na modelu językowym.
 *
 * Ten sam interfejs co heurystyka, więc podmiana to jedna linia w `app.config.ts`.
 * Model dostaje sztywno zadany kształt odpowiedzi i jest traktowany jak każde
 * inne wejście z zewnątrz — odpowiedź przechodzi przez walidację, zanim ktokolwiek
 * ją zobaczy.
 */
@Injectable()
export class GeneratorLlm implements GeneratorFiszek {
  readonly nazwa = 'model językowy';

  private readonly konfiguracja = inject(KONFIGURACJA_LLM);

  async generuj(tekst: string): Promise<Propozycja[]> {
    const odpowiedz = await fetch(this.konfiguracja.adres, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(this.konfiguracja.klucz
          ? { authorization: `Bearer ${this.konfiguracja.klucz}` }
          : {}),
      },
      body: JSON.stringify({
        model: this.konfiguracja.model,
        messages: [
          {
            role: 'system',
            content:
              'Tworzysz fiszki do powtórek. Zwróć wyłącznie tablicę JSON obiektów ' +
              '{"przod":"...","tyl":"..."}. Przód to krótkie pytanie, tył to zwięzła ' +
              'odpowiedź. Bez komentarza i bez znaczników kodu.',
          },
          { role: 'user', content: tekst },
        ],
      }),
    });

    if (!odpowiedz.ok) {
      throw new Error(`model odpowiedział ${odpowiedz.status}`);
    }

    const dane = await odpowiedz.json();
    const tresc = dane?.choices?.[0]?.message?.content;
    return this.zwaliduj(tresc);
  }

  /**
   * Model bywa gadatliwy i owija JSON w ```json — dlatego nie ufamy kształtowi
   * odpowiedzi, tylko wycinamy tablicę i sprawdzamy każdy element z osobna.
   * Bez tego jedna nietypowa odpowiedź wysypuje ekran generowania.
   */
  zwaliduj(tresc: unknown): Propozycja[] {
    if (typeof tresc !== 'string') return [];

    const poczatek = tresc.indexOf('[');
    const koniec = tresc.lastIndexOf(']');
    if (poczatek === -1 || koniec <= poczatek) return [];

    let dane: unknown;
    try {
      dane = JSON.parse(tresc.slice(poczatek, koniec + 1));
    } catch {
      return [];
    }
    if (!Array.isArray(dane)) return [];

    return dane
      .filter(
        (p): p is Propozycja =>
          typeof p === 'object' &&
          p !== null &&
          typeof (p as Propozycja).przod === 'string' &&
          typeof (p as Propozycja).tyl === 'string' &&
          (p as Propozycja).przod.trim().length > 0 &&
          (p as Propozycja).tyl.trim().length > 0,
      )
      .map((p) => ({ przod: p.przod.trim(), tyl: p.tyl.trim() }))
      .slice(0, MAKS_PROPOZYCJI);
  }
}
