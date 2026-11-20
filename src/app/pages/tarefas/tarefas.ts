import {
  CdkDrag,
  CdkDragDrop,
  CdkDragPlaceholder,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { mensagemDoErro } from '../../core/erros';
import {
  Categoria,
  Faixa,
  FiltroDeConcluidas,
  Preferencias,
  Status,
  Tarefa,
} from '../../core/modelos';
import { SessaoService } from '../../core/sessao.service';
import {
  DadosDaConfirmacao,
  DialogoDeConfirmacao,
} from '../../shared/dialogo-de-confirmacao';
import {
  DadosDoFormulario,
  FormularioDeTarefa,
  ResultadoDoFormulario,
} from './formulario-de-tarefa';

/**
 * A lista, em três faixas, com o arrastar.
 *
 * <p><b>A posição que o servidor espera é o índice na faixa inteira</b>, e o que o
 * `cdk/drag-drop` entrega é o índice na lista que está na tela. Os dois são o mesmo número
 * só enquanto nada estiver escondido — por isso {@link vendoAFaixaCompleta}.
 */
@Component({
  selector: 'app-tarefas',
  imports: [
    CdkDrag,
    CdkDragPlaceholder,
    CdkDropList,
    CdkDropListGroup,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatSelectModule,
    MatToolbarModule,
  ],
  templateUrl: './tarefas.html',
  styleUrl: './tarefas.scss',
})
export class Tarefas implements OnInit {
  private readonly api = inject(ApiService);
  private readonly sessao = inject(SessaoService);
  private readonly dialogo = inject(MatDialog);

  readonly usuario = this.sessao.usuario;
  readonly faixas = signal<Faixa[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly preferencias = signal<Preferencias | null>(null);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);

  // Ainda sem controles na tela; ficam aqui porque é deles que depende poder arrastar.
  readonly categoriaFiltrada = signal<number | null>(null);
  readonly filtroDeConcluidas = signal<FiltroDeConcluidas>('PADRAO');

  /**
   * Só dá para arrastar quando a tela mostra a faixa inteira — a decisão de 2026-11-18.
   *
   * <p>Esconder qualquer card faz o índice na tela deixar de ser a posição na faixa, e um
   * arrastar nessas condições põe o card em lugar diferente do que a pessoa soltou.
   *
   * <p>Repare que `PADRAO` depende da **preferência**, e não do filtro: ocultar concluídas
   * automaticamente esconde cards sem ninguém mexer em nada. Enquanto as preferências não
   * chegam, o valor é nulo e o arrastar fica desabilitado — o padrão seguro.
   */
  readonly vendoAFaixaCompleta = computed(() => {
    if (this.categoriaFiltrada() !== null) {
      return false;
    }

    switch (this.filtroDeConcluidas()) {
      case 'TODAS':
        return true;
      case 'NENHUMA':
        return false;
      case 'PADRAO':
        return this.preferencias()?.ocultarConcluidasAutomaticamente === false;
    }
  });

  ngOnInit(): void {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);

    try {
      // As três juntas: sem as preferências não dá para saber se a faixa está completa, e
      // sem as categorias o formulário não sabe quais nomes já existem.
      const [lista, preferencias, categorias] = await Promise.all([
        this.api.listarTarefas(this.categoriaFiltrada(), this.filtroDeConcluidas()),
        this.api.buscarPreferencias(),
        this.api.listarCategorias(),
      ]);

      this.faixas.set(lista.faixas);
      this.preferencias.set(preferencias);
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
        const destino = this.faixas().find((f) => f.prioridade === resultado.prioridade);

        await this.api.moverTarefa(tarefa.id, {
          prioridade: resultado.prioridade,
          // O tamanho da faixa antes de o card entrar nela é, por definição, o fim dela.
          posicao: destino?.tarefas.length ?? 0,
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
      const resposta = await this.api.moverTarefa(tarefa.id, {
        prioridade: prioridadeDeDestino,
        posicao: evento.currentIndex,
      });
      this.substituirFaixas(resposta.faixas);
    } catch (falha) {
      this.erro.set(mensagemDoErro(falha));
      await this.carregar();
    }
  }

  sair(): void {
    this.sessao.sair();
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

  /** O servidor devolve só as faixas que mudaram; as outras ficam como estão. */
  private substituirFaixas(afetadas: Faixa[]): void {
    this.faixas.set(
      this.faixas().map(
        (faixa) => afetadas.find((nova) => nova.prioridade === faixa.prioridade) ?? faixa,
      ),
    );
  }
}
