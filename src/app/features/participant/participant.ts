import { Component, computed, inject, signal } from '@angular/core';
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
  protected readonly auth = inject(AuthService);

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
    return dateKey === fixtureGroupTodayDateKey();
  }

  private initDayExpansion(profile: ParticipantProfile): void {
    const today = fixtureGroupTodayDateKey();
    const groups = this.buildPredictionGroups(profile);
    const dayKeys = new Set(groups.map((group) => group.dateKey));
    this.expandedDayKeys.set(dayKeys.has(today) ? new Set([today]) : new Set(dayKeys.size ? [groups[0].dateKey] : []));
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
