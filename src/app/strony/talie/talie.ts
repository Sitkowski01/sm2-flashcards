import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Magazyn } from '../../rdzen/magazyn';
import { PRZYKLADOWE_TALIE } from '../../rdzen/przyklady';

@Component({
  selector: 'app-talie',
  imports: [FormsModule, RouterLink],
  templateUrl: './talie.html',
  styleUrl: './talie.css',
})
export class Talie {
  protected readonly magazyn = inject(Magazyn);

  protected readonly nazwa = signal('');
  protected readonly opis = signal('');

  protected dodaj(): void {
    const nazwa = this.nazwa().trim();
    if (!nazwa) return;

    this.magazyn.dodajTalie(nazwa, this.opis().trim());
    this.nazwa.set('');
    this.opis.set('');
  }

  /** Wypełnia aplikację treścią, żeby demo nie zaczynało się od pustego ekranu. */
  protected wczytajPrzyklady(): void {
    for (const przyklad of PRZYKLADOWE_TALIE) {
      const talia = this.magazyn.dodajTalie(przyklad.nazwa, przyklad.opis);
      this.magazyn.dodajKarty(talia.id, przyklad.karty);
    }
  }

  protected usun(id: string, nazwa: string): void {
    if (confirm(`Usunąć talię „${nazwa}" razem z kartami?`)) {
      this.magazyn.usunTalie(id);
    }
  }

  protected statystyki(id: string) {
    const talia = this.magazyn.talia(id);
    return talia ? this.magazyn.statystyki(talia) : null;
  }
}
