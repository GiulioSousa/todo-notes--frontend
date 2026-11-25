import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDragPlaceholder,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { mensagemDoErro } from '../../core/erros';
import {
  Categoria,
  Faixa,
  FiltroDeConcluidas,
  GrupoDeCategoria,
  ModoDeVisualizacao,
  Prioridade,
  Status,
  Tarefa,
} from '../../core/modelos';
import {
  DadosDaConfirmacao,
  DialogoDeConfirmacao,
} from '../../shared/dialogo-de-confirmacao';
import {
  DadosDoFormulario,
  FormularioDeTarefa,
  ResultadoDoFormulario,
} from './formulario-de-tarefa';
import { FIM_DO_GRUPO, posicaoDoModo, posicaoNoGrupo } from './posicao-no-grupo';

/** Onde ficam as escolhas de tela: estado do navegador, como o tema (Seção 8). */
export const CHAVE_DO_FILTRO = 'todo-notes.concluidas';
export const CHAVE_DO_MODO = 'todo-notes.modo';

/**
 * Sem escolha gravada, as concluídas ficam ocultas: concluir uma tarefa a tira da lista na
 * hora, sem ninguém precisar apertar nada. "Mostrar todas" continua a um clique, e a escolha
 * fica gravada no navegador.
 */
export const FILTRO_INICIAL: FiltroDeConcluidas = 'NENHUMA';

/** O modo inicial é por prioridade: é o que a lista era antes de haver escolha. */
export const MODO_INICIAL: ModoDeVisualizacao = 'PRIORIDADE';

/** O rótulo do grupo das tarefas sem etiqueta. A API manda categoria nula; o nome é da tela. */
export const SEM_CATEGORIA = 'Sem categoria';

/**
 * Um grupo como a tela o desenha, vindo de qualquer um dos dois modos.
 *
 * <p>Existe para que o desenho do card apareça <b>uma vez</b> no template. As duas listagens
 * têm formatos diferentes — a faixa tem uma prioridade, o grupo tem uma categoria ou nenhuma
 * —, e sem esta forma intermediária o template teria dois blocos quase iguais, que
 * divergiriam no primeiro ajuste de estilo.
 */
export interface GrupoNaTela {
  /** Identidade estável: serve ao `track` e a casar os grupos que o servidor devolve. */
  chave: string;
  rotulo: string;
  /** A chave do grupo no modo por prioridade; nula no outro modo. */
  prioridade: Prioridade | null;
  /** A chave do grupo no modo por categoria; nula também no grupo das sem etiqueta. */
  categoriaId: number | null;
  tarefas: Tarefa[];
}

/**
 * A lista, em dois modos de visualização, com o arrastar.
 *
 * <p><b>Cada modo guarda a sua própria ordem no servidor</b>: arrastar por prioridade não
 * mexe na ordem por categoria, e o contrário também não. São duas listas da mesma coisa, e
 * não duas formas de desenhar uma.
 *
 * <p><b>A posição que o servidor espera é o índice no grupo inteiro</b>, e o que o
 * `cdk/drag-drop` entrega é o índice na lista que está na tela. Os dois divergem assim que
 * algum card fica escondido — pelo filtro de concluídas ou pelo de categoria —, e quem os
 * reconcilia é {@link posicaoNoGrupo}. Por isso o arrastar vale com qualquer filtro, nos dois
 * modos.
 */
