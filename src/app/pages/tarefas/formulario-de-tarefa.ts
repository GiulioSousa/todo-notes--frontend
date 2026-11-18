import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../../core/api.service';
import { mensagemDoErro } from '../../core/erros';
import { Categoria, Prioridade, Tarefa } from '../../core/modelos';

export interface DadosDoFormulario {
  /** Ausente ao criar; presente ao editar. */
  tarefa?: Tarefa;
  categorias: Categoria[];
}

/** O que o diálogo devolve — já com a categoria resolvida a um id. */
export interface ResultadoDoFormulario {
  titulo: string;
  descricao: string | null;
  categoriaId: number | null;
  prioridade: Prioridade;
}

/**
 * O formulário de tarefa, criando e editando.
 *
 * <p><b>A categoria é um autocompletar, não um seletor fechado</b>: digitar um nome inédito
 * cria a categoria antes de salvar a tarefa, em dois chamados, como a Seção 6 define. O
 * formulário já tem a lista carregada, então sabe se o nome é novo sem perguntar ao
 * servidor — e a comparação ignora a caixa, a mesma regra do índice único.
 *
 * <p>Quem decide o que fazer com o resultado é a tela da lista: ela é que sabe o tamanho da
 * faixa de destino, e por isso é dela a chamada do `PATCH /lugar` quando a prioridade muda.
 */
@Component({
  selector: 'app-formulario-de-tarefa',
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  templateUrl: './formulario-de-tarefa.html',
  styleUrl: './formulario-de-tarefa.scss',
})
export class FormularioDeTarefa {
  private readonly api = inject(ApiService);
  private readonly construtor = inject(FormBuilder);
  private readonly dialogo = inject(MatDialogRef<FormularioDeTarefa, ResultadoDoFormulario>);
  private readonly dados = inject<DadosDoFormulario>(MAT_DIALOG_DATA);

  readonly editando = !!this.dados.tarefa;
  readonly prioridades: Prioridade[] = ['ALTA', 'MEDIA', 'BAIXA'];
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);

  readonly formulario = this.construtor.nonNullable.group({
    titulo: [this.dados.tarefa?.titulo ?? '', [Validators.required, Validators.maxLength(120)]],
    descricao: [this.dados.tarefa?.descricao ?? '', [Validators.maxLength(2000)]],
    categoria: [this.dados.tarefa?.categoria?.nome ?? '', [Validators.maxLength(40)]],
    prioridade: [this.dados.tarefa?.prioridade ?? ('MEDIA' as Prioridade), [Validators.required]],
  });

  private readonly textoDaCategoria = signal(this.dados.tarefa?.categoria?.nome ?? '');

  /** As categorias que casam com o que está digitado, para a lista do autocompletar. */
  readonly sugestoes = computed(() => {
    const procurado = this.textoDaCategoria().trim().toLowerCase();
    return this.dados.categorias.filter((categoria) =>
      categoria.nome.toLowerCase().includes(procurado),
    );
  });

  /** Verdadeiro quando o nome digitado ainda não existe — o aviso de que será criada. */
  readonly vaiCriarCategoria = computed(() => {
    const digitado = this.textoDaCategoria().trim();
    return digitado.length > 0 && !this.categoriaExistente(digitado);
  });

  aoDigitarCategoria(valor: string): void {
    this.textoDaCategoria.set(valor);
  }

  rotuloDaPrioridade(prioridade: Prioridade): string {
    switch (prioridade) {
      case 'ALTA':
        return 'Alta';
      case 'MEDIA':
        return 'Média';
      case 'BAIXA':
        return 'Baixa';
    }
  }

  async salvar(): Promise<void> {
    if (this.formulario.invalid || this.salvando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    this.erro.set(null);

    try {
      const { titulo, descricao, categoria, prioridade } = this.formulario.getRawValue();

      this.dialogo.close({
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        categoriaId: await this.resolverCategoria(categoria.trim()),
        prioridade,
      });
    } catch (falha) {
      // Falhou criando a categoria: o diálogo fica aberto, com o que foi digitado.
      this.erro.set(mensagemDoErro(falha));
    } finally {
      this.salvando.set(false);
    }
  }

  /**
   * Nome vazio é tarefa sem etiqueta. Nome que já existe vira o id dele. Nome inédito vira
   * uma categoria nova, criada agora — e é por isso que este método é assíncrono.
   */
  private async resolverCategoria(nome: string): Promise<number | null> {
    if (!nome) {
      return null;
    }

    const existente = this.categoriaExistente(nome);
    if (existente) {
      return existente.id;
    }

    const criada = await this.api.criarCategoria(nome);
    return criada.id;
  }

  /** Sem diferenciar maiúscula de minúscula, a mesma regra do índice do banco. */
  private categoriaExistente(nome: string): Categoria | undefined {
    const procurado = nome.toLowerCase();
    return this.dados.categorias.find((categoria) => categoria.nome.toLowerCase() === procurado);
  }
}
