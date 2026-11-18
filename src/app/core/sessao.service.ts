import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { RespostaAutenticacao } from './modelos';

const CHAVE = 'todo-notes.sessao';

interface Sessao {
  token: string;
  usuario: string;
  expiraEm: string;
}

/**
 * A sessão: o token, quem é o dono dele e até quando vale.
 *
 * <p>Fica em `localStorage` para sobreviver ao recarregar a página — o token é sem estado, e
 * o servidor não tem como devolvê-lo depois. Todo acesso ao armazenamento é protegido:
 * janela anônima, cota cheia ou armazenamento bloqueado fazem `localStorage` lançar, e uma
 * sessão que vale só nesta aba é melhor do que uma tela que não abre.
 */
@Injectable({ providedIn: 'root' })
export class SessaoService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sessao = signal<Sessao | null>(this.restaurar());

  readonly usuario = computed(() => this.sessao()?.usuario ?? null);

  get token(): string | null {
    return this.sessao()?.token ?? null;
  }

  /**
   * Confere a expiração pelo relógio do navegador, que é palpite e não autoridade: quem
   * decide de verdade é o servidor, no `401`. Serve para não mandar uma requisição que já
   * se sabe vencida, e para a guarda de rota não piscar a tela antes de redirecionar.
   */
  autenticado(): boolean {
    const atual = this.sessao();
    return !!atual && new Date(atual.expiraEm).getTime() > Date.now();
  }

  async entrar(usuario: string, senha: string): Promise<void> {
    const resposta = await firstValueFrom(
      this.http.post<RespostaAutenticacao>('/api/auth/login', { usuario, senha }),
    );

    this.guardar({
      token: resposta.token,
      usuario: resposta.usuario,
      expiraEm: resposta.expiraEm,
    });
  }

  /** Sair é descartar o token: não há rota de logout, porque não há estado no servidor. */
  sair(): void {
    this.sessao.set(null);
    try {
      localStorage.removeItem(CHAVE);
    } catch {
      /* armazenamento indisponível */
    }
    void this.router.navigate(['/entrar']);
  }

  private guardar(sessao: Sessao): void {
    this.sessao.set(sessao);
    try {
      localStorage.setItem(CHAVE, JSON.stringify(sessao));
    } catch {
      /* armazenamento indisponível: a sessão vale só nesta aba */
    }
  }

  private restaurar(): Sessao | null {
    try {
      const guardada = localStorage.getItem(CHAVE);
      const sessao = guardada ? (JSON.parse(guardada) as Sessao) : null;

      return sessao && new Date(sessao.expiraEm).getTime() > Date.now() ? sessao : null;
    } catch {
      return null;
    }
  }
}
