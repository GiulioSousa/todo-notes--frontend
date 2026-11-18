import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  CdkDropListGroup,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ApiService } from '../../core/api.service';
import { mensagemDoErro } from '../../core/erros';
import { Faixa, FiltroDeConcluidas, Preferencias, Tarefa } from '../../core/modelos';
import { SessaoService } from '../../core/sessao.service';

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
    CdkDropList,
    CdkDropListGroup,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatProgressBarModule,
    MatToolbarModule,
  ],
  templateUrl: './tarefas.html',
  styleUrl: './tarefas.scss',
})
export class Tarefas implements OnInit {
  private readonly api = inject(ApiService);
  private readonly sessao = inject(SessaoService);

  readonly usuario = this.sessao.usuario;
  readonly faixas = signal<Faixa[]>([]);
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
      // As duas juntas: sem as preferências não dá para saber se a faixa está completa.
      const [lista, preferencias] = await Promise.all([
        this.api.listarTarefas(this.categoriaFiltrada(), this.filtroDeConcluidas()),
        this.api.buscarPreferencias(),
      ]);

      this.faixas.set(lista.faixas);
      this.preferencias.set(preferencias);
    } catch (falha) {
      this.erro.set(mensagemDoErro(falha));
    } finally {
      this.carregando.set(false);
    }
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
  rotuloDoStatus(tarefa: Tarefa): string {
    switch (tarefa.status) {
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

  /** O servidor devolve só as faixas que mudaram; as outras ficam como estão. */
  private substituirFaixas(afetadas: Faixa[]): void {
    this.faixas.set(
      this.faixas().map(
        (faixa) => afetadas.find((nova) => nova.prioridade === faixa.prioridade) ?? faixa,
      ),
    );
  }
}
