import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  Categoria,
  EdicaoDeTarefa,
  FiltroDeConcluidas,
  ListaDeTarefas,
  ListaPorCategoria,
  Lugar,
  LugarNaCategoria,
  NovaTarefa,
  Preferencias,
  Status,
  Tarefa,
} from './modelos';

/**
 * As 14 rotas da API, tipadas. É o único arquivo que conhece caminhos e verbos.
 *
 * <p>As URLs são relativas: em desenvolvimento o `proxy.conf.json` manda `/api` para a
 * `localhost:8080`, e em produção frontend e API saem do mesmo domínio. Nos dois casos o
 * navegador vê mesma origem, e nenhuma requisição passa por CORS.
 *
 * <p>Devolve `Promise`, e não `Observable`: nenhuma destas chamadas emite mais de uma vez,
 * e `await` lê melhor do que `subscribe` em componente com signals.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  /**
   * A lista, nas três faixas.
   *
   * <p>Parâmetro ausente não vai na URL: `categoriaId` nulo significa "todas as
   * categorias", e mandá-lo vazio faria o servidor tentar converter uma string vazia em
   * número — um `400` em vez de uma listagem.
   */
  listarTarefas(
    categoriaId: number | null = null,
    concluidas: FiltroDeConcluidas = 'PADRAO',
  ): Promise<ListaDeTarefas> {
    let parametros = new HttpParams().set('concluidas', concluidas);
    if (categoriaId !== null) {
      parametros = parametros.set('categoriaId', categoriaId);
    }

    return firstValueFrom(this.http.get<ListaDeTarefas>('/api/tarefas', { params: parametros }));
  }

  /**
   * A mesma lista, agrupada por categoria: um grupo por categoria cadastrada, mesmo vazia, e
   * o das sem etiqueta no fim.
   *
   * <p>Não aceita `categoriaId`: filtrar por categoria uma lista agrupada por categoria é
   * escolher um grupo, e quem o faz é a tela, rolando até ele.
   */
  listarTarefasPorCategoria(
    concluidas: FiltroDeConcluidas = 'PADRAO',
  ): Promise<ListaPorCategoria> {
    const parametros = new HttpParams().set('concluidas', concluidas);

    return firstValueFrom(
      this.http.get<ListaPorCategoria>('/api/tarefas/por-categoria', { params: parametros }),
    );
  }

  criarTarefa(tarefa: NovaTarefa): Promise<Tarefa> {
    return firstValueFrom(this.http.post<Tarefa>('/api/tarefas', tarefa));
  }

  editarTarefa(id: number, tarefa: EdicaoDeTarefa): Promise<Tarefa> {
    return firstValueFrom(this.http.put<Tarefa>(`/api/tarefas/${id}`, tarefa));
  }

  /**
   * O arrastar. Devolve **as faixas afetadas** — uma, ou duas quando o card troca de
   * prioridade —, já renumeradas: a tela as substitui em vez de recarregar a lista.
   */
  moverTarefa(id: number, lugar: Lugar): Promise<ListaDeTarefas> {
    return firstValueFrom(this.http.patch<ListaDeTarefas>(`/api/tarefas/${id}/lugar`, lugar));
  }

  /**
   * O arrastar no modo por categoria. Devolve **os grupos afetados** — um, ou dois quando o
   * card troca de categoria —, já renumerados.
   *
   * <p>Soltar o card em outro grupo troca a etiqueta dele, inclusive para nenhuma: é o que
   * `categoriaId: null` quer dizer. A ordem por prioridade não é tocada.
   */
  moverTarefaNaCategoria(id: number, lugar: LugarNaCategoria): Promise<ListaPorCategoria> {
    return firstValueFrom(
      this.http.patch<ListaPorCategoria>(`/api/tarefas/${id}/lugar-na-categoria`, lugar),
    );
  }

  alterarStatus(id: number, status: Status): Promise<Tarefa> {
    return firstValueFrom(this.http.patch<Tarefa>(`/api/tarefas/${id}/status`, { status }));
  }

  excluirTarefa(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/tarefas/${id}`));
  }

  listarCategorias(): Promise<Categoria[]> {
    return firstValueFrom(this.http.get<Categoria[]>('/api/categorias'));
  }

  criarCategoria(nome: string): Promise<Categoria> {
    return firstValueFrom(this.http.post<Categoria>('/api/categorias', { nome }));
  }

  renomearCategoria(id: number, nome: string): Promise<Categoria> {
    return firstValueFrom(this.http.put<Categoria>(`/api/categorias/${id}`, { nome }));
  }

  /** Não bloqueia: as tarefas que a usavam perdem a etiqueta, e nenhuma é apagada. */
  excluirCategoria(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/categorias/${id}`));
  }

  /** Nunca dá 404: sem linha gravada, o servidor devolve o padrão. */
  buscarPreferencias(): Promise<Preferencias> {
    return firstValueFrom(this.http.get<Preferencias>('/api/preferencias'));
  }

  gravarPreferencias(preferencias: Preferencias): Promise<Preferencias> {
    return firstValueFrom(this.http.put<Preferencias>('/api/preferencias', preferencias));
  }
}
