import {
  CdkDrag,
  CdkDragDrop,
  CdkDragPlaceholder,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { Component, inject, OnInit, signal } from '@angular/core';
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
import { FIM_DA_FAIXA, posicaoNaFaixa } from './posicao-na-faixa';

/** Onde fica a escolha do filtro de concluídas: estado de tela, como o tema (Seção 8). */
export const CHAVE_DO_FILTRO = 'todo-notes.concluidas';

/**
 * Sem escolha gravada, as concluídas ficam ocultas: concluir uma tarefa a tira da lista na
 * hora, sem ninguém precisar apertar nada. "Mostrar todas" continua a um clique, e a escolha
 * fica gravada no navegador.
 */
export const FILTRO_INICIAL: FiltroDeConcluidas = 'NENHUMA';

/**
 * A lista, em três faixas, com o arrastar.
 *
 * <p><b>A posição que o servidor espera é o índice na faixa inteira</b>, e o que o
 * `cdk/drag-drop` entrega é o índice na lista que está na tela. Os dois divergem assim que
 * algum card fica escondido — pelo filtro de concluídas ou pelo de categoria —, e quem os
 * reconcilia é {@link posicaoNaFaixa}. Por isso o arrastar vale com qualquer filtro.
 */
@Component({
  selector: 'app-tarefas',
  imports: [
    CdkDrag,
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

  readonly faixas = signal<Faixa[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);

  readonly categoriaFiltrada = signal<number | null>(null);
  readonly filtroDeConcluidas = signal<FiltroDeConcluidas>(filtroGravado());

  ngOnInit(): void {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);

    try {
      // As duas juntas: sem as categorias o formulário não sabe quais nomes já existem. As
      // preferências deixaram de vir aqui em 2026-11-24 — só serviam para decidir se dava
      // para arrastar, e o arrastar passou a valer com qualquer filtro.
      const [lista, categorias] = await Promise.all([
        this.api.listarTarefas(this.categoriaFiltrada(), this.filtroDeConcluidas()),
        this.api.listarCategorias(),
      ]);

      this.faixas.set(lista.faixas);
      this.categorias.set(categorias);
    } catch (falha) {
      this.erro.set(mensagemDoErro(falha));
    } finally {
      this.carregando.set(false);
    }
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
          posicao: FIM_DA_FAIXA,
        });
      }

      await this.carregar();
    });
  }

  /**
   * Move na tela primeiro e manda depois: a resposta do servidor substitui as faixas
   * afetadas, já renumeradas. Se a chamada falhar, recarrega — o servidor é quem sabe onde
   * o card está.
   */
  async soltar(evento: CdkDragDrop<Faixa>): Promise<void> {
    const mesmaFaixa = evento.previousContainer === evento.container;
    if (mesmaFaixa && evento.previousIndex === evento.currentIndex) {
      return;
    }

    const tarefa = evento.item.data as Tarefa;
    const prioridadeDeDestino = evento.container.data.prioridade;

    // A tradução usa a tela de ANTES do movimento: são as posições que o servidor conhece.
    const visiveisNoDestino = (
      this.faixas().find((f) => f.prioridade === prioridadeDeDestino)?.tarefas ?? []
    ).filter((visivel) => visivel.id !== tarefa.id);
    const posicao = posicaoNaFaixa(
      visiveisNoDestino,
      evento.currentIndex,
      mesmaFaixa ? tarefa.posicao : null,
    );

    const copia = this.faixas().map((faixa) => ({ ...faixa, tarefas: [...faixa.tarefas] }));
    const origem = copia.find((f) => f.prioridade === evento.previousContainer.data.prioridade);
    const destino = copia.find((f) => f.prioridade === prioridadeDeDestino);
    if (!origem || !destino) {
      return;
    }

    if (mesmaFaixa) {
      moveItemInArray(destino.tarefas, evento.previousIndex, evento.currentIndex);
    } else {
      transferArrayItem(origem.tarefas, destino.tarefas, evento.previousIndex, evento.currentIndex);
    }
    this.faixas.set(copia);

    try {
      const resposta = await this.api.moverTarefa(tarefa.id, { prioridade: prioridadeDeDestino, posicao });
      this.substituirFaixas(resposta.faixas);
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

  rotuloDaFaixa(faixa: Faixa): string {
    switch (faixa.prioridade) {
      case 'ALTA':
        return 'Alta';
      case 'MEDIA':
        return 'Média';
      case 'BAIXA':
        return 'Baixa';
    }
  }

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
    try {
      localStorage.setItem(CHAVE_DO_FILTRO, filtro);
    } catch {
      /* armazenamento indisponível: a escolha vale só nesta aba */
    }
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
   * guarda cópia. O servidor renumera a faixa no mesmo movimento.
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
   * O servidor devolve só as faixas que mudaram, e **inteiras, sem filtro**: o `PATCH /lugar`
   * não conhece os filtros da tela. Por isso a resposta passa pela lista do que já estava à
   * vista — sem isso, as concluídas ocultas reapareceriam a cada arrastar. Os cards que ficam
   * levam a posição nova, que é o que a próxima tradução vai usar.
   */
  private substituirFaixas(afetadas: Faixa[]): void {
    const aVista = new Set(this.faixas().flatMap((faixa) => faixa.tarefas.map((t) => t.id)));

    this.faixas.set(
      this.faixas().map((faixa) => {
        const nova = afetadas.find((afetada) => afetada.prioridade === faixa.prioridade);
        return nova
          ? { ...nova, tarefas: nova.tarefas.filter((tarefa) => aVista.has(tarefa.id)) }
          : faixa;
      }),
    );
  }
}

/** O filtro gravado no navegador, ou o inicial. Valor estranho no armazenamento não vale. */
export function filtroGravado(): FiltroDeConcluidas {
  try {
    const salvo = localStorage.getItem(CHAVE_DO_FILTRO);
    return salvo === 'PADRAO' || salvo === 'TODAS' || salvo === 'NENHUMA' ? salvo : FILTRO_INICIAL;
  } catch {
    return FILTRO_INICIAL;
  }
}
