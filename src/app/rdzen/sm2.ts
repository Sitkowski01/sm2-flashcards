/**
 * SM-2 — algorytm powtórek rozłożonych w czasie (Piotr Woźniak, 1987).
 *
 * Pomysł: zamiast powtarzać wszystko po równo, odkładaj każdą kartę na tym
 * dłużej, im pewniej ją pamiętasz. Odstęp rośnie mnożąc się przez współczynnik
 * łatwości karty, a ten sam zmienia się po każdej odpowiedzi.
 *
 * Implementacja trzyma się oryginału w trzech miejscach, w których łatwo
 * pobłądzić, i każde z nich ma swój test:
 *
 *  1. Ocena poniżej 3 zeruje licznik powtórzeń — karta wraca na jutro,
 *     ale **współczynnik łatwości nie schodzi poniżej 1,3**. Bez tej podłogi
 *     trudna karta wpada w spiralę i wraca codziennie już na zawsze.
 *  2. Pierwsze dwa odstępy są sztywne (1 dzień, potem 6), a nie wyliczane —
 *     mnożenie startuje dopiero od trzeciej powtórki.
 *  3. Współczynnik aktualizuje się także przy złej odpowiedzi. Częsty błąd
 *     to pomijanie go w gałęzi porażki, przez co karta nigdy nie robi się łatwiejsza.
 */

/** Ocena odpowiedzi w skali SM-2: 0 to całkowity brak, 5 to natychmiastowa pewność. */
export type Ocena = 0 | 1 | 2 | 3 | 4 | 5;

/** Próg zaliczenia. Poniżej — karta liczona jest od zera. */
export const PROG_ZALICZENIA = 3;

/** Dolna granica współczynnika łatwości z oryginalnego SM-2. */
export const MIN_LATWOSC = 1.3;

/** Współczynnik startowy dla nowej karty. */
export const START_LATWOSC = 2.5;

export interface StanPowtorki {
  /** Ile razy z rzędu karta została zaliczona. Zła odpowiedź zeruje. */
  powtorzenia: number;
  /** Współczynnik łatwości (EF w oryginale). Im wyższy, tym rzadsze powtórki. */
  latwosc: number;
  /** Odstęp w dniach do następnej powtórki. */
  odstepDni: number;
  /** Termin następnej powtórki, ISO. */
  termin: string;
}

/** Stan karty, której jeszcze nikt nie widział. */
export function stanPoczatkowy(teraz: Date = new Date()): StanPowtorki {
  return {
    powtorzenia: 0,
    latwosc: START_LATWOSC,
    odstepDni: 0,
    termin: teraz.toISOString(),
  };
}

/**
 * Nowy współczynnik łatwości po odpowiedzi o danej ocenie.
 * Wzór z oryginalnej pracy: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02)).
 */
export function nowaLatwosc(latwosc: number, ocena: Ocena): number {
  const roznica = 5 - ocena;
  const zmiana = 0.1 - roznica * (0.08 + roznica * 0.02);
  return Math.max(MIN_LATWOSC, zaokraglijDoDwoch(latwosc + zmiana));
}

/** Kolejny odstęp w dniach — bez skutków ubocznych, żeby dało się go testować osobno. */
export function nastepnyOdstep(
  powtorzeniaPoOdpowiedzi: number,
  poprzedniOdstep: number,
  latwosc: number,
): number {
  if (powtorzeniaPoOdpowiedzi <= 1) return 1;
  if (powtorzeniaPoOdpowiedzi === 2) return 6;
  return Math.max(1, Math.round(poprzedniOdstep * latwosc));
}

/**
 * Przelicza stan karty po odpowiedzi.
 *
 * Czysta funkcja: ten sam stan i ta sama ocena zawsze dają ten sam wynik,
 * a `teraz` jest parametrem, więc testy nie zależą od zegara.
 */
export function poOdpowiedzi(
  stan: StanPowtorki,
  ocena: Ocena,
  teraz: Date = new Date(),
): StanPowtorki {
  const latwosc = nowaLatwosc(stan.latwosc, ocena);

  // Zła odpowiedź kasuje serię, ale nie kasuje tego, czego karta się o sobie
  // "nauczyła" — współczynnik zostaje i dalej wpływa na kolejne odstępy.
  const powtorzenia = ocena < PROG_ZALICZENIA ? 0 : stan.powtorzenia + 1;
  const odstepDni =
    ocena < PROG_ZALICZENIA ? 1 : nastepnyOdstep(powtorzenia, stan.odstepDni, latwosc);

  return {
    powtorzenia,
    latwosc,
    odstepDni,
    termin: dodajDni(teraz, odstepDni).toISOString(),
  };
}

/** Czy karta czeka na powtórkę o zadanej chwili. */
export function czyDoPowtorki(stan: StanPowtorki, teraz: Date = new Date()): boolean {
  return new Date(stan.termin).getTime() <= teraz.getTime();
}

/** Ile dni zostało do terminu; wartości ujemne to zaległość. */
export function dniDoTerminu(stan: StanPowtorki, teraz: Date = new Date()): number {
  const ms = new Date(stan.termin).getTime() - teraz.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function dodajDni(data: Date, dni: number): Date {
  const wynik = new Date(data.getTime());
  wynik.setDate(wynik.getDate() + dni);
  return wynik;
}

/** Współczynnik trzymamy na dwóch miejscach — inaczej narastają błędy zmiennoprzecinkowe. */
function zaokraglijDoDwoch(x: number): number {
  return Math.round(x * 100) / 100;
}
