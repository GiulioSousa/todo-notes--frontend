import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

/**
 * A raiz só desenha o roteador, então é só isso que há para conferir aqui. O teste que o
 * `ng new` gerou procurava o "Hello, frontend" da página de boas-vindas, que saiu junto com
 * ela — deixá-lo falhando, ou apagá-lo sem nada no lugar, seriam as duas saídas piores.
 *
 * <p>Os testes que importam no frontend ainda não existem: a sessão (expiração, e o
 * `localStorage` indisponível) e o interceptor (o `401` que encerra, e o que não encerra na
 * rota de login). Estão anotados no `execucao.md`.
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
