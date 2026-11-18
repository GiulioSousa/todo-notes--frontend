import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SessaoService } from './sessao.service';

const ROTA_DE_LOGIN = '/api/auth/login';

/**
 * Põe o token na requisição e encerra a sessão quando o servidor a recusa.
 *
 * <p>São duas coisas num interceptor só porque são a mesma: a sessão. É também o que o
 * SysDeck faz.
 *
 * <p>O token só vai para URLs que começam com `/api/` — mandar o `Bearer` para qualquer
 * endereço entregaria a credencial a qualquer servidor que o aplicativo venha a chamar.
 *
 * <p>O `401` encerra a sessão, **menos na própria rota de login**: ali o `401` significa
 * "credencial errada", e tratá-lo como sessão vencida redirecionaria para a tela de login
 * quem já está nela, apagando a mensagem de erro antes de ela ser lida.
 */
export const sessaoInterceptor: HttpInterceptorFn = (requisicao, proxima) => {
  const sessao = inject(SessaoService);
  const token = sessao.token;

  const comToken =
    token && requisicao.url.startsWith('/api/')
      ? requisicao.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : requisicao;

  return proxima(comToken).pipe(
    catchError((erro: HttpErrorResponse) => {
      if (erro.status === 401 && !requisicao.url.endsWith(ROTA_DE_LOGIN)) {
        sessao.sair();
      }
      return throwError(() => erro);
    }),
  );
};
