import { computed, effect, Injectable, signal } from '@angular/core';

import { Karta, nowyId, StatystykiTalii, Talia } from './modele';
import { czyDoPowtorki, Ocena, poOdpowiedzi, stanPoczatkowy } from './sm2';

const KLUCZ = 'recall-lab/talie/v1';

/**
 * Cały stan aplikacji: talie, karty i zapis do przeglądarki.
 *
 * Stan siedzi w jednym sygnale, a wszystko, co da się wyliczyć — liczba kart
 * do powtórki, zaległości, średni współczynnik — jest `computed`, nie kolejnym
 * polem do ręcznego utrzymania w zgodzie.
 */
@Injectable({ providedIn: 'root' })
export class Magazyn {
  private readonly stan = signal<Talia[]>(this.wczytaj());

  readonly talie = this.stan.asReadonly();

  readonly pusty = computed(() => this.stan().length === 0);

  /** Ile kart w całej aplikacji czeka na powtórkę teraz. */
  readonly doPowtorkiRazem = computed(() =>
    this.stan().reduce((suma, t) => suma + this.doPowtorki(t).length, 0),
  );

  constructor() {
    // Zapis jest efektem ubocznym stanu, a nie obowiazkiem kazdej metody,
    // ktora cos zmienia — dzieki temu nie da sie zapomniec go wywolac.
    effect(() => this.zapisz(this.stan()));
  }

  talia(id: string): Talia | undefined {
    return this.stan().find((t) => t.id === id);
  }

  /** Karty z talii, którym minął termin — w kolejności od najbardziej zaległych. */
  doPowtorki(talia: Talia, teraz: Date = new Date()): Karta[] {
    return talia.karty
      .filter((k) => czyDoPowtorki(k.stan, teraz))
      .sort((a, b) => Date.parse(a.stan.termin) - Date.parse(b.stan.termin));
  }

  statystyki(talia: Talia, teraz: Date = new Date()): StatystykiTalii {
    const karty = talia.karty;
    const latwosci = karty.map((k) => k.stan.latwosc);

    return {
      wszystkie: karty.length,
      doPowtorki: this.doPowtorki(talia, teraz).length,
      nowe: karty.filter((k) => k.stan.powtorzenia === 0 && k.stan.odstepDni === 0).length,
      zalegle: karty.filter(
        (k) => Date.parse(k.stan.termin) < teraz.getTime() - 24 * 3600 * 1000,
      ).length,
      sredniaLatwosc: latwosci.length
        ? Math.round((latwosci.reduce((a, b) => a + b, 0) / latwosci.length) * 100) / 100
        : 0,
    };
  }

  dodajTalie(nazwa: string, opis = ''): Talia {
    const talia: Talia = { id: nowyId(), nazwa, opis, karty: [] };
    this.stan.update((talie) => [...talie, talia]);
    return talia;
  }

  usunTalie(id: string): void {
    this.stan.update((talie) => talie.filter((t) => t.id !== id));
  }

  dodajKarty(
    idTalii: string,
    karty: { przod: string; tyl: string }[],
    zrodlo: Karta['zrodlo'] = 'reczna',
    teraz: Date = new Date(),
  ): void {
    if (!karty.length) return;

    const nowe: Karta[] = karty.map((k) => ({
      id: nowyId(),
      przod: k.przod,
      tyl: k.tyl,
      zrodlo,
      stan: stanPoczatkowy(teraz),
    }));

    this.stan.update((talie) =>
      talie.map((t) => (t.id === idTalii ? { ...t, karty: [...t.karty, ...nowe] } : t)),
    );
  }

  usunKarte(idTalii: string, idKarty: string): void {
    this.stan.update((talie) =>
      talie.map((t) =>
        t.id === idTalii ? { ...t, karty: t.karty.filter((k) => k.id !== idKarty) } : t,
      ),
    );
  }

  /** Zapisuje ocenę i przelicza termin karty algorytmem SM-2. */
  ocen(idTalii: string, idKarty: string, ocena: Ocena, teraz: Date = new Date()): void {
    this.stan.update((talie) =>
      talie.map((t) =>
        t.id !== idTalii
          ? t
          : {
              ...t,
              karty: t.karty.map((k) =>
                k.id === idKarty ? { ...k, stan: poOdpowiedzi(k.stan, ocena, teraz) } : k,
              ),
            },
      ),
    );
  }

  /** Kasuje postęp, zostawiając same karty — przydatne przy pokazie. */
  zerujPostep(idTalii: string, teraz: Date = new Date()): void {
    this.stan.update((talie) =>
      talie.map((t) =>
        t.id !== idTalii
          ? t
          : { ...t, karty: t.karty.map((k) => ({ ...k, stan: stanPoczatkowy(teraz) })) },
      ),
    );
  }

  private wczytaj(): Talia[] {
    try {
      const surowe = globalThis.localStorage?.getItem(KLUCZ);
      if (!surowe) return [];
      const dane = JSON.parse(surowe);
      return Array.isArray(dane) ? (dane as Talia[]) : [];
    } catch {
      // Uszkodzony wpis nie moze wywrocic startu aplikacji — lepiej pusto niz bialy ekran.
      return [];
    }
  }

  private zapisz(talie: Talia[]): void {
    try {
      globalThis.localStorage?.setItem(KLUCZ, JSON.stringify(talie));
    } catch {
      /* tryb prywatny albo brak miejsca — praca w pamieci dziala dalej */
    }
  }
}
