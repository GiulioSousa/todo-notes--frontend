import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ApiService } from '../../core/api.service';
import { mensagemDoErro } from '../../core/erros';
import { Categoria } from '../../core/modelos';

/** Sem categoria é criação; com ela, renomeação. */
export interface DadosDoFormularioDeCategoria {
  categoria?: Categoria;
}

/** O limite da coluna `nome`. Deixar o banco recusar daria um 500 onde cabe um aviso. */
const TAMANHO_MAXIMO = 40;

/**
 * O formulário da categoria: um campo só, o nome.
 *
 * <p><b>Ele mesmo chama a API</b>, e só fecha quando o salvamento dá certo. É diferente do
 * formulário da tarefa, que devolve dados para a tela gravar, e a razão é o `409`: nome
 * repetido é erro **daquele campo**, e mostrá-lo na tela de trás, depois de o diálogo fechar,
 * obrigaria a pessoa a reabrir o formulário para corrigir o que acabou de digitar.
 *
 * <p>A conferência de nome repetido fica no servidor, sem cópia aqui: a regra é
 * "sem diferenciar maiúscula de minúscula", a mesma do índice único, e repeti-la no cliente
 * seria mantê-la em dois lugares — com a lista em memória podendo estar velha.
 */
@Component({
  selector: 'app-formulario-de-categoria',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ dados.categoria ? 'Renomear categoria' : 'Nova categoria' }}</h2>

    <mat-dialog-content>
      <form [formGroup]="formulario" (ngSubmit)="salvar()">
        <mat-form-field appearance="outline">
          <mat-label>Nome</mat-label>
          <input matInput formControlName="nome" [maxlength]="tamanhoMaximo" cdkFocusInitial />
          @if (formulario.controls.nome.hasError('required')) {
            <mat-error>Informe o nome</mat-error>
          }
        </mat-form-field>

        @if (erro()) {
          <p class="erro" role="alert">{{ erro() }}</p>
        }
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button matButton type="button" (click)="fechar()" [disabled]="salvando()">
        Cancelar
      </button>
      <button matButton="filled" type="button" (click)="salvar()" [disabled]="salvando()">
        Salvar
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    form {
      display: flex;
      flex-direction: column;
      padding-top: 0.5rem;
    }

    mat-form-field {
      width: 100%;
      min-width: 18rem;
    }

    .erro {
      margin: 0;
      font-size: 0.875rem;
      color: var(--cor-erro);
    }
  `,
})
export class FormularioDeCategoria {
  private readonly api = inject(ApiService);
  private readonly referencia = inject<MatDialogRef<FormularioDeCategoria, Categoria>>(MatDialogRef);

  readonly dados = inject<DadosDoFormularioDeCategoria>(MAT_DIALOG_DATA);
  readonly tamanhoMaximo = TAMANHO_MAXIMO;

  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);

  readonly formulario = new FormGroup({
    nome: new FormControl(this.dados.categoria?.nome ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(TAMANHO_MAXIMO)],
    }),
  });

  async salvar(): Promise<void> {
    if (this.formulario.invalid || this.salvando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    const nome = this.formulario.controls.nome.value.trim();
    this.salvando.set(true);
    this.erro.set(null);

    try {
      const categoria = this.dados.categoria
        ? await this.api.renomearCategoria(this.dados.categoria.id, nome)
        : await this.api.criarCategoria(nome);

      this.referencia.close(categoria);
    } catch (falha) {
      this.erro.set(mensagemDoErro(falha));
    } finally {
      this.salvando.set(false);
    }
  }

  fechar(): void {
    this.referencia.close();
  }
}
