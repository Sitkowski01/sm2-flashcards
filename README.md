# Recall Lab — powtórki rozłożone w czasie

[![CI](https://github.com/Sitkowski01/recall-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/Sitkowski01/recall-lab/actions/workflows/ci.yml)

**[Demo na żywo →](https://recall-lab-liart.vercel.app/)**

Aplikacja do nauki fiszkami, w której karta wraca dokładnie wtedy, kiedy zaczynasz ją
zapominać. Odstęp wylicza **SM-2** — ten sam algorytm powtórek, który opisał Piotr Woźniak
w 1987 roku. Fiszki można dopisać ręcznie albo **wygenerować z wklejonego tekstu**.

Angular 22: komponenty standalone, sygnały, aplikacja bez `zone.js`.

## Dlaczego akurat to

Chciałem projektu, w którym ciężar leży w logice, a nie w układzie ekranów — takiego,
gdzie widać, jak piszę kod, który musi być *poprawny*, nie tylko ładny. Algorytm powtórek
się do tego nadaje: ma trzy miejsca, w których łatwo pobłądzić, a błąd nie rzuca wyjątkiem,
tylko po cichu psuje naukę na kilka tygodni.

## Rdzeń: SM-2

Cała logika algorytmu to czyste funkcje w [`src/app/rdzen/sm2.ts`](src/app/rdzen/sm2.ts) —
bez wstrzykiwania, bez stanu, z `teraz` podanym w parametrze, żeby testy nie zależały
od zegara. Trzy pułapki, każda z własnym testem:

| Pułapka | Co się dzieje, gdy się w nią wdepnie |
|---|---|
| Brak podłogi 1,3 na współczynniku łatwości | Trudna karta schodzi coraz niżej i wraca codziennie **już na zawsze** |
| Liczenie pierwszych odstępów zamiast sztywnych 1 i 6 dni | Nowe karty rozjeżdżają się za szybko i wypadają z pamięci |
| Aktualizacja współczynnika tylko przy dobrej odpowiedzi | Karta, z którą się męczysz, **nigdy nie robi się łatwiejsza** |

Test pilnujący pierwszej z nich wygląda tak:

```ts
it('nigdy nie schodzi poniżej 1,3', () => {
  let latwosc = START_LATWOSC;
  for (let i = 0; i < 50; i++) latwosc = nowaLatwosc(latwosc, 0);
  expect(latwosc).toBe(MIN_LATWOSC);
});
```

## Generowanie fiszek — wymienny dostawca

Ekran generowania nie wie, skąd biorą się propozycje. Zna tylko interfejs:

```ts
export interface GeneratorFiszek {
  readonly nazwa: string;
  generuj(tekst: string): Promise<Propozycja[]>;
}
```

W repozytorium są dwie implementacje:

- **`GeneratorLokalny`** — heurystyka bez modelu. Szuka zdań definiujących
  („X to Y", „X jest Y", „X — Y") i zamienia je na pytanie i odpowiedź. Działa offline,
  jest deterministyczna i to ona stoi za demo: **strona pod linkiem ma działać u każdego,
  bez klucza do API i bez kosztu zapytania.**
- **`GeneratorLlm`** — model językowy przez punkt końcowy zgodny z Chat Completions.

Podmiana to jedna linia w `app.config.ts`, bez dotykania komponentów:

```ts
GeneratorLlm,
{ provide: GENERATOR, useExisting: GeneratorLlm },
{ provide: KONFIGURACJA_LLM, useValue: { adres: '/api/fiszki', model: 'gemini-2.5-flash' } },
```

⚠ Adres celowo wskazuje **własny backend**, nie API dostawcy. Klucz nie ma czego szukać
w kodzie frontu — front go nie widzi, a zapytanie podpisuje serwer.

Odpowiedź modelu przechodzi przez walidację, bo model bywa gadatliwy i owija JSON
w ` ```json ` mimo instrukcji. Dziesięć testów na samą walidację sprawdza między innymi
odpowiedź z komentarzem dookoła, uszkodzony JSON, elementy o złym kształcie i odmowę
modelu — żaden z tych przypadków nie ma prawa wysypać ekranu.

## Co jest w środku

```
src/app/
  rdzen/
    sm2.ts            algorytm — czyste funkcje, zero zależności
    magazyn.ts        stan aplikacji w sygnałach + zapis do przeglądarki
    modele.ts         typy
    przyklady.ts      zawartość startowa demo
  generator/
    generator.ts      interfejs + token wstrzykiwania
    generator-lokalny.ts
    generator-llm.ts
  strony/
    talie/            lista talii
    talia/            karty, statystyki, generator
    powtorka/         sesja powtórek
```

Wybory, o które najczęściej pytają:

- **Zapis jest efektem sygnału**, nie obowiązkiem każdej metody. `effect` w magazynie
  pilnuje, żeby nie dało się zapomnieć wywołania zapisu po dodaniu nowej operacji.
- **Kolejka powtórek jest ustalana raz, na wejściu w sesję.** Gdyby liczyć ją na bieżąco,
  ocenienie karty wyrzucałoby ją z listy w trakcie, licznik „karta 3 z 8" skakałby,
  a karta oceniona źle wracałaby w kółko w tej samej sesji.
- **Trasy ładowane leniwie** — pierwsze wejście ściąga 66 kB, reszta dochodzi na żądanie.
- **Klawiatura przed myszą**: spacja odkrywa odpowiedź, klawisze 1–4 oceniają.
  Powtórki robi się seriami, sięganie po mysz przy każdej karcie zabija tempo.
- **Uszkodzony wpis w pamięci przeglądarki** daje pusty stan, a nie biały ekran.

## Testy

**83 testy, wszystkie zielone.** Vitest, bez przeglądarki.

```bash
npm test
```

- **algorytm** (24) — każda z trzech pułapek osobno, determinizm, niezmienność wejścia,
  punkt równowagi przy ocenie 4
- **magazyn** (22) — w tym: pierwsze wejście wczytuje przykłady, ale skasowanie
  wszystkich talii ich nie odtwarza — oceny nie ruszają sąsiednich kart, kolejność od najbardziej zaległej,
  statystyki pustej talii dają zero zamiast `NaN`, uszkodzony zapis nie wywraca startu
- **generator** (19) — heurystyka i walidacja odpowiedzi modelu
- **sesja powtórek** (16) — że nie da się ocenić karty przed odkryciem odpowiedzi,
  że kolejka nie kurczy się w trakcie, obsługa klawiatury
- **powłoka** (3)

## Uruchomienie

```bash
npm install
npm start          # http://localhost:4200
npm test           # testy
npm run build      # build produkcyjny
```

## Stack

| Warstwa | Technologie |
|---|---|
| Framework | Angular 22 — standalone, sygnały, zoneless |
| Język | TypeScript 6 w trybie `strict` |
| Testy | Vitest + Angular TestBed |
| CI | GitHub Actions — testy i build |
| Wdrożenie | Vercel (produkcja) + GitHub Pages |

## Przed rozmową

[](ANGULAR-DLA-REACTOWCA.md) — różnice Angular kontra React
z odnośnikami do konkretnych linii w tym repozytorium i dziesięcioma pytaniami kontrolnymi.

## Co dalej

- Synchronizacja między urządzeniami — dziś dane zostają w przeglądarce
- Warianty algorytmu (SM-17, FSRS) za tym samym interfejsem co SM-2
- Import z Anki
