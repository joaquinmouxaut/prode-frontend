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
import { forkJoin, switchMap } from 'rxjs';
import { formatMatchPhaseMinimal } from '../../core/models/match-phase';
import type { Match } from '../../core/models/match.model';
import type { Prediction } from '../../core/models/prediction.model';
import { AuthService } from '../../core/services/auth.service';
import {
  ParticipantsService,
  type ParticipantProfile,
} from '../../core/services/participants.service';
import { PredictionsService } from '../../core/services/predictions.service';
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
  isMatchStarted,
} from '../../core/utils/match-lifecycle';
import { AppLucideIconsModule } from '../../shared/lucide-icons.module';

interface ParticipantMatchEntry {
  match: Match;
  prediction: Prediction | null;
}

@Component({
  selector: 'app-participant',
  imports: [RouterLink, AppLucideIconsModule],
  templateUrl: './participant.html',
  styleUrl: './participant.scss',
})
export class Participant {
  private readonly route = inject(ActivatedRoute);
  private readonly participantsApi = inject(ParticipantsService);
  private readonly predictionsApi = inject(PredictionsService);
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
  protected readonly matches = signal<Match[]>([]);
  protected readonly expandedDayKeys = signal<Set<string>>(new Set());
  protected readonly groupedMatchEntries = computed(() =>
    this.buildMatchEntryGroups(this.profile(), this.matches()),
  );

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) =>
          forkJoin({
            profile: this.participantsApi.getProfile(Number(params.get('id'))),
            matches: this.predictionsApi.getMatches(),
          }),
        ),
      )
      .subscribe({
        next: ({ profile, matches }) => {
          this.profile.set(profile);
          this.matches.set(matches);
          this.initDayExpansion(profile, matches);
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

  trackMatchDay(_: number, group: { dateKey: string }): string {
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

  matchCountForDay(group: { entries: ParticipantMatchEntry[] }): number {
    return group.entries.length;
  }

  isTodayDay(dateKey: string): boolean {
    return dateKey === this.todayDateKey();
  }

  private initDayExpansion(profile: ParticipantProfile, matches: Match[]): void {
    const today = fixtureGroupTodayDateKey();
    const groups = this.buildMatchEntryGroups(profile, matches);
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
    const groups = this.groupedMatchEntries();
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

  private buildStartedMatchEntries(
    profile: ParticipantProfile,
    matches: Match[],
  ): ParticipantMatchEntry[] {
    const predictionByMatchId = new Map(profile.predictions.map((p) => [p.matchId, p]));

    return matches
      .filter((match) => isMatchStarted(match))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((match) => ({
        match,
        prediction: predictionByMatchId.get(match.id) ?? null,
      }));
  }

  private buildMatchEntryGroups(
    source: ParticipantProfile | null = this.profile(),
    matches: Match[] = [],
  ): Array<{
    dateKey: string;
    heading: string;
    entries: ParticipantMatchEntry[];
  }> {
    if (!source) return [];

    const byDate = new Map<string, ParticipantMatchEntry[]>();
    for (const entry of this.buildStartedMatchEntries(source, matches)) {
      const dateKey = fixtureGroupDateKey(entry.match.date);
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push(entry);
    }

    const groups = Array.from(byDate.entries()).map(([dateKey, entries]) => ({
      dateKey,
      heading: formatFixtureGroupDayHeading(dateKey),
      entries,
    }));
    return groups.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }
}
