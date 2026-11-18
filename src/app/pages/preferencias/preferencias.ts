import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { mensagemDoErro } from '../../core/erros';

/**
 * As preferências de exibição. Duas chaves, e só.
 *
 * <p>A tela não trata o caso de "ainda não existe": o `GET` nunca dá {@code 404}, porque sem
 * linha gravada o servidor devolve o padrão. O `PUT` é que cria a linha, na primeira vez.
 *
 * <p>A classe se chama `TelaDePreferencias`, e não `Preferencias`, para não colidir com o
 * modelo de mesmo nome — os dois apareceriam no mesmo arquivo.
 */
@Component({
  selector: 'app-preferencias',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    MatToolbarModule,
  ],
  templateUrl: './preferencias.html',
  styleUrl: './preferencias.scss',
})
export class TelaDePreferencias implements OnInit {
  private readonly api = inject(ApiService);
  private readonly construtor = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly carregando = signal(true);
  readonly salvando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly salvo = signal(false);

  /**
   * O intervalo de 1 a 365 é o mesmo do `ck_preferencias_dias` e do construtor de
   * `Preferencias` no domínio. Repetido aqui para o excesso virar aviso na tela em vez de
   * `400` do servidor.
   */
  readonly formulario = this.construtor.nonNullable.group({
    ocultarConcluidasAutomaticamente: [false],
    diasParaOcultar: [7, [Validators.required, Validators.min(1), Validators.max(365)]],
  });

  ngOnInit(): void {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);

    try {
      this.formulario.setValue(await this.api.buscarPreferencias());
    } catch (falha) {
      this.erro.set(mensagemDoErro(falha));
    } finally {
      this.carregando.set(false);
    }
  }

  async salvar(): Promise<void> {
    if (this.formulario.invalid || this.salvando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    this.erro.set(null);
    this.salvo.set(false);

    try {
      this.formulario.setValue(await this.api.gravarPreferencias(this.formulario.getRawValue()));
      this.salvo.set(true);
    } catch (falha) {
      this.erro.set(mensagemDoErro(falha));
    } finally {
      this.salvando.set(false);
    }
  }

  async voltar(): Promise<void> {
    await this.router.navigate(['/tarefas']);
  }
}
