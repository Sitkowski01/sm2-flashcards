import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Magazyn } from '../../rdzen/magazyn';
import { StatystykiTalii } from '../../rdzen/modele';
import { PRZYKLADOWE_TALIE } from '../../rdzen/przyklady';

/** Co zrobić z talią zależnie od tego, w jakim jest stanie. */
interface Akcja {
  etykieta: string;
  trasa: unknown[];
  glowna: boolean;
}

@Component({
  selector: 'app-talie',
  imports: [FormsModule, RouterLink],
  templateUrl: './talie.html',
  styleUrl: './talie.css',
})
export class Talie {
  protected readonly magazyn = inject(Magazyn);
  private readonly router = inject(Router);

  protected readonly nazwa = signal('');
  protected readonly opis = signal('');

  protected dodaj(): void {
    const nazwa = this.nazwa().trim();
    if (!nazwa) return;

    const talia = this.magazyn.dodajTalie(nazwa, this.opis().trim());
    this.nazwa.set('');
    this.opis.set('');

    // Nowa talia jest pusta, wiec zostawienie uzytkownika na liscie prowadzi
    // donikad — jedyne, co moze zrobic, to wejsc w powtorke bez kart.
    // Wchodzimy od razu tam, gdzie dodaje sie karty.
    void this.router.navigate(['/talia', talia.id]);
  }

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

  protected statystyki(id: string): StatystykiTalii | null {
    const talia = this.magazyn.talia(id);
    return talia ? this.magazyn.statystyki(talia) : null;
  }

  /**
   * Przycisk przy talii pokazuje to, co ma sens teraz.
   * Wczesniej zawsze stalo „Powtarzaj", takze przy talii bez ani jednej karty.
   */
  protected akcja(id: string): Akcja {
    const s = this.statystyki(id);

    if (!s || s.wszystkie === 0) {
      return { etykieta: 'Dodaj karty', trasa: ['/talia', id], glowna: true };
    }
    if (s.doPowtorki > 0) {
      return {
        etykieta: `Powtarzaj (${s.doPowtorki})`,
        trasa: ['/talia', id, 'powtorka'],
        glowna: true,
      };
    }
    return { etykieta: 'Przeglądaj', trasa: ['/talia', id], glowna: false };
  }
}
