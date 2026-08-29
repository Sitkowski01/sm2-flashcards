import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from './app';
import { Magazyn } from './rdzen/magazyn';

describe('App', () => {
  beforeEach(async () => {
    globalThis.localStorage?.clear();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('tworzy się', () => {
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  it('bez kart do powtórki nie pokazuje licznika', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.licznik')).toBeNull();
  });

  it('pokazuje w pasku, ile kart czeka na powtórkę', () => {
    const magazyn = TestBed.inject(Magazyn);
    const talia = magazyn.dodajTalie('Test');
    magazyn.dodajKarty(talia.id, [
      { przod: 'a', tyl: 'b' },
      { przod: 'c', tyl: 'd' },
    ]);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.licznik').textContent).toContain('2');
  });
});
