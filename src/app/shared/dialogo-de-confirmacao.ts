import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface DadosDaConfirmacao {
  titulo: string;
  mensagem: string;
  /** O rótulo do botão que confirma. "Sim" diz menos do que "Excluir". */
  confirmar: string;
  /** Pinta o botão de confirmar na cor de erro, para ações que não dão para desfazer. */
  perigo?: boolean;
}

/**
 * Pergunta antes de uma ação que não dá para desfazer.
 *
 * <p>Existe porque excluir tarefa é **definitivo**: não há lixeira (ver "Fora do MVP"), e o
 * `DELETE` da API não guarda cópia. Um `confirm()` do navegador resolveria, e foi descartado
 * por sair do tema e travar a página.
 */
@Component({
  selector: 'app-dialogo-de-confirmacao',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ dados.titulo }}</h2>
    <mat-dialog-content>
      <p>{{ dados.mensagem }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton [mat-dialog-close]="false">Cancelar</button>
      <button
        matButton="filled"
        [mat-dialog-close]="true"
        [class.perigo]="dados.perigo"
        cdkFocusInitial
      >
        {{ dados.confirmar }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .perigo {
      --mat-button-filled-container-color: var(--mat-sys-error);
      --mat-button-filled-label-text-color: var(--mat-sys-on-error);
    }
  `,
})
export class DialogoDeConfirmacao {
  readonly dados = inject<DadosDaConfirmacao>(MAT_DIALOG_DATA);
}
