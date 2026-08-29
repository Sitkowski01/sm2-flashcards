import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';

import { MAKS_PROPOZYCJI } from './generator';
import { GeneratorLokalny } from './generator-lokalny';
import { GeneratorLlm, KONFIGURACJA_LLM } from './generator-llm';

describe('GeneratorLokalny', () => {
  let generator: GeneratorLokalny;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GeneratorLokalny] });
    generator = TestBed.inject(GeneratorLokalny);
  });

  it('robi fiszkę ze zdania z „to"', async () => {
    const [karta] = await generator.generuj('Fotosynteza to proces wytwarzania cukrów.');
    expect(karta.przod).toBe('Co to jest: Fotosynteza?');
    expect(karta.tyl).toBe('proces wytwarzania cukrów');
  });

  it('radzi sobie z „jest", „oznacza" i myślnikiem', async () => {
    const karty = await generator.generuj(
      [
        'Mitochondrium jest organellum komórkowym.',
        'HTTP oznacza protokół przesyłania dokumentów.',
        'REST — styl architektury usług sieciowych.',
      ].join('\n'),
    );
    expect(karty).toHaveLength(3);
    expect(karty.map((k) => k.przod)).toEqual([
      'Co to jest: Mitochondrium?',
      'Co to jest: HTTP?',
      'Co to jest: REST?',
    ]);
  });

  it('ucina kropkę z końca odpowiedzi', async () => {
    const [karta] = await generator.generuj('Wektor to obiekt matematyczny.');
    expect(karta.tyl.endsWith('.')).toBe(false);
  });

  it('pomija zdania bez definicji', async () => {
    expect(await generator.generuj('Poszedłem wczoraj do sklepu i kupiłem chleb.')).toEqual([]);
  });

  it('pomija zdania, w których termin jest całym zdaniem złożonym', async () => {
    // Przod karty musi byc krotki — inaczej nie da sie jej powtarzac.
    const karty = await generator.generuj(
      'Wszystko to, co udało nam się wtedy ustalić na zebraniu to sprawa otwarta.',
    );
    expect(karty).toEqual([]);
  });

  it('nie powtarza tego samego terminu dwa razy', async () => {
    const karty = await generator.generuj(
      'Kot to ssak. Kot to zwierzę domowe. Pies to ssak.',
    );
    expect(karty).toHaveLength(2);
  });

  it('tnie długie wklejenia do limitu', async () => {
    const tekst = Array.from({ length: 40 }, (_, i) => `Termin${i} to definicja numer ${i}.`).join(' ');
    expect(await generator.generuj(tekst)).toHaveLength(MAKS_PROPOZYCJI);
  });

  it('na pustym wejściu zwraca pustą listę, nie błąd', async () => {
    expect(await generator.generuj('')).toEqual([]);
    expect(await generator.generuj('   \n  ')).toEqual([]);
  });

  it('jest deterministyczny', async () => {
    const tekst = 'Enzym to białko przyspieszające reakcje.';
    expect(await generator.generuj(tekst)).toEqual(await generator.generuj(tekst));
  });
});

describe('GeneratorLlm — walidacja odpowiedzi modelu', () => {
  let generator: GeneratorLlm;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GeneratorLlm,
        { provide: KONFIGURACJA_LLM, useValue: { adres: 'http://test', model: 'x' } },
      ],
    });
    generator = TestBed.inject(GeneratorLlm);
  });

  it('czyta poprawną tablicę', () => {
    const wynik = generator.zwaliduj('[{"przod":"Co to REST?","tyl":"styl architektury"}]');
    expect(wynik).toEqual([{ przod: 'Co to REST?', tyl: 'styl architektury' }]);
  });

  it('wyłuskuje JSON owinięty w znaczniki kodu i komentarz', () => {
    // Model regularnie dokleja ```json i zdanie wstepu mimo instrukcji.
    const wynik = generator.zwaliduj(
      'Oto fiszki:\n```json\n[{"przod":"A","tyl":"B"}]\n```\nGotowe!',
    );
    expect(wynik).toEqual([{ przod: 'A', tyl: 'B' }]);
  });

  it('odrzuca elementy o złym kształcie, zostawiając poprawne', () => {
    const wynik = generator.zwaliduj(
      '[{"przod":"A","tyl":"B"},{"przod":"C"},{"tyl":"D"},{"przod":1,"tyl":2},{"przod":"E","tyl":"F"}]',
    );
    expect(wynik).toEqual([
      { przod: 'A', tyl: 'B' },
      { przod: 'E', tyl: 'F' },
    ]);
  });

  it('odrzuca puste napisy', () => {
    expect(generator.zwaliduj('[{"przod":"  ","tyl":"B"}]')).toEqual([]);
  });

  it('przycina białe znaki', () => {
    expect(generator.zwaliduj('[{"przod":"  A  ","tyl":"  B  "}]')).toEqual([
      { przod: 'A', tyl: 'B' },
    ]);
  });

  it('nie wywraca się na tekście bez JSON-a', () => {
    expect(generator.zwaliduj('Przepraszam, nie mogę tego zrobić.')).toEqual([]);
  });

  it('nie wywraca się na uszkodzonym JSON-ie', () => {
    expect(generator.zwaliduj('[{"przod":"A","tyl":]')).toEqual([]);
  });

  it('odrzuca odpowiedź, która nie jest tablicą', () => {
    expect(generator.zwaliduj('{"przod":"A","tyl":"B"}')).toEqual([]);
  });

  it('odrzuca odpowiedź, która nie jest napisem', () => {
    expect(generator.zwaliduj(null)).toEqual([]);
    expect(generator.zwaliduj(42)).toEqual([]);
  });

  it('tnie do limitu', () => {
    const duzo = JSON.stringify(
      Array.from({ length: 50 }, (_, i) => ({ przod: `P${i}`, tyl: `T${i}` })),
    );
    expect(generator.zwaliduj(duzo)).toHaveLength(MAKS_PROPOZYCJI);
  });
});
