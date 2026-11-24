import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';

export type Tema = 'claro' | 'escuro';

const CHAVE = 'todo-notes.tema';
const CONSULTA_ESCURO = '(prefers-color-scheme: dark)';

/**
 * Claro ou escuro, como no GeFinX: a preferência do sistema é o ponto de partida, e o menu
 * da conta permite discordar dela. A classe `dark` no `<html>` é o que o CSS enxerga; este
 * estado só a acompanha.
 *
 * <p>A regra é a mesma do script do `index.html`, que roda antes do Angular para a tela não
 * piscar. Ler daqui o que já está no `<html>` seria mais curto, mas amarraria este estado ao
 * acerto daquele script — e ele existe justamente para poder falhar em silêncio.
 */
@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly documento = inject(DOCUMENT);
  // Nem todo ambiente tem `matchMedia` — o jsdom dos testes não tem. Sem ele, vale o claro.
  private readonly consulta =
    typeof this.documento.defaultView?.matchMedia === 'function'
      ? this.documento.defaultView.matchMedia(CONSULTA_ESCURO)
      : undefined;

  readonly tema = signal<Tema>(this.inicial());

  constructor() {
    effect(() => {
      this.documento.documentElement.classList.toggle('dark', this.tema() === 'escuro');
    });

    // Enquanto ninguém escolheu um lado, quem manda é o sistema — inclusive quando ele muda
    // no meio da sessão, como no anoitecer automático do Windows e do macOS.
    this.consulta?.addEventListener('change', (evento) => {
      if (this.gravado() === null) {
        this.tema.set(evento.matches ? 'escuro' : 'claro');
      }
    });
  }

  alternar(): void {
    const proximo: Tema = this.tema() === 'claro' ? 'escuro' : 'claro';
    this.tema.set(proximo);

    // Só grava a partir da primeira troca: um valor salvo já no primeiro carregamento
    // congelaria o tema no que o sistema dizia naquele instante, sem ninguém ter pedido.
    try {
      localStorage.setItem(CHAVE, proximo);
    } catch {
      /* armazenamento indisponível: a escolha vale só nesta aba */
    }
  }

  private inicial(): Tema {
    return this.gravado() ?? (this.consulta?.matches ? 'escuro' : 'claro');
  }

  private gravado(): Tema | null {
    try {
      const salvo = localStorage.getItem(CHAVE);
      return salvo === 'claro' || salvo === 'escuro' ? salvo : null;
    } catch {
      return null;
    }
  }
}