@Component({
  selector: 'app-tarefas',
  imports: [
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
    CdkDropList,
    CdkDropListGroup,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  templateUrl: './tarefas.html',
  styleUrl: './tarefas.scss',
})
export class Tarefas implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialogo = inject(MatDialog);

  readonly grupos = signal<GrupoNaTela[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);

  readonly modo = signal<ModoDeVisualizacao>(modoGravado());
  readonly categoriaFiltrada = signal<number | null>(null);
  readonly filtroDeConcluidas = signal<FiltroDeConcluidas>(filtroGravado());

  readonly porPrioridade = computed(() => this.modo() === 'PRIORIDADE');

  ngOnInit(): void {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);

    try {
      // As duas juntas: sem as categorias o formulário não sabe quais nomes já existem, e o
      // filtro não tem o que listar.
      const [grupos, categorias] = await Promise.all([
        this.carregarGrupos(),
        this.api.listarCategorias(),
      ]);

      this.grupos.set(grupos);
      this.categorias.set(categorias);
    } catch (falha) {
      this.erro.set(mensagemDoErro(falha));
    } finally {
      this.carregando.set(false);
    }
  }

  /**
   * Trocar de modo recarrega do servidor, porque a outra ordem está lá, e não aqui: as duas
   * posições vêm em cada card, mas os grupos e a ordem deles são do servidor.
   *
   * <p>O filtro de categoria é limpo na ida para o modo por categoria. Ele não se aplica a
   * uma lista já agrupada por categoria — e deixá-lo guardado faria a volta ao outro modo
   * esconder cards por causa de uma escolha feita dois cliques antes, que a tela não mostra
   * mais.
   */
  async alternarModo(modo: ModoDeVisualizacao): Promise<void> {
    if (modo === this.modo()) {
      return;
    }

    this.modo.set(modo);
    if (modo === 'CATEGORIA') {
      this.categoriaFiltrada.set(null);
    }
    gravar(CHAVE_DO_MODO, modo);
    await this.carregar();
  }

  async criar(): Promise<void> {
    const resultado = await this.abrirFormulario();
    if (!resultado) {
      return;
    }

    await this.comErro(async () => {
      await this.api.criarTarefa({
        titulo: resultado.titulo,
        descricao: resultado.descricao,
        prioridade: resultado.prioridade,
        categoriaId: resultado.categoriaId,
      });
      await this.carregar();
    });
  }

  /**
   * Editar são até duas chamadas, e é a Seção 6 que manda: o `PUT` não muda prioridade, e
   * mudar de faixa pelo formulário cai no `PATCH /lugar`, com a posição do fim da faixa de
   * destino. É o que mantém a regra da faixa num lugar só.
   *
   * <p>A categoria, ao contrário, vai no `PUT` — e é o servidor que move o card para o fim do
   * grupo de destino, porque a etiqueta é a chave daquele grupo. Duas rotas para a mesma
   * troca deixariam a tela decidir em qual ordem mexer.
   */
  async editar(tarefa: Tarefa): Promise<void> {
    const resultado = await this.abrirFormulario(tarefa);
    if (!resultado) {
      return;
    }

    await this.comErro(async () => {
      await this.api.editarTarefa(tarefa.id, {
        titulo: resultado.titulo,
        descricao: resultado.descricao,
        categoriaId: resultado.categoriaId,
      });

      if (resultado.prioridade !== tarefa.prioridade) {
        // O fim da faixa de destino. O tamanho da lista na tela não serve: com cards
        // escondidos ele é menor que a faixa, e o card pararia no meio dela.
        await this.api.moverTarefa(tarefa.id, {
          prioridade: resultado.prioridade,
          posicao: FIM_DO_GRUPO,
        });
      }

      await this.carregar();
    });
  }

  /**
   * Move na tela primeiro e manda depois: a resposta do servidor substitui os grupos
   * afetados, já renumerados. Se a chamada falhar, recarrega — o servidor é quem sabe onde
   * o card está.
   *
   * <p>Qual das duas ordens está sendo reescrita depende do modo, e é a única diferença entre
   * os dois arrastares: no modo por categoria, soltar o card em outro grupo <b>troca a
   * etiqueta dele</b>, inclusive para nenhuma.
   */
  async soltar(evento: CdkDragDrop<GrupoNaTela>): Promise<void> {
    const mesmoGrupo = evento.previousContainer === evento.container;
    if (mesmoGrupo && evento.previousIndex === evento.currentIndex) {
      return;
    }

    const tarefa = evento.item.data as Tarefa;
    const destino = evento.container.data;
    const posicaoDe = posicaoDoModo(this.modo());

    // A tradução usa a tela de ANTES do movimento: são as posições que o servidor conhece.
    const visiveisNoDestino = (
      this.grupos().find((grupo) => grupo.chave === destino.chave)?.tarefas ?? []
    ).filter((visivel) => visivel.id !== tarefa.id);
    const posicao = posicaoNoGrupo(
      visiveisNoDestino,
      evento.currentIndex,
      mesmoGrupo ? posicaoDe(tarefa) : null,
      posicaoDe,
    );

    const copia = this.grupos().map((grupo) => ({ ...grupo, tarefas: [...grupo.tarefas] }));
    const origem = copia.find((grupo) => grupo.chave === evento.previousContainer.data.chave);
    const paraOnde = copia.find((grupo) => grupo.chave === destino.chave);
    if (!origem || !paraOnde) {
      return;
    }

    if (mesmoGrupo) {
      moveItemInArray(paraOnde.tarefas, evento.previousIndex, evento.currentIndex);
    } else {
      transferArrayItem(origem.tarefas, paraOnde.tarefas, evento.previousIndex, evento.currentIndex);
    }
    this.grupos.set(copia);

    try {
      const afetados = this.porPrioridade()
        ? (await this.api.moverTarefa(tarefa.id, {
            prioridade: destino.prioridade!,
            posicao,
          })).faixas.map(grupoDaFaixa)
        : (await this.api.moverTarefaNaCategoria(tarefa.id, {
            categoriaId: destino.categoriaId,
            posicao,
          })).grupos.map(grupoDaCategoria);

      this.substituirGrupos(afetados);
    } catch (falha) {
      this.erro.set(mensagemDoErro(falha));
      await this.carregar();
    }
  }

  concluida(tarefa: Tarefa): boolean {
    return tarefa.status === 'CONCLUIDA';
  }

  /** O rótulo que a pessoa lê; o enum é para a máquina. */
  rotuloDoStatus(status: Status): string {
    switch (status) {
      case 'PENDENTE':
        return 'Pendente';
      case 'EM_ANDAMENTO':
        return 'Em andamento';
      case 'CONCLUIDA':
        return 'Concluída';
    }
  }

  /**
   * O rótulo da prioridade, que o template usa na marca do card quando o agrupamento é por
   * categoria. É a função de módulo, exposta como membro porque é só a membros que o template
   * tem acesso.
   */
  readonly rotuloDaPrioridade = rotuloDaPrioridade;

  readonly statusPossiveis: Status[] = ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA'];

  /**
   * Trocar um filtro recarrega do servidor, em vez de filtrar o que já está na memória. O
   * motivo é a regra de ocultar concluídas: ela depende do relógio e das preferências, e
   * quem a aplica é o caso de uso — repeti-la aqui seria mantê-la em dois lugares.
   */
  async filtrarPorCategoria(categoriaId: number | null): Promise<void> {
    this.categoriaFiltrada.set(categoriaId);
    await this.carregar();
  }

  async filtrarConcluidas(filtro: FiltroDeConcluidas): Promise<void> {
    this.filtroDeConcluidas.set(filtro);
    gravar(CHAVE_DO_FILTRO, filtro);
    await this.carregar();
  }

  /**
   * Troca o status. Quem grava ou limpa a data de conclusão é o servidor, com o relógio
   * dele — o cliente manda o status e nada mais.
   */
  async alterarStatus(tarefa: Tarefa, status: Status): Promise<void> {
    if (tarefa.status === status) {
      return;
    }

    await this.comErro(async () => {
      await this.api.alterarStatus(tarefa.id, status);
      await this.carregar();
    });
  }

  /**
   * Exclui, depois de perguntar. É definitivo: não há lixeira, e o `DELETE` da API não
   * guarda cópia. O servidor renumera os dois grupos do card no mesmo movimento.
   */
  async excluir(tarefa: Tarefa): Promise<void> {
    const dados: DadosDaConfirmacao = {
      titulo: 'Excluir a tarefa?',
      mensagem: `"${tarefa.titulo}" será apagada definitivamente. Não há como desfazer.`,
      confirmar: 'Excluir',
      perigo: true,
    };

    const confirmado = await firstValueFrom(
      this.dialogo.open(DialogoDeConfirmacao, { data: dados }).afterClosed(),
    );
    if (!confirmado) {
      return;
    }

    await this.comErro(async () => {
      await this.api.excluirTarefa(tarefa.id);
      await this.carregar();
    });
  }

  private async carregarGrupos(): Promise<GrupoNaTela[]> {
    if (this.porPrioridade()) {
      const lista = await this.api.listarTarefas(
        this.categoriaFiltrada(),
        this.filtroDeConcluidas(),
      );
      return lista.faixas.map(grupoDaFaixa);
    }

    const lista = await this.api.listarTarefasPorCategoria(this.filtroDeConcluidas());
    return lista.grupos.map(grupoDaCategoria);
  }

  private abrirFormulario(tarefa?: Tarefa): Promise<ResultadoDoFormulario | undefined> {
    const dados: DadosDoFormulario = { tarefa, categorias: this.categorias() };

    return firstValueFrom(
      this.dialogo.open(FormularioDeTarefa, { data: dados }).afterClosed(),
    );
  }

  /** Mostra a falha na tela em vez de deixá-la só no console do navegador. */
  private async comErro(acao: () => Promise<void>): Promise<void> {
    this.erro.set(null);
    try {
      await acao();
    } catch (falha) {
      this.erro.set(mensagemDoErro(falha));
    }
  }

  /**
   * O servidor devolve só os grupos que mudaram, e **inteiros, sem filtro**: as rotas do
   * arrastar não conhecem os filtros da tela. Por isso a resposta passa pela lista do que já
   * estava à vista — sem isso, as concluídas ocultas reapareceriam a cada arrastar. Os cards
   * que ficam levam as posições novas, que é o que a próxima tradução vai usar.
   */
  private substituirGrupos(afetados: GrupoNaTela[]): void {
    const aVista = new Set(this.grupos().flatMap((grupo) => grupo.tarefas.map((t) => t.id)));

    this.grupos.set(
      this.grupos().map((grupo) => {
        const novo = afetados.find((afetado) => afetado.chave === grupo.chave);
        return novo
          ? { ...novo, tarefas: novo.tarefas.filter((tarefa) => aVista.has(tarefa.id)) }
          : grupo;
      }),
    );
  }
}

