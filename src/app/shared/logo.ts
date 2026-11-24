import { booleanAttribute, Component, input } from '@angular/core';

/**
 * O símbolo: um quadrado na cor do acento, com o visto. Decorativo — vem sempre ao lado de um texto que
 * o nomeia, e um `role="img"` aqui faria o leitor de tela anunciar o nome duas vezes.
 */
@Component({
  selector: 'app-simbolo',
  template: `
    <svg viewBox="0 0 32 32" aria-hidden="true" [style.width]="tamanho()" [style.height]="tamanho()">
      <rect width="32" height="32" rx="8" fill="var(--cor-acento)" />
      <path
        d="M9 16.5l4.5 4.5L23 11.5"
        fill="none"
        stroke="#fff"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
    }
  `,
})
export class Simbolo {
  readonly tamanho = input('1.75rem');
}

/**
 * O símbolo com o nome ao lado, no lugar do "todo-notes" escrito solto. Com `empilhada`,
 * o símbolo grande em cima do nome — a versão da tela de entrar, a única em que a marca
 * aparece grande: quem chega ali pode estar vindo de um link, e é ela que diz em que app a
 * senha está sendo pedida.
 */
@Component({
  selector: 'app-logo',
  imports: [Simbolo],
  template: `
    <app-simbolo [tamanho]="empilhada() ? '3.5rem' : '1.75rem'" />
    <span class="nome">todo-<span class="acento">notes</span></span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    :host(.empilhada) {
      flex-direction: column;
      gap: 0.75rem;
    }

    .nome {
      font-size: 1.125rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--cor-texto);
    }

    :host(.empilhada) .nome {
      font-size: 1.5rem;
    }

    .acento {
      color: var(--cor-acento-texto);
    }
  `,
  host: {
    '[class.empilhada]': 'empilhada()',
  },
})
export class Logo {
  readonly empilhada = input(false, { transform: booleanAttribute });
}
