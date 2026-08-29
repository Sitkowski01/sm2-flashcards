import { describe, expect, it } from 'vitest';

import {
  czyDoPowtorki,
  dniDoTerminu,
  MIN_LATWOSC,
  nastepnyOdstep,
  nowaLatwosc,
  Ocena,
  poOdpowiedzi,
  PROG_ZALICZENIA,
  stanPoczatkowy,
  START_LATWOSC,
  StanPowtorki,
} from './sm2';

const PUNKT_W_CZASIE = new Date('2026-03-01T10:00:00.000Z');

function stan(nadpisz: Partial<StanPowtorki> = {}): StanPowtorki {
  return { ...stanPoczatkowy(PUNKT_W_CZASIE), ...nadpisz };
}

describe('nowaLatwosc', () => {
  it('ocena 5 podnosi współczynnik', () => {
    expect(nowaLatwosc(2.5, 5)).toBeGreaterThan(2.5);
  });

  it('ocena 4 zostawia współczynnik bez zmian', () => {
    // Wzór SM-2 daje dla q=4 zmiane rowna zeru — to punkt rownowagi algorytmu.
    expect(nowaLatwosc(2.5, 4)).toBe(2.5);
  });

  it('ocena 3 lekko obniża', () => {
    expect(nowaLatwosc(2.5, 3)).toBeLessThan(2.5);
  });

  it('ocena 0 obniża najmocniej', () => {
    expect(nowaLatwosc(2.5, 0)).toBeLessThan(nowaLatwosc(2.5, 2));
  });

  it('nigdy nie schodzi poniżej 1,3', () => {
    // Bez tej podlogi karta oceniana zawsze na zero wpadalaby w spirale
    // i wracala codziennie juz na zawsze.
    let latwosc = START_LATWOSC;
    for (let i = 0; i < 50; i++) latwosc = nowaLatwosc(latwosc, 0);
    expect(latwosc).toBe(MIN_LATWOSC);
  });

  it('trzyma dwa miejsca po przecinku', () => {
    let latwosc = START_LATWOSC;
    for (let i = 0; i < 20; i++) {
      latwosc = nowaLatwosc(latwosc, 3);
      expect(Number.isInteger(Math.round(latwosc * 100))).toBe(true);
      expect(latwosc).toBe(Math.round(latwosc * 100) / 100);
    }
  });
});

describe('nastepnyOdstep', () => {
  it('pierwsza powtórka to jeden dzień', () => {
    expect(nastepnyOdstep(1, 0, 2.5)).toBe(1);
  });

  it('druga powtórka to sześć dni, niezależnie od współczynnika', () => {
    // Dwa pierwsze odstepy sa w SM-2 sztywne — mnozenie startuje od trzeciej.
    expect(nastepnyOdstep(2, 1, 2.5)).toBe(6);
    expect(nastepnyOdstep(2, 1, 1.3)).toBe(6);
  });

  it('od trzeciej powtórki mnoży poprzedni odstęp przez współczynnik', () => {
    expect(nastepnyOdstep(3, 6, 2.5)).toBe(15);
    expect(nastepnyOdstep(4, 15, 2.5)).toBe(38);
  });

  it('nigdy nie zwraca zera', () => {
    expect(nastepnyOdstep(5, 0, 1.3)).toBe(1);
  });
});

