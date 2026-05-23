# Plan de trabajo — Prode World Cup 2026

> **Hoy:** Viernes 22 de mayo de 2026
> **Deadline blando (deploy):** Viernes 5 de junio de 2026
> **Deadline duro (inicio Mundial):** Jueves 11 de junio de 2026
> **Equipo:** 1 dev (solo)
> **Usuarios objetivo:** amigos (≤ 50 personas)

---

## 1. Decisiones globales

| Tema | Decisión | Estado |
|------|----------|--------|
| Repos | Workspace de Cursor que incluye `prode-frontend` y `prode-backend` lado a lado. Sin monorepo formal. | ✅ Confirmado |
| SDD | Modo **`engram`** (memoria persistente local; sin `openspec/` en git) | ✅ Confirmado |
| TDD | **No estricto.** Tests en zonas críticas: `PointsService`, auth, endpoint de leaderboard. | ✅ Confirmado |
| Auth v1.0 | **Email + password + JWT** (real desde el inicio) | ✅ Confirmado |
| Stack front | Angular 21 standalone + signals + Tailwind | ✅ Vigente |
| Stack back | NestJS 11 + Prisma 7 + PostgreSQL | ✅ Vigente |
| Deploy front | Vercel free tier | ✅ Decidido (provisionar en Fase 3) |
| Deploy back | **Render Web Service free** (cold start ~30s tras inactividad; aceptado) | ✅ Confirmado |
| DB prod | Neon Postgres free | ✅ Decidido (provisionar en Fase 3) |
| Dominio | Subdominio de Vercel inicialmente; dominio propio post-Mundial | ⏳ Opcional |

> **Trade-off del modo engram:** sin `openspec/` versionado, los artefactos SDD (proposals, specs, designs) viven en memoria local. Es más rápido para 1 dev solo, pero si un amigo quisiera contribuir más adelante no vería el historial. Decisión consciente.

---

## 2. Hitos de alto nivel

```mermaid
gantt
    title Roadmap a producción (22 may → 11 jun 2026)
    dateFormat  YYYY-MM-DD
    axisFormat  %d %b

    section Fundación
    Fase 0 — Cimientos SDD            :f0, 2026-05-22, 2d
    section Alineamiento
    Fase 1 — Front ↔ Back + Auth JWT  :f1, after f0, 4d
    section Admin & Datos
    Fase 2 — Admin UI + datos Mundial :f2, after f1, 2d
    section Deploy
    Fase 3 — Provisionar y deploy     :f3, after f2, 3d
    section Beta
    Fase 4 — Beta interna             :f4, after f3, 3d
    section Lanzamiento
    Fase 5 — Lanzamiento              :milestone, 2026-06-05, 0d
    Buffer + invitaciones             :buffer, 2026-06-06, 5d
    Mundial 2026                      :milestone, 2026-06-11, 0d
```

---

## 3. Plan día a día

### Fase 0 — Cimientos SDD (Vie 22 + Sáb 23)

**Objetivo:** Workspace listo, SDD activo, primer change real corriendo.

- **Vie 22:**
  - [x] Análisis inicial del proyecto.
  - [x] Plan global escrito (este archivo).
  - [x] Confirmar decisiones de la sección 1 (queda solo el deploy del back).
  - [x] Crear `prode.code-workspace` que englobe front + back.
  - [x] Inicializar git en el frontend si falta (`git status` falló).
- **Sáb 23:**
  - [x] Ejecutar `sdd-init` en modo **`engram`** sobre el workspace unificado.
  - [x] Generar `.atl/skill-registry.md` y `AGENTS.md` con convenciones.
  - [x] Agregar ESLint al frontend (config alineada con el back).
  - [x] Primer `sdd-explore`: **"Modelo de fases y puntaje de cara al Mundial 2026"**.

**Salida esperada:** workspace abierto desde Cursor mostrando ambos repos, contexto SDD persistido en engram, primer explore guardado.

### Fase 1 — Alineamiento front ↔ back (Dom 24 → Mié 27, 4 días)

**Objetivo:** Que el frontend hable el mismo idioma que el backend; eliminar lógica duplicada; auth real.

- **Dom 24 — Change `phase-model-alignment`**
  - Decidir enum definitivo (sugerencia: mantener los 8 valores del front, expandir el back).
  - Migración Prisma + actualizar `PointsService` con multiplicadores por fase fina.
  - Tests unitarios del cálculo de puntos por cada fase (es código crítico).
  - Frontend deja de calcular nada; consume el campo `points`.
