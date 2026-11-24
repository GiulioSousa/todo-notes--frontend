import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { mensagemDoErro } from '../../core/erros';
import { SessaoService } from '../../core/sessao.service';
import { BotaoDeTema } from '../../shared/botao-de-tema';
import { Logo } from '../../shared/logo';

/**
 * A tela de entrar. Não há cadastro (Decisão 9), então não há link para lugar nenhum: a
 * conta nasce no banco, por quem o opera.
 */
@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    BotaoDeTema,
    Logo,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly sessao = inject(SessaoService);
  private readonly router = inject(Router);
  private readonly construtor = inject(FormBuilder);

  /**
   * O teto de 60 no usuário é o da coluna, repetido aqui para o excesso virar aviso na tela
   * em vez de `400` do servidor. A senha não tem teto: o limite real é do BCrypt, e dizer
   * "passou de 72 bytes" a quem tenta entrar é informação que não lhe cabe.
   */
  readonly formulario = this.construtor.nonNullable.group({
    usuario: ['', [Validators.required, Validators.maxLength(60)]],
    senha: ['', [Validators.required]],
  });

  readonly enviando = signal(false);
  readonly erro = signal<string | null>(null);

  async entrar(): Promise<void> {
    if (this.formulario.invalid || this.enviando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.erro.set(null);

    try {
      const { usuario, senha } = this.formulario.getRawValue();
      await this.sessao.entrar(usuario, senha);
      await this.router.navigate(['/tarefas']);
    } catch (falha) {
      // A mensagem vem do servidor, e é a mesma para senha errada e conta inexistente. No
      // `429` ela já traz os segundos que faltam.
      this.erro.set(mensagemDoErro(falha));
    } finally {
      this.enviando.set(false);
    }
  }
}
