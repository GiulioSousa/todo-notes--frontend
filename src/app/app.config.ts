import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { sessaoInterceptor } from './core/sessao.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // O interceptor da sessão põe o token e encerra a sessão no 401. Registrado aqui, e não
    // no serviço, porque é a configuração da aplicação que decide o que passa na rede.
    provideHttpClient(withInterceptors([sessaoInterceptor])),
  ],
};
