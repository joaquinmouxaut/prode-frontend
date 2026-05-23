# Skill Registry — Prode WC 2026

**Delegator use only.** Sub-agents receive compact rules injected in prompts; they do not read this file unless asked.

## Project conventions

| File | Purpose |
|------|---------|
| `AGENTS.md` | Stack, SDD engram, convenciones, plan |
| `docs/PLAN.md` | Roadmap día a día hasta Mundial 2026 |

## SDD workflow skills (orquestador)

| Trigger | Skill | Path |
|---------|-------|------|
| sdd init / iniciar sdd | sdd-init | `~/.claude/skills/sdd-init/SKILL.md` |
| explorar idea | sdd-explore | `~/.claude/skills/sdd-explore/SKILL.md` |
| proponer change | sdd-propose | `~/.claude/skills/sdd-propose/SKILL.md` |
| escribir specs | sdd-spec | `~/.claude/skills/sdd-spec/SKILL.md` |
| diseño técnico | sdd-design | `~/.claude/skills/sdd-design/SKILL.md` |
| tareas | sdd-tasks | `~/.claude/skills/sdd-tasks/SKILL.md` |
| implementar | sdd-apply | `~/.claude/skills/sdd-apply/SKILL.md` |
| verificar | sdd-verify | `~/.claude/skills/sdd-verify/SKILL.md` |
| archivar change | sdd-archive | `~/.claude/skills/sdd-archive/SKILL.md` |

### sdd-init (compact)
- Modo **engram**: no crear `openspec/`; persistir con `mem_save` y `topic_key`
- Siempre detectar testing real; `strict_tdd: false` si el plan del proyecto dice TDD no estricto
- Escribir `.atl/skill-registry.md` siempre

### sdd-explore (compact)
- Investigar código antes de proponer; comparar opciones en tabla
- Engram: `topic_key` `sdd/{change}/explore` o `sdd/explore/{slug}` standalone
- No implementar en explore; solo análisis

## Repo / PR skills

| Trigger | Skill | Path |
|---------|-------|------|
| crear PR | branch-pr | `~/.cursor/skills/branch-pr/SKILL.md` |
| PR > 400 líneas | chained-pr | `~/.cursor/skills/chained-pr/SKILL.md` |
| commits entregables | work-unit-commits | `~/.cursor/skills/work-unit-commits/SKILL.md` |

### work-unit-commits (compact)
- Un commit = una unidad de valor verificable, no batch por tipo de archivo
- Tests/docs junto al código que cubren

## Compact rules — Prode-specific

- Puntaje y fases: backend `PointsService` es fuente de verdad; front solo muestra `points` del API
- Phase enum: 8 valores en front (`match-phase.ts`) vs 5 en Prisma — alinear en change `phase-model-alignment`
- Auth: JWT en localStorage + interceptor Bearer; sin forgot-password v1.0
- Deploy target: Vercel + Render free + Neon; cold start Render aceptado
