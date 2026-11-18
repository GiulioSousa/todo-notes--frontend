import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ApiService } from '../../core/api.service';
import { mensagemDoErro } from '../../core/erros';
import { Faixa, Tarefa } from '../../core/modelos';
import { SessaoService } from '../../core/sessao.service';

/**
 * A lista, em três faixas.
 *
 * <p>Ainda **sem o arrastar**: a regra de como traduzir o índice na tela para a posição na
 * faixa quando há filtro está em aberto (ver "Lacunas e riscos conhecidos" do
 * `execucao.md`), e começar pelo arrastar errado é mais caro do que esperar a decisão.
 */
@Component({
  selector: 'app-tarefas',
  imports: [
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
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);

  ngOnInit(): void {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);

    try {
      const lista = await this.api.listarTarefas();
      this.faixas.set(lista.faixas);
    } catch (falha) {
      this.erro.set(mensagemDoErro(falha));
    } finally {
      this.carregando.set(false);
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
}
