# Angular dla reactowca

Notatka do przerobienia **przed rozmową techniczną**. Nie tłumaczy Angulara od zera —
tłumaczy go przez to, co już umiesz z Reacta, i pokazuje konkretne linie w tym repozytorium.

Na końcu jest dziesięć pytań kontrolnych. Jeśli nie umiesz na nie odpowiedzieć,
ten projekt zaszkodzi na rozmowie zamiast pomóc.

---

## 1. Sygnał to nie `useState`

Najczęstsze uproszczenie i najłatwiejsze do obalenia jednym pytaniem.

```ts
// React
const [ocenione, setOcenione] = useState(0);
setOcenione(ocenione + 1);          // wartość z TEGO renderu

// Angular — src/app/strony/powtorka/powtorka.ts
protected readonly ocenione = signal(0);
this.ocenione.update((n) => n + 1); // wartość aktualna, bez renderu w tle
```

Różnice, które trzeba umieć nazwać:

- **Sygnał czyta się wywołaniem**: `ocenione()`, nie `ocenione`. To nie jest ozdobnik —
  właśnie ten odczyt rejestruje zależność.
- **Nie ma cyklu renderu.** W Reakcie `useState` zwraca wartość zamrożoną w danym renderze
  i stąd biorą się nieaktualne domknięcia. Sygnał zawsze oddaje bieżącą wartość.
- **Nie ma tablicy zależności.** `computed` sam wie, z czego korzysta, bo widzi,
  które sygnały zostały odczytane podczas liczenia.

## 2. `computed` to nie `useMemo`

```ts
// src/app/strony/powtorka/powtorka.ts
protected readonly postep = computed(() =>
  this.wszystkie() ? Math.round((this.pozycja() / this.wszystkie()) * 100) : 0,
);
```

`useMemo` przelicza się, gdy zmieni się cokolwiek w tablicy zależności — także gdy
wartość jest ta sama. `computed`:

- jest **leniwy** — nie policzy się, dopóki ktoś go nie odczyta,
- **zapamiętuje wynik** i przelicza dopiero, gdy któraś zależność faktycznie się zmieniła,
- **nie przyjmuje tablicy zależności**, bo sam je zbiera.

Pytanie, które potrafi paść: *co się stanie, gdy w `computed` odczytasz sygnał wewnątrz
`if`?* Odpowiedź: zależności są zbierane przy każdym przeliczeniu na nowo, więc gałąź,
która się nie wykonała, nie tworzy zależności.

## 3. `effect` to nie `useEffect`

```ts
// src/app/rdzen/magazyn.ts
constructor() {
  effect(() => this.zapisz(this.stan()));
}
```

- **Brak tablicy zależności** — `effect` śledzi to, co odczytał.
- **Sprzątanie idzie przez `onCleanup`**, nie przez zwrócenie funkcji.
- `effect` służy do **skutków ubocznych**: zapisu, logu, wywołania API. Jeśli chcesz
  policzyć wartość — to `computed`, nie `effect`. To jest najczęstszy błąd przy
  przesiadce i pytanie z tego pada bardzo często.

Tutaj `effect` jest po to, żeby **zapis nie był obowiązkiem każdej metody**. Gdyby
`zapisz()` trzeba było wołać ręcznie, pierwsza dopisana operacja o nim zapomni.

## 4. Wstrzykiwanie zależności — czego React nie ma

To jest największa różnica pojęciowa i najlepszy temat na rozmowę.

```ts
// src/app/generator/generator.ts
export const GENERATOR = new InjectionToken<GeneratorFiszek>('GeneratorFiszek');

// src/app/app.config.ts
GeneratorLokalny,
{ provide: GENERATOR, useExisting: GeneratorLokalny },
```

W Reakcie najbliższym odpowiednikiem jest Context, ale to nie to samo: Context przekazuje
wartość w dół drzewa komponentów, a wstrzykiwacz Angulara to **hierarchia dostawców
niezależna od drzewa widoku**, rozstrzygana po typie albo tokenie.

W tym projekcie ekran generowania nie wie, czy fiszki policzyła heurystyka, czy model
językowy. Podmiana dostawcy to jedna linia w `app.config.ts` i **żadna zmiana
w komponencie** — to jest dokładnie ten argument, który warto powiedzieć głośno.

`providedIn: 'root'` (jak w `Magazyn` i `MotywService`) oznacza jeden egzemplarz
na aplikację, tworzony leniwie i usuwalny z paczki, gdy nikt go nie używa.

## 5. Szablon zamiast JSX

```html
<!-- src/app/strony/powtorka/powtorka.html -->
@if (talia(); as t) { ... } @else { ... }
@for (o of oceny; track o.ocena) { ... }
```

- Nowa składnia `@if` / `@for` / `@switch` zastąpiła `*ngIf` i `*ngFor`
  (te są w Cookbooku, bo to Angular 17 — warto znać obie).
- **`track` jest obowiązkowy** w `@for`. To odpowiednik `key` w Reakcie i tak samo
  decyduje, czy Angular przestawi istniejące elementy, czy zbuduje je od nowa.
- `@empty` obsługuje pustą listę bez osobnego `@if` — jest w `talie.html`.
- Szablon to **nie jest JavaScript**. Nie ma dowolnych wyrażeń, nie ma opcjonalnego
  wywołania funkcji z argumentami z zewnątrz. To celowe ograniczenie, nie brak.

## 6. Wykrywanie zmian i „zoneless"

