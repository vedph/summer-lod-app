import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withJsonpSupport,
} from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { NgeMonacoModule } from '@cisstech/nge/monaco';

import { EnvServiceProvider } from '@myrmidon/ng-tools';
import {
  PROXY_INTERCEPTOR_OPTIONS,
  ProxyInterceptor,
} from '@myrmidon/cadmus-refs-lookup';
import { TxtEmojiCtePlugin } from '@myrmidon/cadmus-text-ed-txt';

import { routes } from './app.routes';
import { LodLinkCtePlugin } from './services/lod-link.cte.plugin';
import {
  CADMUS_TEXT_ED_BINDINGS_TOKEN,
  CADMUS_TEXT_ED_SERVICE_OPTIONS_TOKEN,
} from '@myrmidon/cadmus-text-ed';
import { GEONAMES_USERNAME_TOKEN } from '@myrmidon/cadmus-refs-geonames-lookup';

export const CACHE_ID = 'VEDPHSS2024';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),
    EnvServiceProvider,
    provideHttpClient(withJsonpSupport()),
    importProvidersFrom(NgeMonacoModule.forRoot({})),
    // proxy
    { provide: HTTP_INTERCEPTORS, useClass: ProxyInterceptor, multi: true },
    {
      provide: PROXY_INTERCEPTOR_OPTIONS,
      useValue: {
        proxyUrl: (window as any).__env?.apiUrl as string + 'proxy',
        urls: [
          'http://lookup.dbpedia.org/api/search',
          'http://lookup.dbpedia.org/api/prefix',
        ],
      },
    },
    // geonames
    {
      provide: GEONAMES_USERNAME_TOKEN,
      useValue: 'myrmex',
    },
    // editor plugins:
    // provide each single plugin
    TxtEmojiCtePlugin,
    LodLinkCtePlugin,
    // provide a factory so that plugins can be instantiated via DI
    {
      provide: CADMUS_TEXT_ED_SERVICE_OPTIONS_TOKEN,
      useFactory: (
        mdEmojiCtePlugin: TxtEmojiCtePlugin,
        lodLinkCtePlugin: LodLinkCtePlugin
      ) => {
        return {
          plugins: [mdEmojiCtePlugin, lodLinkCtePlugin],
        };
      },
      deps: [TxtEmojiCtePlugin, LodLinkCtePlugin],
    },
    // monaco bindings for plugins
    // 2083 = monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE;
    // 2090 = monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL;
    {
      provide: CADMUS_TEXT_ED_BINDINGS_TOKEN,
      useValue: {
        2083: 'txt.emoji', // Ctrl+E
        2090: 'md.link', // Ctrl+L
      },
    },
  ],
};
