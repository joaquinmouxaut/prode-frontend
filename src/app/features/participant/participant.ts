import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  inject,
  Injector,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { formatMatchPhaseMinimal } from '../../core/models/match-phase';
import type { Prediction } from '../../core/models/prediction.model';
import { AuthService } from '../../core/services/auth.service';
import {
  ParticipantsService,
  type ParticipantProfile,
} from '../../core/services/participants.service';
import {
  fixtureGroupDateKey,
  fixtureGroupTodayDateKey,
  formatArgentinaMatchTime,
  formatFixtureGroupDayHeading,
} from '../../core/utils/argentina-datetime';
import {
  formatMatchScore,
  hasScoreableResult,
  isMatchApiFinished,
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
  private readonly injector = inject(Injector);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly auth = inject(AuthService);

  protected readonly todayDateKey = computed(() => fixtureGroupTodayDateKey());

  protected readonly formatMatchPhaseMinimal = formatMatchPhaseMinimal;
  protected readonly formatMatchScore = formatMatchScore;
  protected readonly hasScoreableResult = hasScoreableResult;
  protected readonly isMatchInProgress = isMatchInProgress;
  protected readonly isMatchApiFinished = isMatchApiFinished;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly profile = signal<ParticipantProfile | null>(null);
  protected readonly expandedDayKeys = signal<Set<string>>(new Set());
  protected readonly groupedPredictions = computed(() => this.buildPredictionGroups());

  constructor() {
    this.route.paramMap
      .pipe(switchMap((params) => this.participantsApi.getProfile(Number(params.get('id')))))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.initDayExpansion(profile);
          this.loading.set(false);
          this.scheduleScrollToToday();
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
    return formatArgentinaMatchTime(iso);
  }

  trackPredictionDay(_: number, group: { dateKey: string }): string {
    return group.dateKey;
  }

  isDayExpanded(dateKey: string): boolean {
    return this.expandedDayKeys().has(dateKey);
  }

  toggleDay(dateKey: string): void {
    this.expandedDayKeys.update((keys) => {
      const next = new Set(keys);
      if (next.has(dateKey)) next.delete(dateKey);
      else next.add(dateKey);
      return next;
    });
  }

  matchCountForDay(group: { predictions: Prediction[] }): number {
    return group.predictions.length;
  }

  isTodayDay(dateKey: string): boolean {
    return dateKey === this.todayDateKey();
  }

  private initDayExpansion(profile: ParticipantProfile): void {
    const today = fixtureGroupTodayDateKey();
    const groups = this.buildPredictionGroups(profile);
    const dayKeys = new Set(groups.map((group) => group.dateKey));
    this.expandedDayKeys.set(dayKeys.has(today) ? new Set([today]) : new Set());
  }

  private scheduleScrollToToday(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    afterNextRender(
      () => {
        const targetKey = this.resolveScrollDayKey();
        if (!targetKey) {
          return;
        }
        document.getElementById(`participant-day-${targetKey}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      },
      { injector: this.injector },
    );
  }

  /** Día de hoy si hay partidos; si no, el próximo con fixture o el último pasado. */
  private resolveScrollDayKey(): string | null {
    const groups = this.groupedPredictions();
    if (groups.length === 0) {
      return null;
    }
    const today = fixtureGroupTodayDateKey();
    if (groups.some((group) => group.dateKey === today)) {
      return today;
    }
    const upcoming = groups.find((group) => group.dateKey > today);
    return upcoming?.dateKey ?? groups[groups.length - 1]?.dateKey ?? null;
  }

  private buildPredictionGroups(source: ParticipantProfile | null = this.profile()): Array<{
    dateKey: string;
    heading: string;
    predictions: Prediction[];
  }> {
    if (!source) return [];
    const byDate = new Map<string, Prediction[]>();
    for (const prediction of source.predictions) {
      if (!prediction.match) continue;
      const dateKey = fixtureGroupDateKey(prediction.match.date);
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push(prediction);
    }
    const groups = Array.from(byDate.entries()).map(([dateKey, predictions]) => ({
      dateKey,
      heading: formatFixtureGroupDayHeading(dateKey),
      predictions: predictions.sort(
        (a, b) => new Date(a.match!.date).getTime() - new Date(b.match!.date).getTime(),
      ),
    }));
    return groups.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }
}