Ta aplikacja jest **zoneless** — bez `zone.js`.

Klasyczny Angular łatał globalne API przeglądarki (`setTimeout`, zdarzenia, `fetch`),
żeby po każdym z nich sprawdzić całe drzewo komponentów. Zoneless odwraca to: widok
odświeża się, **bo zmienił się sygnał**, a nie dlatego, że coś się wydarzyło.

Skutki, o które pytają:

- mniejsza paczka i mniej pracy na każde zdarzenie,
- stan trzymany poza sygnałami może **nie odświeżyć widoku** — dlatego w tym repozytorium
  każdy zmienny stan komponentu jest sygnałem,
- `ChangeDetectionStrategy.OnPush` przestaje być optymalizacją do dokładania ręcznie.

## 7. Routing — więcej niż React Router

```ts
// src/app/app.routes.ts
{
  path: 'talia/:id',
  loadComponent: () => import('./strony/talia/talia').then((m) => m.TaliaStrona),
}
```

- `loadComponent` to leniwe ładowanie **wbudowane w router**, bez `React.lazy`
  i bez `Suspense`.
- Parametr trasy jest **strumieniem**, nie wartością. Stąd:

```ts
private readonly id = toSignal(this.trasa.paramMap.pipe(map((p) => p.get('id') ?? '')), {
  initialValue: '',
});
```

  `toSignal` zamienia Observable na sygnał i **sam odsubskrybowuje** przy zniszczeniu
  komponentu. Gdyby czytać `snapshot.paramMap`, przejście `/talia/1` → `/talia/2`
  nie odświeżyłoby widoku, bo router **nie tworzy komponentu od nowa** dla tej samej trasy.
  To jest klasyczne pytanie rekrutacyjne.

- W Cookbooku jest `canMatch` — strażnik decydujący, czy trasa w ogóle **pasuje**
  do adresu. Różnica względem `canActivate`: gdy `canMatch` zwróci fałsz, router
  próbuje kolejnych tras, zamiast przerwać nawigację.

## 8. Komponenty standalone i `@Input`

```ts
// src/app/strony/talie/talie.ts
@Component({
  selector: 'app-talie',
  imports: [FormsModule, RouterLink],
  templateUrl: './talie.html',
})
```

Komponent sam deklaruje, czego używa — `NgModule` nie jest już potrzebny (od Angulara 19
standalone jest domyślne). Cookbook pokazuje **oba światy**: został przy `AppModule`,
ale nowe komponenty są standalone.

W Cookbooku znajdziesz też `@Input({ required: true })` — odpowiednik wymaganego propa,
tyle że sprawdzany przy budowaniu, nie w `propTypes`.

## 9. `protected` w komponencie

Składowe używane wyłącznie przez szablon są `protected`. Szablon je widzi, reszta
aplikacji nie. Test sięga po nie przez jawny interfejs (`DostepDoPowtorki`
w `powtorka.spec.ts`), zamiast rozluźniać widoczność w kodzie produkcyjnym tylko po to,
żeby dało się go przetestować. Warto to powiedzieć, jeśli ktoś zapyta o testowalność.

## 10. Czego tu świadomie NIE ma

Bądź gotowy to obronić — brak czegoś jest decyzją, nie luką, jeśli umiesz podać powód.

- **RxJS poza `toSignal`.** Nie ma tu strumieni zdarzeń ani zapytań sieciowych, więc
  wciąganie całego RxJS byłoby na siłę. **W magisterce jest czysty RxJS bez NgRx** —
  na to pytanie odpowiadaj tamtym projektem.
- **NgRx.** Stan mieści się w jednym serwisie z sygnałami. NgRx przy tej skali dokłada
  warstwę akcji i reduktorów bez zysku. Umiej powiedzieć, **kiedy** by się opłacił:
  wiele niezależnych fragmentów stanu, potrzeba śledzenia historii, wielu autorów.
- **Angular Material.** Style są własne, bo chciałem pokazać, że umiem zbudować układ,
  a nie tylko poskładać gotowe komponenty.
- **Backend.** Dane zostają w przeglądarce. Backend do tej samej domeny mam osobno
  w `price-alerts-api` (FastAPI + PostgreSQL).

---

## Pytania kontrolne — sprawdź się przed rozmową

1. Dlaczego sygnał czyta się wywołaniem `x()`, a nie jak zwykłe pole?
2. Czym `computed` różni się od `useMemo` — wymień dwie rzeczy.
3. Kiedy `effect`, a kiedy `computed`? Co jest częstym nadużyciem `effect`?
4. Co to znaczy, że aplikacja jest „zoneless" i co przestaje wtedy działać samo?
5. Dlaczego parametr trasy czytam przez `toSignal`, a nie z `snapshot`?
6. Czym `canMatch` różni się od `canActivate`?
7. Do czego służy `InjectionToken` i czym różni się od Contextu w Reakcie?
8. Co robi `track` w `@for` i co się stanie, gdy podasz tam indeks?
9. Co oznacza `providedIn: 'root'` i kiedy chciałbyś czegoś innego?
10. Kiedy sięgnąłbyś po NgRx, skoro tutaj wystarczył serwis z sygnałami?

**Pytanie dodatkowe, prawie pewne przy tym projekcie:** *czemu logika SM-2 jest w czystych
funkcjach poza serwisem?* Odpowiedź: bo nie potrzebuje wstrzykiwania ani stanu, a dzięki
temu testuje się ją bez `TestBed` i bez zegara — `teraz` jest parametrem.
