import { Routes } from '@angular/router';
import { guardaDeSessao, guardaDeVisitante } from './core/guardas';

/**
 * As rotas carregam o componente sob demanda (`loadComponent`): a tela de login não precisa
 * trazer junto a lista de tarefas, nem o contrário.
 */
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guardaDeVisitante],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
    title: 'Entrar - todo-notes',
  },
  {
    path: 'tarefas',
    canActivate: [guardaDeSessao],
    loadComponent: () => import('./pages/tarefas/tarefas').then((m) => m.Tarefas),
    title: 'Tarefas - todo-notes',
  },
  { path: '', pathMatch: 'full', redirectTo: 'tarefas' },

  // Qualquer outro caminho cai na lista, e a guarda decide: quem tem sessão vê as tarefas,
  // quem não tem vai para o login. Uma tela de "não encontrado" diria pouco num aplicativo
  // de duas telas.
  { path: '**', redirectTo: 'tarefas' },
];
