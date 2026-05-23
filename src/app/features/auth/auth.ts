import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AppLucideIconsModule } from '../../shared/lucide-icons.module';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth',
  imports: [ReactiveFormsModule, AppLucideIconsModule],
  templateUrl: './auth.html',
  styleUrl: './auth.scss',
})
export class Auth implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly mode = signal<'login' | 'register'>('login');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly registerForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
  });

  setMode(m: 'login' | 'register'): void {
    this.mode.set(m);
    this.error.set(null);
  }

  submitLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.auth.loginByEmail(this.loginForm.controls.email.value).subscribe({
      next: (user) => this.afterAuth(user),
      error: (e: Error) => {
        this.error.set(e.message);
        this.busy.set(false);
      },
      complete: () => this.busy.set(false),
    });
  }

  submitRegister(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const { name, email } = this.registerForm.getRawValue();
    this.auth.register({ name, email }).subscribe({
      next: (user) => this.afterAuth(user),
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) {
          this.error.set('Ese email ya está registrado.');
        } else {
          this.error.set('No pudimos crear la cuenta. Probá de nuevo.');
        }
        this.busy.set(false);
      },
      complete: () => this.busy.set(false),
    });
  }

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      void this.router.navigateByUrl('/fixtures');
    }
  }

  private afterAuth(user: { championPick?: string | null; topScorerPick?: string | null }): void {
    if (this.auth.needsInitialSetup(user)) {
      void this.router.navigateByUrl('/setup');
    } else {
      void this.router.navigateByUrl('/fixtures');
    }
  }
}
