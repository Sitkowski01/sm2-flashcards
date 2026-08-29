import { Routes } from '@angular/router';

/**
 * Trasy ładowane leniwie — ekran powtórek i generator nie są potrzebne,
 * dopóki ktoś na nie nie wejdzie, a przy pierwszym otwarciu liczy się rozmiar paczki.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'Recall Lab — talie',
    loadComponent: () => import('./strony/talie/talie').then((m) => m.Talie),
  },
  {
    path: 'talia/:id',
    title: 'Recall Lab — talia',
    loadComponent: () => import('./strony/talia/talia').then((m) => m.TaliaStrona),
  },
  {
    path: 'talia/:id/powtorka',
    title: 'Recall Lab — powtórka',
    loadComponent: () => import('./strony/powtorka/powtorka').then((m) => m.Powtorka),
  },
  { path: '**', redirectTo: '' },
];
