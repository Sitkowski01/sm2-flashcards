/**
 * Zawartość startowa demo.
 *
 * Aplikacja z pustym ekranem na wejściu nie pokazuje niczego, więc jest tu
 * garść kart z dziedzin, o które i tak pyta się na rozmowach.
 */
export interface PrzykladowaTalia {
  nazwa: string;
  opis: string;
  karty: { przod: string; tyl: string }[];
}

export const PRZYKLADOWE_TALIE: PrzykladowaTalia[] = [
  {
    nazwa: 'Angular — sygnały i zmiana wykrywania',
    opis: 'Pytania, które padają na rozmowach o Angulara',
    karty: [
      {
        przod: 'Czym różni się `signal` od `BehaviorSubject`?',
        tyl: 'Sygnał jest synchroniczny i zawsze ma wartość, czyta się go wywołaniem, a zależności śledzi automatycznie. BehaviorSubject wymaga subskrypcji i ręcznego sprzątania.',
      },
      {
        przod: 'Co robi `computed`?',
        tyl: 'Tworzy sygnał wyliczany z innych sygnałów. Liczy się leniwie i tylko wtedy, gdy któraś zależność faktycznie się zmieniła.',
      },
      {
        przod: 'Co oznacza aplikacja „zoneless"?',
        tyl: 'Angular nie używa zone.js do wykrywania zmian — odświeżenie widoku wywołuje zmiana sygnału, a nie przechwycone zdarzenie przeglądarki.',
      },
      {
        przod: 'Kiedy `effect`, a kiedy `computed`?',
        tyl: '`computed` gdy chcesz wyliczyć wartość. `effect` gdy chcesz skutku ubocznego — zapisu, logu, wywołania API. Effect nie zwraca wartości.',
      },
      {
        przod: 'Czym jest komponent standalone?',
        tyl: 'Komponentem, który sam deklaruje swoje zależności w `imports` i nie potrzebuje NgModule. Od Angulara 19 to domyślny tryb.',
      },
      {
        przod: 'Do czego służy `canMatch` w routingu?',
        tyl: 'Decyduje, czy trasa w ogóle pasuje do adresu. W odróżnieniu od `canActivate` pozwala routerowi próbować dalszych tras, gdy zwróci fałsz.',
      },
    ],
  },
  {
    nazwa: 'SM-2 — algorytm powtórek',
    opis: 'Jak działa rdzeń tej aplikacji',
    karty: [
      {
        przod: 'Co robi ocena poniżej 3 w SM-2?',
        tyl: 'Zeruje licznik powtórzeń i odkłada kartę na jeden dzień. Współczynnik łatwości nadal się aktualizuje.',
      },
      {
        przod: 'Dlaczego współczynnik łatwości ma podłogę 1,3?',
        tyl: 'Bez niej trudna karta schodziłaby coraz niżej i wracała codziennie już na zawsze, bez szansy na dłuższy odstęp.',
      },
      {
        przod: 'Jakie są dwa pierwsze odstępy w SM-2?',
        tyl: 'Sztywne: 1 dzień i 6 dni. Mnożenie przez współczynnik zaczyna się dopiero od trzeciej powtórki.',
      },
      {
        przod: 'Dla której oceny współczynnik się nie zmienia?',
        tyl: 'Dla 4 — wzór daje wtedy zmianę równą zeru. To punkt równowagi algorytmu.',
      },
    ],
  },
];