- **Lun 25 — Change `leaderboard-from-backend`**
  - Endpoint `GET /leaderboard` con orden + tie-breakers.
  - Frontend deja de hacer `forkJoin` y agregar; consume el endpoint.
  - Test del servicio del leaderboard (back).
- **Mar 26 + Mié 27 — Change `auth-jwt` (2 días)**
  - Modelo: agregar `passwordHash` y `role: 'USER' | 'ADMIN'` a `User`. Migración Prisma.
  - Back día 1 (Mar): hashing con argon2/bcrypt, `POST /auth/register`, `POST /auth/login` (devuelve `{ user, accessToken }`), guard JWT con `@nestjs/jwt`, decorator `@CurrentUser()`, proteger rutas mutativas, `JWT_SECRET` por env.
  - Back día 1 (Mar): tests de `AuthService` (registro, login válido/inválido, token firma OK).
  - Front día 2 (Mié): formularios con campo password + confirm password en registro, validaciones, `AuthService.login/register` reescritos contra el endpoint real, almacenar JWT en localStorage, interceptor que adjunta `Authorization: Bearer`, manejo de `401` (logout automático), tests de servicios críticos.
  - Decisión documentada: sin "olvidé mi contraseña" para v1.0 (queda en v1.1; con 50 usuarios, hacer reset manual).

**Salida esperada:** features `/fixtures` y `/leaderboard` consumen datos reales del back. Auth con JWT funcional end-to-end.

### Fase 2 — Admin + datos del Mundial (Jue 28, Vie 29 — 2 días)

**Objetivo:** Poder cargar resultados reales y tener todos los partidos del Mundial.

- **Jue 28 — Change `admin-ui`**
  - Ruta `/admin` protegida por rol (`role` ya quedó creado en Fase 1).
  - Guard de admin en el front + verificación en el back.
  - Pantalla para listar partidos pendientes y cargar `homeGoals`/`awayGoals`.
  - Recalculo automático (ya existe en back; solo conectar UI).
- **Vie 29 — Change `world-cup-fixture` + polish**
  - Seed con los **48 equipos** y **fixture oficial 2026** (104 partidos).
  - Script `prisma db seed` reproducible (con un dataset JSON commiteado).
  - Verificar fechas en zona horaria correcta (UTC-3 Argentina).
  - UX: estados de carga, error y vacío en cada pantalla.
  - E2E con Playwright **se difiere a post-Mundial** salvo que sobre tiempo en Fase 4.

**Salida esperada:** app completa funcionalmente con datos del Mundial cargados localmente.

### Fase 3 — Provisionar y deploy (Sáb 30, Dom 31, Lun 1-jun)

**Objetivo:** App accesible en internet con datos reales.

- **Sáb 30:**
  - Crear cuenta Neon, base de datos, copiar connection string.
  - Migrar schema y seed a Neon (`prisma migrate deploy` + seed).
  - Crear cuenta Render, deploy del backend, configurar env vars.
  - Healthcheck del back desde fuera (`GET /matches`).
- **Dom 31:**
  - Crear cuenta Vercel, conectar repo del frontend.
  - Configurar `environment.production.ts` con URL del back en Render.
  - Variable `apiBaseUrl` por entorno; deploy preview verde.
  - CORS abierto en el back para el dominio de Vercel.
- **Lun 1-jun:**
  - Smoke test end-to-end en producción.
  - Crear usuario admin de prod, cargar 1 resultado real ficticio y verificar recálculo.
  - Documentar URLs + credenciales en `docs/OPERATIONS.md`.
  - *(Opcional)* Configurar ping externo (UptimeRobot / cron-job.org) cada 10 min en horario de partidos para reducir cold starts — no es necesario, pero mejora la UX en días de uso intenso.

**Salida esperada:** URL pública de Vercel sirviendo el frontend conectado al backend en Render. App usable por cualquiera con el link.

### Fase 4 — Beta interna (Mar 2, Mié 3, Jue 4)

**Objetivo:** Validar con usuarios reales y corregir fricción de UX.

- **Mar 2 — Invitar 2-3 amigos beta**
  - Mensaje corto con el link.
  - Pedirles que registren, hagan el setup, dejen 5 predicciones.
