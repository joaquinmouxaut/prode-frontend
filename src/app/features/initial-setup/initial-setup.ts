import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AppLucideIconsModule } from '../../shared/lucide-icons.module';
import { AuthService } from '../../core/services/auth.service';
import { TournamentService } from '../../core/services/tournament.service';

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
  private readonly tournamentApi = inject(TournamentService);

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly loadingStatus = signal(true);
  protected readonly picksLocked = signal(false);
  protected readonly firstMatchDate = signal<string | null>(null);

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

    this.tournamentApi.getStatus().subscribe({
      next: (status) => {
        this.picksLocked.set(status.picksLocked);
        this.firstMatchDate.set(status.firstMatchDate);
        this.loadingStatus.set(false);
        if (status.picksLocked) {
          this.form.disable();
        }
      },
      error: () => {
        this.loadingStatus.set(false);
        this.error.set('No pudimos verificar si el torneo ya comenzó.');
      },
    });
  }

  formatFirstMatchDate(iso: string | null): string {
    if (!iso) return '';
    try {
      return new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  submit(): void {
    if (this.picksLocked()) {
      this.error.set('Campeón y goleador ya no se pueden modificar.');
      return;
    }
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
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) {
          this.error.set('Campeón y goleador ya no se pueden modificar: el torneo comenzó.');
          this.picksLocked.set(true);
          this.form.disable();
        } else {
          this.error.set('No pudimos guardar. Verificá la API.');
        }
        this.busy.set(false);
      },
      complete: () => this.busy.set(false),
    });
  }
}
