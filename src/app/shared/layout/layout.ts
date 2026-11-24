import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatMenuModule } from '@angular/material/menu';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { SessaoService } from '../../core/sessao.service';
import { TemaService } from '../../core/tema.service';
import { Logo, Simbolo } from '../logo';

interface Rota {
  para: string;
  rotulo: string;
  /** Os traços do ícone, no mesmo desenho do resto: 24×24, contorno de 2, pontas redondas. */
  icone: string[];
}

/**
 * O esqueleto das telas de dentro, no desenho do GeFinX: cabeçalho branco com a marca à
 * esquerda, os destinos no meio e a conta num ícone só à direita; no celular, os destinos
 * descem para uma barra de abas de vidro, solta no pé da tela.
 *
 * <p>É a rota-mãe de `tarefas` e `preferencias`, e não um pedaço de cada tela: o login fica
 * de fora sem precisar esconder nada, e a troca de tela não redesenha o cabeçalho.
 */
@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatMenuModule, Logo, Simbolo],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  private readonly sessao = inject(SessaoService);
  private readonly router = inject(Router);
  readonly tema = inject(TemaService);

  readonly usuario = this.sessao.usuario;

  readonly rotas: Rota[] = [
    {
      para: '/tarefas',
      rotulo: 'Tarefas',
      icone: ['M9 6h11', 'M9 12h11', 'M9 18h11', 'M4 6l1 1 2-2', 'M4 12l1 1 2-2', 'M4 18l1 1 2-2'],
    },
    {
      para: '/preferencias',
      rotulo: 'Preferências',
      icone: ['M4 21v-7', 'M4 10V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-5', 'M20 12V3', 'M1 14h6', 'M9 8h6', 'M17 16h6'],
    },
  ];

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((evento) => evento instanceof NavigationEnd),
      map((evento) => evento.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /**
   * A bolha da aba ativa é uma peça só, que desliza entre as abas — o deslizar é o que dá
   * ao vidro a impressão de líquido. Por isso ela precisa saber a posição da rota atual.
   */
  readonly indiceAtivo = computed(() =>
    this.rotas.findIndex((rota) => this.url().startsWith(rota.para)),
  );

  readonly paraEscuro = computed(() => this.tema.tema() === 'claro');

  /** O tema não fecha o menu: quem troca vê a mudança e decide se volta. */
  alternarTema(evento: Event): void {
    evento.stopPropagation();
    this.tema.alternar();
  }

  sair(): void {
    this.sessao.sair();
  }
}
