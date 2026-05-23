import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AppLucideIconsModule } from '../../shared/lucide-icons.module';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-initial-setup',
  imports: [ReactiveFormsModule, AppLucideIconsModule],
  templateUrl: './initial-setup.html',
  styleUrl: './initial-setup.scss',
})
export class InitialSetup {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    championPick: ['', [Validators.required, Validators.minLength(2)]],
    topScorerPick: ['', [Validators.required, Validators.minLength(2)]],
  });

  constructor() {
    const u = this.auth.currentUser();
    if (u) {
      this.form.patchValue({
        championPick: u.championPick ?? '',
        topScorerPick: u.topScorerPick ?? '',
      });
    }
  }

  submit(): void {
    const user = this.auth.currentUser();
    if (!user) {
      void this.router.navigateByUrl('/auth');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const { championPick, topScorerPick } = this.form.getRawValue();
    this.auth.updateProfile(user.id, { championPick, topScorerPick }).subscribe({
      next: () => void this.router.navigateByUrl('/fixtures'),
      error: () => {
        this.error.set('No pudimos guardar. Verificá la API.');
        this.busy.set(false);
      },
      complete: () => this.busy.set(false),
    });
  }
}
