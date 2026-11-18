import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * A raiz é só o ponto onde o roteador desenha. Cabeçalho e navegação moram em cada tela
 * porque o login não tem nenhum dos dois — e um layout comum obrigaria a escondê-los lá.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
