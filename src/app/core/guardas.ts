import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessaoService } from './sessao.service';

/**
 * Barra as rotas internas de quem não tem sessão válida.
 *
 * <p>Não é segurança — segurança é o `401` do servidor, e o token é conferido lá a cada
 * requisição. É conveniência: evita abrir uma tela que só mostraria erro.
 */
export const guardaDeSessao: CanActivateFn = () => {
  const sessao = inject(SessaoService);

  return sessao.autenticado() ? true : inject(Router).createUrlTree(['/login']);
};

/**
 * O contrário: mantém quem já entrou longe da tela de login, que para essa pessoa não tem
 * nada a oferecer.
 */
export const guardaDeVisitante: CanActivateFn = () => {
  const sessao = inject(SessaoService);

  return sessao.autenticado() ? inject(Router).createUrlTree(['/tarefas']) : true;
};
