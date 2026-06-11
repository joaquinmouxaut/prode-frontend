import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { MATCH_PHASE_LABELS } from '../../core/models/match-phase';
import { AuthService } from '../../core/services/auth.service';
import {
  ParticipantsService,
  type ParticipantProfile,
} from '../../core/services/participants.service';
import {
  formatMatchScore,
  hasScoreableResult,
  isMatchInProgress,
} from '../../core/utils/match-lifecycle';
import { AppLucideIconsModule } from '../../shared/lucide-icons.module';

@Component({
  selector: 'app-participant',
  imports: [RouterLink, AppLucideIconsModule],
  templateUrl: './participant.html',
  styleUrl: './participant.scss',
})
export class Participant {
  private readonly route = inject(ActivatedRoute);
  private readonly participantsApi = inject(ParticipantsService);
  protected readonly auth = inject(AuthService);

  protected readonly MATCH_PHASE_LABELS = MATCH_PHASE_LABELS;
  protected readonly formatMatchScore = formatMatchScore;
  protected readonly hasScoreableResult = hasScoreableResult;
  protected readonly isMatchInProgress = isMatchInProgress;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly profile = signal<ParticipantProfile | null>(null);

  constructor() {
    this.route.paramMap
      .pipe(switchMap((params) => this.participantsApi.getProfile(Number(params.get('id')))))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No pudimos cargar el perfil de este participante.');
          this.loading.set(false);
        },
      });
  }

  isMe(profile: ParticipantProfile): boolean {
    return this.auth.currentUser()?.id === profile.user.id;
  }

  formatWhen(iso: string): string {
    try {
      return new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }
}
