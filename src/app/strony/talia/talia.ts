import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { Magazyn } from '../../rdzen/magazyn';
import { GENERATOR, Propozycja } from '../../generator/generator';

@Component({
  selector: 'app-talia',
  imports: [FormsModule, RouterLink],
  templateUrl: './talia.html',
  styleUrl: './talia.css',
})
export class TaliaStrona {
  private readonly trasa = inject(ActivatedRoute);
  private readonly generator = inject(GENERATOR);

  protected readonly magazyn = inject(Magazyn);
  protected readonly nazwaGeneratora = this.generator.nazwa;

  private readonly id = toSignal(this.trasa.paramMap.pipe(map((p) => p.get('id') ?? '')), {
    initialValue: '',
  });

  protected readonly talia = computed(() => {
    // Czytamy sygnal talii, zeby widok odswiezyl sie po kazdej zmianie stanu.
    this.magazyn.talie();
    return this.magazyn.talia(this.id());
  });

  protected readonly statystyki = computed(() => {
    const t = this.talia();
    return t ? this.magazyn.statystyki(t) : null;
  });

  // --- reczne dodawanie ---
  protected readonly przod = signal('');
  protected readonly tyl = signal('');

  protected dodajKarte(): void {
    const przod = this.przod().trim();
    const tyl = this.tyl().trim();
    if (!przod || !tyl) return;

    this.magazyn.dodajKarty(this.id(), [{ przod, tyl }]);
    this.przod.set('');
    this.tyl.set('');
  }

  // --- generowanie z tekstu ---
  protected readonly tekst = signal('');
  protected readonly propozycje = signal<Propozycja[]>([]);
  protected readonly pracuje = signal(false);
  protected readonly komunikat = signal('');

  protected async generuj(): Promise<void> {
    if (this.pracuje()) return;

    const tekst = this.tekst().trim();
    if (!tekst) {
      // Wczesniej przycisk byl w tym stanie wylaczony i klikniecie nie robilo
      // nic — bez zadnego komunikatu. To czytalo sie jak zepsuta aplikacja.
      this.komunikat.set("Najpierw wklej tekst w pole powyżej.");
      return;
    }

    this.pracuje.set(true);
    this.komunikat.set('');
    try {
      const wynik = await this.generator.generuj(tekst);
      this.propozycje.set(wynik);
      if (!wynik.length) {
        this.komunikat.set(
          'Nie znalazłem tu zdań definiujących. Spróbuj tekstu w formie „X to Y”.',
        );
      }
    } catch (e) {
      this.komunikat.set(
        `Nie udało się wygenerować: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      this.pracuje.set(false);
    }
  }

  /** Wstawia gotowy tekst, zeby dalo sie zobaczyc dzialanie bez szukania wlasnego. */
  protected wstawPrzykladowyTekst(): void {
    this.tekst.set(
      'Sygnał to obiekt, który trzyma wartość i sam powiadamia o jej zmianie. ' +
        'Computed to sygnał wyliczany z innych sygnałów. ' +
        'Effect to reakcja na zmianę sygnału, przeznaczona na skutki uboczne. ' +
        'Zoneless oznacza aplikację, która nie używa zone.js do wykrywania zmian.',
    );
    this.komunikat.set('');
    this.propozycje.set([]);
  }

  protected odrzuc(index: number): void {
    this.propozycje.update((p) => p.filter((_, i) => i !== index));
  }

  protected przyjmijPropozycje(): void {
    const propozycje = this.propozycje();
    if (!propozycje.length) return;

    this.magazyn.dodajKarty(this.id(), propozycje, 'wygenerowana');
    this.propozycje.set([]);
    this.tekst.set('');
    this.komunikat.set(`Dodano ${propozycje.length} kart.`);
  }

  protected usunKarte(idKarty: string): void {
    this.magazyn.usunKarte(this.id(), idKarty);
  }

  protected zerujPostep(): void {
    if (confirm('Wyzerować postęp wszystkich kart w tej talii?')) {
      this.magazyn.zerujPostep(this.id());
    }
  }
}
