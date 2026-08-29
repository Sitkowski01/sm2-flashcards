import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { Magazyn } from './magazyn';
import { Talia } from './modele';

const TERAZ = new Date('2026-03-01T10:00:00.000Z');

describe('Magazyn', () => {
  let magazyn: Magazyn;

  const KLUCZ = 'recall-lab/talie/v1';

  beforeEach(() => {
    // Pusta tablica, a nie brak klucza: brak klucza to pierwsze wejscie,
    // ktore celowo wczytuje przykladowe talie. Testy zachowania startuja
    // od czystego stanu, zeby liczby w asercjach byly jednoznaczne.
    globalThis.localStorage?.setItem(KLUCZ, '[]');
    TestBed.configureTestingModule({});
    magazyn = TestBed.inject(Magazyn);
  });

  function taliaZKartami(ile: number): Talia {
    const talia = magazyn.dodajTalie('Biologia', 'test');
    magazyn.dodajKarty(
      talia.id,
      Array.from({ length: ile }, (_, i) => ({ przod: `P${i}`, tyl: `T${i}` })),
      'reczna',
      TERAZ,
    );
    return magazyn.talia(talia.id)!;
  }

  it('na pierwszym wejściu wczytuje przykładowe talie', () => {
    // Pusty ekran na starcie czytał się jak zepsuta aplikacja — użytkownik
    // testowy uznał, że nic nie działa, mimo widocznego przycisku.
    globalThis.localStorage?.removeItem(KLUCZ);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    const swiezy = TestBed.inject(Magazyn);

    expect(swiezy.talie().length).toBeGreaterThan(0);
    expect(swiezy.pusty()).toBe(false);
    expect(swiezy.doPowtorkiRazem()).toBeGreaterThan(0);
  });

  it('skasowanie wszystkich talii nie odtwarza przykładów', () => {
    // Decyduje obecność klucza, nie długość listy — inaczej użytkownik
    // nie mógłby świadomie zostać z pustą aplikacją.
    magazyn.dodajTalie('Do skasowania');
    for (const t of [...magazyn.talie()]) magazyn.usunTalie(t.id);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    expect(TestBed.inject(Magazyn).talie()).toEqual([]);
  });

  it('dodaje talię i nadaje jej identyfikator', () => {
    const talia = magazyn.dodajTalie('Angular', 'pytania rekrutacyjne');
    expect(talia.id).toBeTruthy();
    expect(magazyn.talie()).toHaveLength(1);
    expect(magazyn.pusty()).toBe(false);
  });

  it('usuwa talię', () => {
    const talia = magazyn.dodajTalie('Do skasowania');
    magazyn.usunTalie(talia.id);
    expect(magazyn.talie()).toEqual([]);
  });

  it('dodaje karty do właściwej talii', () => {
    const a = magazyn.dodajTalie('A');
    const b = magazyn.dodajTalie('B');

    magazyn.dodajKarty(a.id, [{ przod: 'x', tyl: 'y' }]);

    expect(magazyn.talia(a.id)!.karty).toHaveLength(1);
    expect(magazyn.talia(b.id)!.karty).toHaveLength(0);
  });

  it('pusta lista kart nie tworzy niczego', () => {
    const talia = magazyn.dodajTalie('A');
    magazyn.dodajKarty(talia.id, []);
    expect(magazyn.talia(talia.id)!.karty).toEqual([]);
  });

  it('zapamiętuje, skąd karta pochodzi', () => {
    const talia = magazyn.dodajTalie('A');
    magazyn.dodajKarty(talia.id, [{ przod: 'x', tyl: 'y' }], 'wygenerowana');
    expect(magazyn.talia(talia.id)!.karty[0].zrodlo).toBe('wygenerowana');
  });

  it('nowe karty czekają na powtórkę od razu', () => {
    const talia = taliaZKartami(3);
    expect(magazyn.doPowtorki(talia, TERAZ)).toHaveLength(3);
  });

  it('ocena odkłada kartę na później', () => {
    const talia = taliaZKartami(1);
    const karta = talia.karty[0];

    magazyn.ocen(talia.id, karta.id, 4, TERAZ);

    expect(magazyn.doPowtorki(magazyn.talia(talia.id)!, TERAZ)).toHaveLength(0);
  });

  it('zła ocena zostawia kartę na jutro, nie na dziś', () => {
    const talia = taliaZKartami(1);
    magazyn.ocen(talia.id, talia.karty[0].id, 1, TERAZ);

    const po = magazyn.talia(talia.id)!;
    expect(po.karty[0].stan.odstepDni).toBe(1);
    expect(magazyn.doPowtorki(po, TERAZ)).toHaveLength(0);
  });

  it('ocena nie rusza pozostałych kart', () => {
    const talia = taliaZKartami(3);
    magazyn.ocen(talia.id, talia.karty[0].id, 5, TERAZ);

    const po = magazyn.talia(talia.id)!;
    expect(po.karty[1].stan.powtorzenia).toBe(0);
    expect(po.karty[2].stan.powtorzenia).toBe(0);
  });

  it('karty do powtórki idą od najbardziej zaległej', () => {
    const talia = taliaZKartami(3);
    const pozniej = new Date(TERAZ.getTime() + 40 * 24 * 3600 * 1000);

    // Pierwsza karta dostaje najdluzszy odstep, wiec ma byc na koncu kolejki.
    magazyn.ocen(talia.id, talia.karty[0].id, 5, TERAZ);
    magazyn.ocen(talia.id, talia.karty[0].id, 5, TERAZ);

    const kolejka = magazyn.doPowtorki(magazyn.talia(talia.id)!, pozniej);
    expect(kolejka.at(-1)!.id).toBe(talia.karty[0].id);
  });

  it('usuwa pojedynczą kartę', () => {
    const talia = taliaZKartami(2);
    magazyn.usunKarte(talia.id, talia.karty[0].id);
    expect(magazyn.talia(talia.id)!.karty).toHaveLength(1);
  });

  it('zeruje postęp, zostawiając karty', () => {
    const talia = taliaZKartami(2);
    magazyn.ocen(talia.id, talia.karty[0].id, 5, TERAZ);

    magazyn.zerujPostep(talia.id, TERAZ);

    const po = magazyn.talia(talia.id)!;
    expect(po.karty).toHaveLength(2);
    expect(po.karty.every((k) => k.stan.powtorzenia === 0)).toBe(true);
  });

  describe('statystyki', () => {
    it('liczy karty nowe i do powtórki', () => {
      const talia = taliaZKartami(4);
      const s = magazyn.statystyki(talia, TERAZ);

      expect(s.wszystkie).toBe(4);
      expect(s.nowe).toBe(4);
      expect(s.doPowtorki).toBe(4);
    });

    it('policzona karta przestaje być nowa', () => {
      const talia = taliaZKartami(2);
      magazyn.ocen(talia.id, talia.karty[0].id, 4, TERAZ);

      expect(magazyn.statystyki(magazyn.talia(talia.id)!, TERAZ).nowe).toBe(1);
    });

    it('średni współczynnik pustej talii to zero, nie NaN', () => {
      const talia = magazyn.dodajTalie('Pusta');
      expect(magazyn.statystyki(talia, TERAZ).sredniaLatwosc).toBe(0);
    });

    it('wykrywa zaległości starsze niż dzień', () => {
      const talia = taliaZKartami(1);
      const zaTydzien = new Date(TERAZ.getTime() + 7 * 24 * 3600 * 1000);
      expect(magazyn.statystyki(talia, zaTydzien).zalegle).toBe(1);
    });
  });

  it('licznik kart do powtórki sumuje wszystkie talie', () => {
    taliaZKartami(2);
    taliaZKartami(3);
    expect(magazyn.doPowtorkiRazem()).toBe(5);
  });

  it('nieznane identyfikatory nie wywracają aplikacji', () => {
    expect(magazyn.talia('nie-ma')).toBeUndefined();
    expect(() => magazyn.ocen('nie-ma', 'tez-nie', 5, TERAZ)).not.toThrow();
    expect(() => magazyn.usunKarte('nie-ma', 'tez-nie')).not.toThrow();
  });

  it('uszkodzony wpis w pamięci przeglądarki daje pusty stan, nie biały ekran', () => {
    globalThis.localStorage?.setItem('recall-lab/talie/v1', '{to nie jest json');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    expect(TestBed.inject(Magazyn).talie()).toEqual([]);
  });
});
