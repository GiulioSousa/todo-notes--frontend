import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { sessaoInterceptor } from './sessao.interceptor';
import { SessaoService } from './sessao.service';

/**
 * O interceptor faz duas coisas, e as duas têm uma exceção que o navegador não mostra: o
 * token só vai para `/api/`, e o `401` encerra a sessão **menos** na rota de login.
 *
 * <p>A sessão entra dublada, e não de verdade: o que se confere aqui é o que o interceptor
 * pede a ela, não o que ela faz com o pedido — isso é do `sessao.service.spec.ts`.
 */
class SessaoDublada {
  token: string | null = 'tok-123';
  readonly sair = vi.fn();
}

describe('sessaoInterceptor', () => {
  let sessao: SessaoDublada;
  let http: HttpClient;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    sessao = new SessaoDublada();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([sessaoInterceptor])),
        provideHttpClientTesting(),
        { provide: SessaoService, useValue: sessao },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  describe('ao por o token', () => {
    it('manda o Bearer nas rotas da api', () => {
      http.get('/api/tarefas').subscribe();

      const requisicao = httpTesting.expectOne('/api/tarefas');
      expect(requisicao.request.headers.get('Authorization')).toBe('Bearer tok-123');
      requisicao.flush({ faixas: [] });
    });

    /**
     * Mandar o `Bearer` para qualquer endereço entregaria a credencial a qualquer servidor
     * que o aplicativo venha a chamar — um mapa, uma fonte, um relatório de erro.
     */
    it('nao manda o Bearer para fora da api', () => {
      http.get('https://exemplo.test/arquivo.json').subscribe();

      const requisicao = httpTesting.expectOne('https://exemplo.test/arquivo.json');
      expect(requisicao.request.headers.has('Authorization')).toBe(false);
      requisicao.flush({});
    });

    it('nao manda cabecalho nenhum sem sessao aberta', () => {
      sessao.token = null;

      http.get('/api/tarefas').subscribe();

      const requisicao = httpTesting.expectOne('/api/tarefas');
      expect(requisicao.request.headers.has('Authorization')).toBe(false);
      requisicao.flush({ faixas: [] });
    });
  });

  describe('ao receber 401', () => {
    it('encerra a sessao numa rota comum', () => {
      let falhou = false;
      http.get('/api/tarefas').subscribe({ error: () => (falhou = true) });

      httpTesting
        .expectOne('/api/tarefas')
        .flush({ mensagem: 'Token inválido' }, { status: 401, statusText: 'Unauthorized' });

      expect(sessao.sair).toHaveBeenCalledTimes(1);
      expect(falhou).toBe(true);
    });

    /**
     * Na rota de login o `401` significa "credencial errada", não "sessão vencida".
     * Tratá-lo como vencimento redirecionaria para a tela de login quem já está nela,
     * apagando a mensagem de erro antes de ela ser lida.
     */
    it('nao encerra a sessao na rota de login', () => {
      let falhou = false;
      http
        .post('/api/auth/login', { usuario: 'ana', senha: 'errada' })
        .subscribe({ error: () => (falhou = true) });

      httpTesting
        .expectOne('/api/auth/login')
        .flush(
          { mensagem: 'Usuário ou senha inválidos' },
          { status: 401, statusText: 'Unauthorized' },
        );

      expect(sessao.sair).not.toHaveBeenCalled();
      expect(falhou).toBe(true);
    });

    it('deixa o erro passar para quem chamou, sempre', () => {
      let status = 0;
      http
        .get('/api/tarefas')
        .subscribe({ error: (erro: { status: number }) => (status = erro.status) });

      httpTesting
        .expectOne('/api/tarefas')
        .flush({ mensagem: 'Token inválido' }, { status: 401, statusText: 'Unauthorized' });

      expect(status).toBe(401);
    });
  });

  describe('ao receber outros erros', () => {
    it('nao encerra a sessao no 403', () => {
      http.get('/api/tarefas/9').subscribe({ error: () => undefined });

      httpTesting
        .expectOne('/api/tarefas/9')
        .flush({ mensagem: 'Proibido' }, { status: 403, statusText: 'Forbidden' });

      expect(sessao.sair).not.toHaveBeenCalled();
    });

    it('nao encerra a sessao quando o servidor nao responde', () => {
      http.get('/api/tarefas').subscribe({ error: () => undefined });

      httpTesting.expectOne('/api/tarefas').error(new ProgressEvent('error'), { status: 0 });

      expect(sessao.sair).not.toHaveBeenCalled();
    });
  });
});
