import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { BRANDING } from '../../core/constants/branding';
import { AuthService } from '../../core/services/auth.service';
import { BrandMarkComponent } from '../../shared/components/brand-mark/brand-mark';
import { AppLucideIconsModule } from '../../shared/lucide-icons.module';

@Component({
  selector: 'app-auth',
  imports: [ReactiveFormsModule, AppLucideIconsModule, BrandMarkComponent],
  templateUrl: './auth.html',
  styleUrl: './auth.scss',
})
export class Auth implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly branding = BRANDING;
  protected readonly mode = signal<'login' | 'register'>('login');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected readonly registerForm = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: [passwordMatchValidator],
    },
  );

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
    const { email, password } = this.loginForm.getRawValue();
    this.auth.login({ email, password }).subscribe({
      next: (user) => this.afterAuth(user),
      error: (err: HttpErrorResponse) => {
        if (err.status === 401) {
          this.error.set('Email o contraseña incorrectos.');
        } else {
          this.error.set('No pudimos iniciar sesión. Probá de nuevo.');
        }
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
    const { name, email, password } = this.registerForm.getRawValue();
    this.auth.register({ name, email, password }).subscribe({
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

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  if (!password || !confirm) {
    return null;
  }
  return password === confirm ? null : { passwordMismatch: true };
}
