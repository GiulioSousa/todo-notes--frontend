import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SessaoService } from './sessao.service';

/**
 * Os dois caminhos que a sessão tem e que o navegador não mostrou: a expiração, que depende
 * do relógio, e o `localStorage` indisponível, que depende de janela anônima ou de
 * armazenamento bloqueado.
 *
 * <p>O serviço lê o armazenamento na construção, no inicializador do campo. Por isso cada
 * teste arruma o `localStorage` **antes** do `TestBed.inject` — injetar é o que constrói.
 *
 * <p>A chave é repetida aqui de propósito: ela é privada no serviço, e um teste que a
 * importasse deixaria de perceber se ela mudasse de nome.
 */
const CHAVE = 'todo-notes.sessao';

function daquiAUmaHora(): string {
  return new Date(Date.now() + 3_600_000).toISOString();
}

function umaHoraAtras(): string {
  return new Date(Date.now() - 3_600_000).toISOString();
}

function guardar(expiraEm: string, token = 'tok-123', usuario = 'ana'): void {
  localStorage.setItem(CHAVE, JSON.stringify({ token, usuario, expiraEm }));
}

describe('SessaoService', () => {
  let navegacoes: unknown[][];
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    navegacoes = [];
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: Router,
          useValue: {
            navigate: (comandos: unknown[]) => {
              navegacoes.push(comandos);
              return Promise.resolve(true);
            },
          },
        },
      ],
    });

    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    httpTesting.verify();
    localStorage.clear();
  });

  describe('ao restaurar do armazenamento', () => {
    it('traz de volta a sessao que ainda vale', () => {
      guardar(daquiAUmaHora());

      const sessao = TestBed.inject(SessaoService);

      expect(sessao.autenticado()).toBe(true);
      expect(sessao.token).toBe('tok-123');
      expect(sessao.usuario()).toBe('ana');
    });

    it('descarta a sessao expirada', () => {
      guardar(umaHoraAtras());

      const sessao = TestBed.inject(SessaoService);

      expect(sessao.autenticado()).toBe(false);
      expect(sessao.token).toBeNull();
      expect(sessao.usuario()).toBeNull();
    });

    it('nao abre sessao com armazenamento corrompido', () => {
      localStorage.setItem(CHAVE, 'isto nao e json');

      const sessao = TestBed.inject(SessaoService);

      expect(sessao.autenticado()).toBe(false);
      expect(sessao.token).toBeNull();
    });

    it('comeca sem sessao quando nao ha nada guardado', () => {
      const sessao = TestBed.inject(SessaoService);

      expect(sessao.autenticado()).toBe(false);
      expect(sessao.usuario()).toBeNull();
    });
  });

  describe('ao expirar com a aba aberta', () => {
    /**
     * A expiração deixa de autenticar, mas **não** apaga o token: quem decide de verdade é
     * o servidor, no `401`, e é o interceptor que encerra a sessão quando ele vem. Apagar o
     * token aqui seria o cliente julgando sozinho, com um relógio que é palpite.
     */
    it('deixa de autenticar sem descartar o token', () => {
      guardar(daquiAUmaHora());
      const sessao = TestBed.inject(SessaoService);
      expect(sessao.autenticado()).toBe(true);

      const duasHorasAFrente = Date.now() + 7_200_000;
      vi.spyOn(Date, 'now').mockReturnValue(duasHorasAFrente);

      expect(sessao.autenticado()).toBe(false);
      expect(sessao.token).toBe('tok-123');
    });
  });

  describe('ao entrar', () => {
    it('guarda o token na memoria e no armazenamento', async () => {
      const sessao = TestBed.inject(SessaoService);
      const expiraEm = daquiAUmaHora();

      const entrando = sessao.entrar('ana', 'senha-de-teste-publica');

      const requisicao = httpTesting.expectOne('/api/auth/login');
      expect(requisicao.request.method).toBe('POST');
      expect(requisicao.request.body).toEqual({
        usuario: 'ana',
        senha: 'senha-de-teste-publica',
      });
      requisicao.flush({ token: 'tok-456', usuario: 'ana', expiraEm });
      await entrando;

      expect(sessao.autenticado()).toBe(true);
      expect(sessao.token).toBe('tok-456');
      expect(sessao.usuario()).toBe('ana');
      expect(JSON.parse(localStorage.getItem(CHAVE) ?? 'null')).toEqual({
        token: 'tok-456',
        usuario: 'ana',
        expiraEm,
      });
    });

    it('propaga a falha do servidor sem abrir sessao', async () => {
      const sessao = TestBed.inject(SessaoService);

      const entrando = sessao.entrar('ana', 'errada');
      httpTesting
        .expectOne('/api/auth/login')
        .flush(
          { mensagem: 'Usuário ou senha inválidos' },
          { status: 401, statusText: 'Unauthorized' },
        );

      await expect(entrando).rejects.toBeDefined();
      expect(sessao.autenticado()).toBe(false);
      expect(localStorage.getItem(CHAVE)).toBeNull();
    });
  });

  describe('ao sair', () => {
    it('apaga a sessao, limpa o armazenamento e volta para o login', () => {
      guardar(daquiAUmaHora());
      const sessao = TestBed.inject(SessaoService);

      sessao.sair();

      expect(sessao.autenticado()).toBe(false);
      expect(sessao.token).toBeNull();
      expect(sessao.usuario()).toBeNull();
      expect(localStorage.getItem(CHAVE)).toBeNull();
      expect(navegacoes).toEqual([['/login']]);
    });
  });

  /**
   * Janela anônima, cota cheia ou armazenamento bloqueado por política: o `localStorage`
   * lança em vez de devolver. Uma sessão que vale só nesta aba é melhor do que uma tela que
   * não abre, e é isso que estes três testes cobram.
   */
  describe('com o armazenamento indisponivel', () => {
    it('sobe sem sessao quando a leitura lanca', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('armazenamento bloqueado');
      });

      const sessao = TestBed.inject(SessaoService);

      expect(sessao.autenticado()).toBe(false);
      expect(sessao.token).toBeNull();
    });

    it('mantem a sessao na memoria quando a escrita lanca', async () => {
      const sessao = TestBed.inject(SessaoService);
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('cota excedida');
      });

      const entrando = sessao.entrar('ana', 'senha-de-teste-publica');
      httpTesting
        .expectOne('/api/auth/login')
        .flush({ token: 'tok-789', usuario: 'ana', expiraEm: daquiAUmaHora() });
      await entrando;

      expect(sessao.autenticado()).toBe(true);
      expect(sessao.token).toBe('tok-789');
    });

    it('sai mesmo quando a remocao lanca', () => {
      guardar(daquiAUmaHora());
      const sessao = TestBed.inject(SessaoService);
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('armazenamento bloqueado');
      });

      expect(() => sessao.sair()).not.toThrow();
      expect(sessao.autenticado()).toBe(false);
      expect(navegacoes).toEqual([['/login']]);
    });
  });
});
