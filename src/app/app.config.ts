import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { GENERATOR } from './generator/generator';
import { GeneratorLokalny } from './generator/generator-lokalny';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),

    // Jedyne miejsce, w ktorym aplikacja decyduje, skad biora sie fiszki.
    // Podmiana na GeneratorLlm nie dotyka zadnego komponentu — patrz README.
    GeneratorLokalny,
    { provide: GENERATOR, useExisting: GeneratorLokalny },
  ],
};
