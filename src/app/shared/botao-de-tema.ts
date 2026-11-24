import { Component, computed, inject } from '@angular/core';
import { TemaService } from '../core/tema.service';

/**
 * Alterna entre claro e escuro. O ícone mostra o tema para onde o clique leva, e não o
 * atual: sozinho na tela, um sol num fundo já claro não diria se é estado ou destino.
 *
 * <p>Usado na tela de entrar, onde não há cabeçalho: trocar o tema só depois de entrar
 * deixaria a primeira tela do app fora do controle de quem usa. Dentro do app, a mesma
 * troca mora no menu da conta.
 */
@Component({
  selector: 'app-botao-de-tema',
  template: `
    <button type="button" class="botao-icone" (click)="tema.alternar()" [title]="rotulo()" [attr.aria-label]="rotulo()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        @if (paraEscuro()) {
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        } @else {
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        }
      </svg>
    </button>
  `,
})
export class BotaoDeTema {
  readonly tema = inject(TemaService);
  readonly paraEscuro = computed(() => this.tema.tema() === 'claro');
  readonly rotulo = computed(() => (this.paraEscuro() ? 'Ativar tema escuro' : 'Ativar tema claro'));
}
