import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { Magazyn } from '../../rdzen/magazyn';
import { Karta } from '../../rdzen/modele';
import { Ocena } from '../../rdzen/sm2';

/** Opisy ocen — skala SM-2 jest sześciostopniowa, ale człowiek myśli słowami. */
export const OCENY: { ocena: Ocena; etykieta: string; klawisz: string }[] = [
  { ocena: 0, etykieta: 'Nie pamiętam', klawisz: '1' },
  { ocena: 3, etykieta: 'Z trudem', klawisz: '2' },
  { ocena: 4, etykieta: 'Dobrze', klawisz: '3' },
  { ocena: 5, etykieta: 'Od razu', klawisz: '4' },
];

@Component({
  selector: 'app-powtorka',
  imports: [RouterLink],
  templateUrl: './powtorka.html',
  styleUrl: './powtorka.css',
})
export class Powtorka {
  private readonly trasa = inject(ActivatedRoute);
  protected readonly magazyn = inject(Magazyn);

  protected readonly oceny = OCENY;

  private readonly id = toSignal(this.trasa.paramMap.pipe(map((p) => p.get('id') ?? '')), {
    initialValue: '',
  });

  protected readonly talia = computed(() => {
    this.magazyn.talie();
    return this.magazyn.talia(this.id());
  });

  /**
   * Kolejka ustalana raz, na wejściu.
   *
   * Gdyby liczyć ją na bieżąco z magazynu, ocenienie karty wyrzucałoby ją
   * z listy w trakcie sesji i kolejna karta podskakiwałaby pod kursor —
   * a karta oceniona źle wracałaby w tej samej sesji w kółko.
   */
  private readonly kolejka = signal<Karta[]>(this.zbudujKolejke());
  protected readonly pozycja = signal(0);
  protected readonly odkryta = signal(false);
  protected readonly ocenione = signal(0);
  protected readonly pomylki = signal(0);

  protected readonly biezaca = computed(() => this.kolejka()[this.pozycja()]);
  protected readonly koniec = computed(() => this.pozycja() >= this.kolejka().length);
  protected readonly wszystkie = computed(() => this.kolejka().length);

  protected readonly postep = computed(() =>
    this.wszystkie() ? Math.round((this.pozycja() / this.wszystkie()) * 100) : 0,
  );

  private zbudujKolejke(): Karta[] {
    const idTalii = this.trasa.snapshot.paramMap.get('id') ?? '';
    const talia = this.magazyn.talia(idTalii);
    return talia ? this.magazyn.doPowtorki(talia) : [];
  }

  protected odkryj(): void {
    this.odkryta.set(true);
  }

  protected ocen(ocena: Ocena): void {
    const karta = this.biezaca();
    if (!karta || !this.odkryta()) return;

    this.magazyn.ocen(this.id(), karta.id, ocena);
    this.ocenione.update((n) => n + 1);
    if (ocena < 3) this.pomylki.update((n) => n + 1);

    this.odkryta.set(false);
    this.pozycja.update((n) => n + 1);
  }

  protected odNowa(): void {
    this.kolejka.set(this.zbudujKolejke());
    this.pozycja.set(0);
    this.odkryta.set(false);
    this.ocenione.set(0);
    this.pomylki.set(0);
  }

  /** Spacja odkrywa, cyfry oceniają — powtórki robi się klawiaturą, nie myszą. */
  @HostListener('window:keydown', ['$event'])
  protected klawisz(zdarzenie: KeyboardEvent): void {
    if (this.koniec()) return;

    if (zdarzenie.code === 'Space' || zdarzenie.key === 'Enter') {
      zdarzenie.preventDefault();
      if (!this.odkryta()) this.odkryj();
      return;
    }

    if (!this.odkryta()) return;

    const wybor = OCENY.find((o) => o.klawisz === zdarzenie.key);
    if (wybor) {
      zdarzenie.preventDefault();
      this.ocen(wybor.ocena);
    }
  }
}
