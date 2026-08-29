import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { BehaviorSubject } from 'rxjs';

import { Powtorka } from './powtorka';
import { Magazyn } from '../../rdzen/magazyn';
import { Talia } from '../../rdzen/modele';

/**
 * Skladowe komponentu sa 'protected' — widzi je szablon, nie widzi ich reszta
 * aplikacji. Test siega po nie przez jawny opis, zamiast rozluzniac widocznosc
 * w kodzie produkcyjnym tylko po to, zeby dalo sie go przetestowac.
 */
interface DostepDoPowtorki {
  wszystkie(): number;
  pozycja(): number;
  odkryta(): boolean;
  ocenione(): number;
  pomylki(): number;
  koniec(): boolean;
  postep(): number;
  biezaca(): unknown;
  odkryj(): void;
  ocen(ocena: 0 | 1 | 2 | 3 | 4 | 5): void;
  klawisz(zdarzenie: KeyboardEvent): void;
}

describe('Powtorka', () => {
  let fixture: ComponentFixture<Powtorka>;
  let komponent: DostepDoPowtorki;
  let magazyn: Magazyn;
  let talia: Talia;

  async function zbuduj(ileKart: number) {
    globalThis.localStorage?.clear();

    // ActivatedRoute musi byc podany PRZED pierwszym injectem, bo TestBed
    // po instancjacji nie przyjmuje juz overrideProvider. Identyfikator talii
    // powstaje pozniej, wiec snapshot czyta go przez getter.
    let idTalii = '';
    const parametry = new BehaviorSubject(convertToParamMap({ id: '' }));

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: parametry,
            snapshot: {
              get paramMap() {
                return convertToParamMap({ id: idTalii });
              },
            },
          },
        },
      ],
    });

    magazyn = TestBed.inject(Magazyn);

    talia = magazyn.dodajTalie('Test', '');
    magazyn.dodajKarty(
      talia.id,
      Array.from({ length: ileKart }, (_, i) => ({ przod: `P${i}`, tyl: `T${i}` })),
    );

    idTalii = talia.id;
    parametry.next(convertToParamMap({ id: talia.id }));

    fixture = TestBed.createComponent(Powtorka);
    komponent = fixture.componentInstance as unknown as DostepDoPowtorki;
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('buduje kolejkę z kart czekających na powtórkę', async () => {
    await zbuduj(3);
    expect(komponent.wszystkie()).toBe(3);
    expect(komponent.pozycja()).toBe(0);
  });

  it('startuje z zakrytą odpowiedzią', async () => {
    await zbuduj(2);
    expect(komponent.odkryta()).toBe(false);
  });

  it('nie pozwala ocenić karty przed odkryciem odpowiedzi', async () => {
    // Ocena "pamietam" wystawiona przed zobaczeniem tylu nie znaczy nic.
    await zbuduj(2);
    komponent.ocen(5);
    expect(komponent.pozycja()).toBe(0);
    expect(komponent.ocenione()).toBe(0);
  });

  it('po odkryciu i ocenie przechodzi do następnej karty', async () => {
    await zbuduj(2);
    komponent.odkryj();
    komponent.ocen(4);

    expect(komponent.pozycja()).toBe(1);
    expect(komponent.ocenione()).toBe(1);
    expect(komponent.odkryta()).toBe(false);
  });

  it('kolejka nie kurczy się w trakcie sesji', async () => {
    // Gdyby liczyc ja na biezaco z magazynu, ocenienie karty wyrzucaloby ja
    // z listy i licznik "karta X z Y" skakalby w trakcie powtorki.
    await zbuduj(3);
    komponent.odkryj();
    komponent.ocen(5);

    expect(komponent.wszystkie()).toBe(3);
  });

  it('karta oceniona źle nie wraca w tej samej sesji', async () => {
    await zbuduj(2);
    komponent.odkryj();
    komponent.ocen(0);

    expect(komponent.pozycja()).toBe(1);
    expect(komponent.wszystkie()).toBe(2);
  });

  it('liczy pomyłki osobno', async () => {
    await zbuduj(3);
    komponent.odkryj();
    komponent.ocen(0);
    komponent.odkryj();
    komponent.ocen(5);
    komponent.odkryj();
    komponent.ocen(2);

    expect(komponent.ocenione()).toBe(3);
    expect(komponent.pomylki()).toBe(2);
  });

  it('kończy sesję po ostatniej karcie', async () => {
    await zbuduj(1);
    expect(komponent.koniec()).toBe(false);

    komponent.odkryj();
    komponent.ocen(4);

    expect(komponent.koniec()).toBe(true);
  });

  it('zapisuje ocenę w magazynie', async () => {
    await zbuduj(1);
    komponent.odkryj();
    komponent.ocen(5);

    expect(magazyn.talia(talia.id)!.karty[0].stan.powtorzenia).toBe(1);
  });

  it('postęp rośnie od zera', async () => {
    await zbuduj(4);
    expect(komponent.postep()).toBe(0);

    komponent.odkryj();
    komponent.ocen(4);

    expect(komponent.postep()).toBe(25);
  });

  it('pusta talia nie wywraca ekranu', async () => {
    await zbuduj(0);
    expect(komponent.wszystkie()).toBe(0);
    expect(komponent.biezaca()).toBeUndefined();
  });

  describe('klawiatura', () => {
    it('spacja odkrywa odpowiedź', async () => {
      await zbuduj(2);
      komponent.klawisz(new KeyboardEvent('keydown', { code: 'Space' }));
      expect(komponent.odkryta()).toBe(true);
    });

    it('cyfra nie działa, dopóki odpowiedź jest zakryta', async () => {
      await zbuduj(2);
      komponent.klawisz(new KeyboardEvent('keydown', { key: '3' }));
      expect(komponent.pozycja()).toBe(0);
    });

    it('cyfry 1–4 oceniają odkrytą kartę', async () => {
      await zbuduj(2);
      komponent.odkryj();
      komponent.klawisz(new KeyboardEvent('keydown', { key: '4' }));

      expect(komponent.pozycja()).toBe(1);
      expect(komponent.pomylki()).toBe(0);
    });

    it('cyfra 1 liczy się jako pomyłka', async () => {
      await zbuduj(2);
      komponent.odkryj();
      komponent.klawisz(new KeyboardEvent('keydown', { key: '1' }));

      expect(komponent.pomylki()).toBe(1);
    });

    it('nieobsługiwany klawisz nic nie robi', async () => {
      await zbuduj(2);
      komponent.odkryj();
      komponent.klawisz(new KeyboardEvent('keydown', { key: 'q' }));

      expect(komponent.pozycja()).toBe(0);
    });

    it('po końcu sesji klawiatura milczy', async () => {
      await zbuduj(1);
      komponent.odkryj();
      komponent.ocen(4);

      komponent.klawisz(new KeyboardEvent('keydown', { code: 'Space' }));
      expect(komponent.odkryta()).toBe(false);
    });
  });
});
