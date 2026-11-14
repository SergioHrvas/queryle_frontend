import { LOCALE_ID, ApplicationConfig, provideBrowserGlobalErrorListeners, provideAppInitializer, inject } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthService } from '@core/auth/auth.service';
import { authInterceptor } from '@core/auth/auth.interceptor';

registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return authService.init();
    }),
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'es-ES' },
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes), 
    provideClientHydration(),
    provideTranslateService({
      loader: provideTranslateHttpLoader({prefix:'./i18n/', suffix:'.json'}),
      fallbackLang: 'es'
    })
  ]
};
