import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { guardaDeSessao, guardaDeVisitante } from './guardas';
import { SessaoService } from './sessao.service';

/**
 * As duas guardas são a mesma pergunta lida nos dois sentidos, e o que importa conferir é o
 * destino: a guarda devolve uma `UrlTree`, não um `navigate`, para o roteador trocar a rota
 * em vez de navegar por cima dela.
 *
 * <p>As guardas são funções (`CanActivateFn`) e usam `inject`, então rodam dentro de
 * `runInInjectionContext`. Os dois argumentos de rota não são lidos por nenhuma das duas —
 * entram vazios, com o tipo certo.
 */
const ROTA = {} as ActivatedRouteSnapshot;
const ESTADO = {} as RouterStateSnapshot;

function configurar(autenticado: boolean): void {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: SessaoService, useValue: { autenticado: () => autenticado } },
    ],
  });
}

describe('guardaDeSessao', () => {
  it('deixa entrar quem tem sessao valida', () => {
    configurar(true);

    expect(TestBed.runInInjectionContext(() => guardaDeSessao(ROTA, ESTADO))).toBe(true);
  });

  it('manda para o login quem nao tem', () => {
    configurar(false);

    const resultado = TestBed.runInInjectionContext(() => guardaDeSessao(ROTA, ESTADO));

    expect(resultado).toBeInstanceOf(UrlTree);
    expect(String(resultado)).toBe('/login');
  });
});

describe('guardaDeVisitante', () => {
  it('deixa a tela de login aberta para quem nao entrou', () => {
    configurar(false);

    expect(TestBed.runInInjectionContext(() => guardaDeVisitante(ROTA, ESTADO))).toBe(true);
  });

  it('manda para as tarefas quem ja entrou', () => {
    configurar(true);

    const resultado = TestBed.runInInjectionContext(() => guardaDeVisitante(ROTA, ESTADO));

    expect(resultado).toBeInstanceOf(UrlTree);
    expect(String(resultado)).toBe('/tarefas');
  });
});
