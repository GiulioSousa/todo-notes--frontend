import { Routes } from '@angular/router';
import { guardaDeSessao, guardaDeVisitante } from './core/guardas';

/**
 * As rotas carregam o componente sob demanda (`loadComponent`): a tela de login não precisa
 * trazer junto a lista de tarefas, nem o contrário.
 *
 * <p>As telas de dentro são filhas do `Layout`, que desenha o cabeçalho e a navegação. O
 * login fica de fora dele, e por isso não tem nenhum dos dois.
 */
export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guardaDeVisitante],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
    title: 'Entrar - todo-notes',
  },
  {
    path: '',
    canActivate: [guardaDeSessao],
    loadComponent: () => import('./layout/layout').then((m) => m.Layout),
    children: [
      {
        path: 'tarefas',
        loadComponent: () => import('./pages/tarefas/tarefas').then((m) => m.Tarefas),
        title: 'Tarefas - todo-notes',
      },
      {
        path: 'categorias',
        loadComponent: () => import('./pages/categorias/categorias').then((m) => m.Categorias),
        title: 'Categorias - todo-notes',
      },
      {
        path: 'preferencias',
        loadComponent: () =>
          import('./pages/preferencias/preferencias').then((m) => m.TelaDePreferencias),
        title: 'Preferências - todo-notes',
      },
      { path: '', pathMatch: 'full', redirectTo: 'tarefas' },
    ],
  },

  // Qualquer outro caminho cai na lista, e a guarda decide: quem tem sessão vê as tarefas,
  // quem não tem vai para o login. Uma tela de "não encontrado" diria pouco num aplicativo
  // de três telas.
  { path: '**', redirectTo: 'tarefas' },
];
