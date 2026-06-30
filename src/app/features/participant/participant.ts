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
import {
  formatMatchPhaseLabel,
  type MatchPhase,
  type MatchStage,
} from '../../core/models/match-phase';
import type { Match } from '../../core/models/match.model';
import type { Prediction } from '../../core/models/prediction.model';
import { AuthService } from '../../core/services/auth.service';
import {
  ParticipantsService,
  type ParticipantProfile,
} from '../../core/services/participants.service';
import { PredictionsService } from '../../core/services/predictions.service';
import {
  fixtureGroupTodayDateKey,
  formatArgentinaMatchTime,
} from '../../core/utils/argentina-datetime';
import {
  buildFixtureTree,
  resolveActivePath,
  type FixtureJornadaNode,
  type FixtureStageNode,
} from '../../core/utils/fixture-grouping';
import {
  formatMatchScore,
  hasScoreableResult,
  isMatchApiFinished,
  isMatchInProgress,
  isMatchStarted,
} from '../../core/utils/match-lifecycle';
import { penaltyWinnerName, predictionPenaltyWinnerName } from '../../core/utils/knockout-result';
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

  protected readonly formatMatchPhaseLabel = formatMatchPhaseLabel;
  protected readonly formatMatchScore = formatMatchScore;
  protected readonly hasScoreableResult = hasScoreableResult;
  protected readonly isMatchInProgress = isMatchInProgress;
  protected readonly isMatchApiFinished = isMatchApiFinished;
  protected readonly penaltyWinnerName = penaltyWinnerName;
  protected readonly predictionPenaltyWinnerName = predictionPenaltyWinnerName;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly profile = signal<ParticipantProfile | null>(null);
  protected readonly matches = signal<Match[]>([]);
  protected readonly expandedStageKeys = signal<Set<MatchStage>>(new Set());
  protected readonly expandedJornadaKeys = signal<Set<MatchPhase>>(new Set());
  protected readonly expandedDayKeys = signal<Set<string>>(new Set());
  protected readonly stages = computed(() =>
    buildFixtureTree(this.startedMatchEntries(), (entry) => entry.match),
  );
  private readonly startedMatchEntries = computed(() =>
    this.buildStartedMatchEntries(this.profile(), this.matches()),
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
          this.initExpansion();
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

  trackStage(_: number, s: FixtureStageNode<ParticipantMatchEntry>): string {
    return s.stage;
  }

  trackJornada(_: number, j: FixtureJornadaNode<ParticipantMatchEntry>): string {
    return j.phase;
  }

  trackMatchDay(_: number, group: { dateKey: string }): string {
    return group.dateKey;
  }

  isStageExpanded(stage: MatchStage): boolean {
    return this.expandedStageKeys().has(stage);
  }

  toggleStage(stage: MatchStage): void {
    this.expandedStageKeys.update((keys) => {
      const next = new Set(keys);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });
  }

  isJornadaExpanded(phase: MatchPhase): boolean {
    return this.expandedJornadaKeys().has(phase);
  }

  toggleJornada(phase: MatchPhase): void {
    this.expandedJornadaKeys.update((keys) => {
      const next = new Set(keys);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      return next;
    });
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

  isTodayDay(dateKey: string): boolean {
    return dateKey === this.todayDateKey();
  }

  stageHasToday(stage: FixtureStageNode<ParticipantMatchEntry>): boolean {
    const today = this.todayDateKey();
    return stage.jornadas.some((j) => j.days.some((d) => d.dateKey === today));
  }

  jornadaHasToday(jornada: FixtureJornadaNode<ParticipantMatchEntry>): boolean {
    const today = this.todayDateKey();
    return jornada.days.some((d) => d.dateKey === today);
  }

  private initExpansion(): void {
    const path = resolveActivePath(this.stages(), fixtureGroupTodayDateKey());
    if (!path) {
      this.expandedStageKeys.set(new Set());
      this.expandedJornadaKeys.set(new Set());
      this.expandedDayKeys.set(new Set());
      return;
    }
    this.expandedStageKeys.set(new Set([path.stage]));
    this.expandedJornadaKeys.set(new Set([path.phase]));
    this.expandedDayKeys.set(new Set([path.dateKey]));
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
    const path = resolveActivePath(this.stages(), this.todayDateKey());
    return path?.dateKey ?? null;
  }

  private buildStartedMatchEntries(
    profile: ParticipantProfile | null,
    matches: Match[],
  ): ParticipantMatchEntry[] {
    if (!profile) return [];
    const predictionByMatchId = new Map(profile.predictions.map((p) => [p.matchId, p]));

    return matches
      .filter((match) => isMatchStarted(match))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((match) => ({
        match,
        prediction: predictionByMatchId.get(match.id) ?? null,
      }));
  }
}