describe('poOdpowiedzi', () => {
  it('nowa karta zaliczona wraca za dzień', () => {
    const wynik = poOdpowiedzi(stan(), 4, PUNKT_W_CZASIE);
    expect(wynik.powtorzenia).toBe(1);
    expect(wynik.odstepDni).toBe(1);
  });

  it('trzy zaliczenia z rzędu dają 1 → 6 → 15 dni', () => {
    let s = stan();
    const odstepy: number[] = [];
    for (let i = 0; i < 3; i++) {
      s = poOdpowiedzi(s, 4, PUNKT_W_CZASIE);
      odstepy.push(s.odstepDni);
    }
    expect(odstepy).toEqual([1, 6, 15]);
  });

  it('zła odpowiedź zeruje licznik i odkłada na jutro', () => {
    const dojrzala = stan({ powtorzenia: 5, odstepDni: 40, latwosc: 2.6 });
    const wynik = poOdpowiedzi(dojrzala, 1, PUNKT_W_CZASIE);

    expect(wynik.powtorzenia).toBe(0);
    expect(wynik.odstepDni).toBe(1);
  });

  it('zła odpowiedź obniża współczynnik, zamiast go pomijać', () => {
    // Czesty blad w implementacjach SM-2: aktualizacja wspolczynnika tylko
    // w galezi sukcesu. Wtedy trudna karta nigdy nie robi sie latwiejsza.
    const przed = stan({ powtorzenia: 5, odstepDni: 40, latwosc: 2.6 });
    const po = poOdpowiedzi(przed, 1, PUNKT_W_CZASIE);

    expect(po.latwosc).toBeLessThan(przed.latwosc);
  });

  it('ocena 3 zalicza, ocena 2 nie — próg jest domknięty od dołu', () => {
    expect(poOdpowiedzi(stan(), PROG_ZALICZENIA as Ocena, PUNKT_W_CZASIE).powtorzenia).toBe(1);
    expect(poOdpowiedzi(stan(), 2, PUNKT_W_CZASIE).powtorzenia).toBe(0);
  });

  it('termin jest przesunięty dokładnie o wyliczony odstęp', () => {
    const wynik = poOdpowiedzi(stan(), 5, PUNKT_W_CZASIE);
    const oczekiwany = new Date(PUNKT_W_CZASIE);
    oczekiwany.setDate(oczekiwany.getDate() + wynik.odstepDni);

    expect(wynik.termin).toBe(oczekiwany.toISOString());
  });

  it('nie zmienia stanu przekazanego na wejściu', () => {
    const wejscie = stan({ powtorzenia: 2, odstepDni: 6 });
    const kopia = { ...wejscie };

    poOdpowiedzi(wejscie, 5, PUNKT_W_CZASIE);

    expect(wejscie).toEqual(kopia);
  });

  it('jest deterministyczna', () => {
    const a = poOdpowiedzi(stan(), 4, PUNKT_W_CZASIE);
    const b = poOdpowiedzi(stan(), 4, PUNKT_W_CZASIE);
    expect(a).toEqual(b);
  });

  it('karta zaliczana samymi piątkami rozjeżdża się szybciej niż trójkami', () => {
    let piatki = stan();
    let trojki = stan();
    for (let i = 0; i < 6; i++) {
      piatki = poOdpowiedzi(piatki, 5, PUNKT_W_CZASIE);
      trojki = poOdpowiedzi(trojki, 3, PUNKT_W_CZASIE);
    }
    expect(piatki.odstepDni).toBeGreaterThan(trojki.odstepDni);
  });
});

describe('terminy', () => {
  it('nowa karta czeka na powtórkę od razu', () => {
    expect(czyDoPowtorki(stanPoczatkowy(PUNKT_W_CZASIE), PUNKT_W_CZASIE)).toBe(true);
  });

  it('karta odłożona na jutro nie czeka dzisiaj', () => {
    const jutro = poOdpowiedzi(stan(), 4, PUNKT_W_CZASIE);
    expect(czyDoPowtorki(jutro, PUNKT_W_CZASIE)).toBe(false);
  });

  it('karta zaległa nadal czeka', () => {
    const wczoraj = new Date(PUNKT_W_CZASIE.getTime() - 3 * 24 * 3600 * 1000);
    expect(czyDoPowtorki(stan({ termin: wczoraj.toISOString() }), PUNKT_W_CZASIE)).toBe(true);
  });

  it('dniDoTerminu jest ujemne dla zaległości', () => {
    const wczoraj = new Date(PUNKT_W_CZASIE.getTime() - 2 * 24 * 3600 * 1000);
    expect(dniDoTerminu(stan({ termin: wczoraj.toISOString() }), PUNKT_W_CZASIE)).toBeLessThan(0);
  });
});
