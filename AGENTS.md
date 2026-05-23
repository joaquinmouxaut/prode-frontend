# Prode WC 2026 — Guía para agentes

Workspace unificado: `prode-frontend` (Angular) + `prode-backend` (NestJS). Abrir `../prode.code-workspace` en Cursor.

## Plan y memoria

- Roadmap y bitácora: `docs/PLAN.md` (§8 sesiones)
- SDD en modo **engram** (sin `openspec/` en git). Recuperar contexto: `mem_search` / `mem_context` con `project: prode-frontend`, topic `prode/session-latest`
- Artefactos SDD: `sdd/{change}/explore|proposal|spec|design|tasks`, init en `sdd-init/prode-frontend`
- Explore Fase 0 (fases/puntaje): Engram `sdd/explore/phase-scoring-world-cup-2026`
- **Estado (23-may-2026):** Fase 0 cerrada · `master` @ `84f501d` · siguiente change `phase-model-alignment`

## Stack

| Repo | Stack | Tests | Lint |
|------|-------|-------|------|
| `prode-frontend` | Angular 21 standalone, signals, Tailwind, Vitest (`ng test`) | Vitest vía `@angular/build:unit-test` | ESLint flat + Prettier |
| `prode-backend` | NestJS 11, Prisma 7, PostgreSQL | Jest | ESLint 9 flat + Prettier |

## Convenciones de código

- **TDD no estricto**: tests obligatorios solo en `PointsService`, auth y leaderboard (ver plan).
- **Auth v1**: email + password + JWT; sin reset por email en v1.0.
- **Puntaje**: fuente de verdad en backend (`PointsService`); el front no recalcula puntos (Fase 1).
- **Fases de partido**: el front usa 8 fases finas (`match-phase.ts`); Prisma hoy tiene 5 valores — alinear en Fase 1 (`phase-model-alignment`).
- **Idioma UI**: español; fechas pensadas en UTC-3 (Argentina).
- **Commits**: unidades de trabajo entregables; no commitear `.env` ni secretos.

## API local

- Backend dev: `http://localhost:3000` (ver `environment.ts` del front).
- CORS y variables en `.env` del back (no versionar).

## Skills SDD (orquestación)

Usar skills `sdd-explore`, `sdd-propose`, `sdd-spec`, `sdd-design`, `sdd-tasks`, `sdd-apply`, `sdd-verify`, `sdd-archive` según el change activo. Registro local: `.atl/skill-registry.md`.