- **Mié 3 — Recoger feedback + fix de showstoppers**
  - Lista de issues priorizados.
  - Solo se atacan bugs y fricciones obvias; **no features nuevas**.
- **Jue 4 — Buffer**
  - Día reservado para lo que se desbordó.
  - Verificar performance con datos reales (¿es lento el leaderboard?).

**Salida esperada:** confianza alta en la app; lista de bugs conocidos en cero o cerca.

### Fase 5 — Lanzamiento (Vie 5-jun) 🎯

- [ ] Tag `v1.0.0` en ambos repos.
- [ ] Deploy final.
- [ ] Mensaje al grupo de amigos con el link de invitación.
- [ ] Crear thread en WhatsApp/Discord para soporte.

### Buffer post-lanzamiento (Sáb 6 → Mié 10)

- Onboarding amigos rezagados.
- Fixes menores reportados.
- Preparar plan de monitoreo del día del kickoff (logs, alertas básicas).

### Mundial (Jue 11-jun) — kickoff

- [ ] Cargar resultado del primer partido apenas termine.
- [ ] Verificar recálculo de puntos y leaderboard en vivo.
- [ ] Disfrutar.

---

## 4. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Drift mayor entre Prisma schema y front | Alta | Alto | Fase 1 lo ataca explícitamente. Idealmente generar tipos compartidos desde Prisma post-Mundial. |
| Render cold start molesto en producción | Media | Medio | Aceptable para amigos. Si molesta, migrar a Railway ($5/mes). |
| Cargar 104 partidos a mano consume tiempo | Alta | Medio | Script de seed con dataset oficial (FIFA o Wikipedia) en JSON. Tarea de Vie 29. |
| Tests insuficientes y bug en cálculo de puntos | Media | Alto | Fase 1 incluye tests unitarios del `PointsService`. Es **bloqueante**, no se difiere. |
| Bug en flow de auth con JWT bloquea login en prod | Media | Crítico | Tests del `AuthService` (back) y del interceptor (front) son bloqueantes. Probar refresh de sesión y expiración en Fase 4. |
| `JWT_SECRET` filtrado / hardcoded | Baja | Crítico | Solo en env vars, nunca en código. Rotación al final de Fase 3. |
| Olvido de password sin reset automático | Media | Bajo | Reset manual (vos como admin actualizás el hash en DB). Documentar en `OPERATIONS.md`. |
| Un amigo carga un resultado equivocado como admin | Media | Alto | Solo 1 admin (vos). Endpoint protegido por rol. |
| Cuota de Neon o Render se acaba | Baja | Alto | Monitorear semanal. Plan B: migrar a Supabase / Railway. |

---

## 5. Definición de "listo" para v1.0

- [ ] Un usuario puede registrarse, hacer el setup inicial y cargar predicciones.
- [ ] El admin puede cargar resultados desde la UI.
- [ ] El leaderboard refleja los puntos en tiempo casi real (refresh manual OK).
- [ ] La app es accesible desde un link público.
- [ ] Funciona razonablemente en mobile (≥ 360px de ancho).
- [ ] No hay errores en consola al navegar las 4 pantallas principales.
- [ ] El cálculo de puntos está cubierto por tests unitarios.

---

## 6. Fuera de alcance (explícito) para v1.0

- "Olvidé mi contraseña" / reset por email (reset manual mientras tanto).
- 2FA.
- Notificaciones push o email.
- Picks de campeón/goleador con validación contra equipos del torneo.
- Múltiples torneos en paralelo.
- Histórico de leaderboards.
- App nativa.
- Internacionalización (queda en español/UTC-3).
- E2E con Playwright (solo unit/integration en zonas críticas).

Estos quedan para **v1.1+** después del 11 de junio.

---

## 7. Próximas acciones inmediatas (qué hacemos ya)

1. ~~Confirmar las decisiones de la sección 1.~~ ✅
2. ~~Crear `prode.code-workspace`~~ ✅ — abrir en Cursor: `../prode.code-workspace`
3. ~~`sdd-init` en modo `engram`~~ ✅
4. ~~Primer `sdd-explore` fases/puntaje~~ ✅ → Engram `sdd/explore/phase-scoring-world-cup-2026`

> Fase 0 cerrada. Siguiente: Fase 1 change `phase-model-alignment` (Dom 24). En modo engram, el cierre es `sdd-archive` + resumen en memoria (sin `openspec/changes/archive/`).
