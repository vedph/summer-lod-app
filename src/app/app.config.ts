import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { NgeMonacoModule } from '@cisstech/nge/monaco';

import { EnvServiceProvider } from '@myrmidon/ng-tools';
import {
  PROXY_INTERCEPTOR_OPTIONS,
  ProxyInterceptor,
} from '@myrmidon/cadmus-refs-lookup';

import { routes } from './app.routes';

export const CACHE_ID = 'VEDPHSS2024';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),
    EnvServiceProvider,
    importProvidersFrom(HttpClientModule),
    importProvidersFrom(NgeMonacoModule.forRoot({})),
    // proxy
    { provide: HTTP_INTERCEPTORS, useClass: ProxyInterceptor, multi: true },
    {
      provide: PROXY_INTERCEPTOR_OPTIONS,
      useValue: {
        proxyUrl: (window as any).__env?.proxyUrl as string,
        urls: [
          'http://lookup.dbpedia.org/api/search',
          'http://lookup.dbpedia.org/api/prefix',
        ],
      },
    },
  ],
};
