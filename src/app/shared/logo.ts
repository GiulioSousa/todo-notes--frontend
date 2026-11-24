import { booleanAttribute, Component, input } from '@angular/core';

/**
 * O símbolo, "card arrastado", escolhido em 2026-11-24: três cards numa coluna, o do meio
 * deslocado para fora da fila. É o arrastar e soltar entre faixas — o gesto que separa este
 * app de uma lista qualquer —, e são três formas simples, que seguem legíveis no favicon de
 * 16px. Os de cima e de baixo vão mais apagados para o do meio, o que está sendo movido, ler
 * primeiro.
 *
 * <p>O mesmo desenho está em `public/favicon.svg` e no `favicon.ico`; mudar aqui pede mudar lá.
 *
 * <p>Decorativo: vem sempre ao lado de um texto que o nomeia, e um `role="img"` aqui faria o
 * leitor de tela anunciar o nome duas vezes.
 */
@Component({
  selector: 'app-simbolo',
  template: `
    <svg viewBox="0 0 32 32" aria-hidden="true" [style.width]="tamanho()" [style.height]="tamanho()">
      <rect width="32" height="32" rx="8" fill="var(--cor-acento)" />
      <rect x="7" y="6.5" width="13" height="5" rx="2" fill="#fff" fill-opacity="0.6" />
      <rect x="12" y="13.5" width="13.5" height="5" rx="2" fill="#fff" />
      <rect x="7" y="20.5" width="13" height="5" rx="2" fill="#fff" fill-opacity="0.6" />
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
