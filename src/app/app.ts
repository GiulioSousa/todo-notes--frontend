import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TemaService } from './core/tema.service';

/**
 * A raiz é só o ponto onde o roteador desenha. Cabeçalho e navegação moram no `Layout`, a
 * rota-mãe das telas de dentro — o login fica fora dela, e não tem nenhum dos dois.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // Criado já na partida, e não na primeira tela que o usa: é ele quem escuta a troca de
  // tema do sistema, e isso vale também no login.
  private readonly tema = inject(TemaService);
}
