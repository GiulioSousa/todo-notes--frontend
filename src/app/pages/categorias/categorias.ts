import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { mensagemDoErro } from '../../core/erros';
import { Categoria } from '../../core/modelos';
import {
  DadosDaConfirmacao,
  DialogoDeConfirmacao,
} from '../../shared/dialogo-de-confirmacao';
import {
  DadosDoFormularioDeCategoria,
  FormularioDeCategoria,
} from './formulario-de-categoria';

/** Uma categoria na tela, com quantas tarefas usam a etiqueta dela. */
export interface CategoriaNaTela {
  categoria: Categoria;
  tarefas: number;
}

/**
 * A aba das categorias: listar, criar, renomear e excluir.
 *
 * <p>Tem aba própria desde 2026-11-25, com a chegada do modo de visualização por categoria —
 * a etiqueta deixou de ser só um enfeite do card e passou a ser a chave de um agrupamento, e
 * criar uma de dentro do formulário da tarefa virou pouco.
 *
 * <p><b>A contagem de tarefas vem da listagem agrupada por categoria</b>, e não de uma rota
 * de contagem que não existe: aquela resposta já traz um grupo por categoria cadastrada, com
 * as tarefas dentro, e é de onde sai o nome e o tamanho de cada uma. Pede `TODAS` de
 * propósito — a contagem é o total, e não o que algum filtro deixaria à vista. O preço é
 * trazer as tarefas para contá-las, aceitável numa lista pessoal e explícito aqui para que
 * ninguém o descubra por acidente.
 */
@Component({
  selector: 'app-categorias',
  imports: [MatButtonModule, MatMenuModule, MatProgressBarModule],
  templateUrl: './categorias.html',
  styleUrl: './categorias.scss',
})
export class Categorias implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialogo = inject(MatDialog);

  readonly categorias = signal<CategoriaNaTela[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal<string | null>(null);

  ngOnInit(): void {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);

    try {
      const lista = await this.api.listarTarefasPorCategoria('TODAS');

      this.categorias.set(
        lista.grupos
          .filter((grupo) => grupo.categoria !== null)
          .map((grupo) => ({ categoria: grupo.categoria!, tarefas: grupo.tarefas.length })),
      );
    } catch (falha) {
      this.erro.set(mensagemDoErro(falha));
    } finally {
      this.carregando.set(false);
    }
  }

  async criar(): Promise<void> {
    await this.abrirFormulario({});
  }

  async renomear(categoria: Categoria): Promise<void> {
    await this.abrirFormulario({ categoria });
  }

  /**
   * Exclui, depois de dizer <b>quantas tarefas perdem a etiqueta</b>.
   *
   * <p>Excluir não bloqueia, nem com a categoria em uso: categoria é etiqueta, não dado de
   * que outro dado depende. É o oposto do que o GeFinX faz com conta em uso, e de propósito.
   * O que resta é avisar — e o aviso traz o número, porque "as tarefas perdem a etiqueta" não
   * diz se são duas ou vinte.
   *
   * <p>As tarefas <b>não</b> são apagadas: vão para o grupo "Sem categoria", no fim dele.
   */
  async excluir(linha: CategoriaNaTela): Promise<void> {
    const dados: DadosDaConfirmacao = {
      titulo: 'Excluir a categoria?',
      mensagem:
        `"${linha.categoria.nome}" será apagada definitivamente. ` +
        oQueAcontece(linha.tarefas),
      confirmar: 'Excluir',
      perigo: true,
    };

    const confirmado = await firstValueFrom(
      this.dialogo.open(DialogoDeConfirmacao, { data: dados }).afterClosed(),
    );
    if (!confirmado) {
      return;
    }

    this.erro.set(null);
    try {
      await this.api.excluirCategoria(linha.categoria.id);
      await this.carregar();
    } catch (falha) {
      this.erro.set(mensagemDoErro(falha));
    }
  }

  /** Recarrega só quando o diálogo fecha salvando: ele próprio chama a API. */
  private async abrirFormulario(dados: DadosDoFormularioDeCategoria): Promise<void> {
    const salva = await firstValueFrom(
      this.dialogo.open(FormularioDeCategoria, { data: dados }).afterClosed(),
    );

    if (salva) {
      await this.carregar();
    }
  }
}

/**
 * O que a exclusão faz com as tarefas que usam a etiqueta, dito com o número delas.
 *
 * <p>A frase inteira muda com o número, e não só o substantivo: "1 tarefa perdem a etiqueta e
 * vão" erra duas vezes, e a categoria com uma tarefa só é o caso mais comum — é a que se
 * desiste de usar. Por isso a função devolve a frase, e não um pedaço dela.
 *
 * <p>"Nenhuma tarefa é apagada" está ali de propósito: o diálogo diz "apagada
 * definitivamente" na frase anterior, falando da categoria, e sem esta a pessoa pode entender
 * que as tarefas vão com ela.
 */
export function oQueAcontece(tarefas: number): string {
  if (tarefas === 0) {
    return 'Nenhuma tarefa usa esta etiqueta.';
  }

  return tarefas === 1
    ? '1 tarefa perde a etiqueta e passa para "Sem categoria". Nenhuma tarefa é apagada.'
    : `${tarefas} tarefas perdem a etiqueta e passam para "Sem categoria". ` +
      'Nenhuma tarefa é apagada.';
}
