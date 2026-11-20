import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

/**
 * A raiz só desenha o roteador, então é só isso que há para conferir aqui. O teste que o
 * `ng new` gerou procurava o "Hello, frontend" da página de boas-vindas, que saiu junto com
 * ela — deixá-lo falhando, ou apagá-lo sem nada no lugar, seriam as duas saídas piores.
 *
 * <p>Os testes que importam estão nos seus próprios arquivos: a sessão em
 * `core/sessao.service.spec.ts`, o interceptor em `core/sessao.interceptor.spec.ts`, as
 * guardas em `core/guardas.spec.ts` e a regra do arrastar em `pages/tarefas/arrastar.spec.ts`.
 */
describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('cria a raiz e desenha a saida do roteador', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.componentInstance).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).querySelector('router-outlet')).toBeTruthy();
  });
});