/** A faixa da API como a tela a desenha. */
export function grupoDaFaixa(faixa: Faixa): GrupoNaTela {
  return {
    chave: 'prioridade:' + faixa.prioridade,
    rotulo: rotuloDaPrioridade(faixa.prioridade),
    prioridade: faixa.prioridade,
    categoriaId: null,
    tarefas: faixa.tarefas,
  };
}

/**
 * O grupo de categoria da API como a tela o desenha.
 *
 * <p>A chave do grupo das sem etiqueta não pode ser só `'categoria:null'` por acidente de
 * conversão: ela é escrita por extenso para que nenhum id possa colidir com ela.
 */
export function grupoDaCategoria(grupo: GrupoDeCategoria): GrupoNaTela {
  return {
    chave: grupo.categoria ? 'categoria:' + grupo.categoria.id : 'categoria:sem-etiqueta',
    rotulo: grupo.categoria ? grupo.categoria.nome : SEM_CATEGORIA,
    prioridade: null,
    categoriaId: grupo.categoria ? grupo.categoria.id : null,
    tarefas: grupo.tarefas,
  };
}

export function rotuloDaPrioridade(prioridade: Prioridade): string {
  switch (prioridade) {
    case 'ALTA':
      return 'Alta';
    case 'MEDIA':
      return 'Média';
    case 'BAIXA':
      return 'Baixa';
  }
}

/** O filtro gravado no navegador, ou o inicial. Valor estranho no armazenamento não vale. */
export function filtroGravado(): FiltroDeConcluidas {
  const salvo = lido(CHAVE_DO_FILTRO);
  return salvo === 'PADRAO' || salvo === 'TODAS' || salvo === 'NENHUMA' ? salvo : FILTRO_INICIAL;
}

/** O modo gravado no navegador, ou o inicial. */
export function modoGravado(): ModoDeVisualizacao {
  const salvo = lido(CHAVE_DO_MODO);
  return salvo === 'PRIORIDADE' || salvo === 'CATEGORIA' ? salvo : MODO_INICIAL;
}

/** Armazenamento indisponível — janela anônima, por exemplo — não é erro: é escolha de sessão. */
function lido(chave: string): string | null {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: string): void {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    /* a escolha vale só nesta aba */
  }
}
