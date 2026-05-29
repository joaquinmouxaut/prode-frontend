# Guía de pruebas — Fixture Automation (Fase 2)

Esta guía valida de punta a punta la funcionalidad `fixture-automation`:

- importación automática del fixture,
- sincronización de resultados con polling,
- recálculo de puntos (fase + total),
- precedencia del override manual del admin.

---

## 1) Objetivo y alcance

### Objetivo

Confirmar que:

1. el fixture se importa de forma idempotente,
2. el backend sincroniza resultados sin exceder presupuesto de API,
3. un cambio de marcador recalcula puntajes correctamente,
4. el override manual del admin siempre prevalece sobre la API.

### Alcance

- Backend (`prode-backend`): módulos `fixtures`, `results`, `admin`.
- Frontend (`prode-frontend`): panel `/admin` (import + sync + override).
- Integración real con API-Football.

### Fuera de alcance

- Rendimiento extremo multi-instancia en producción.
- Monitoreo externo/alerting.
- Push notifications en tiempo real.

---

## 2) Precondiciones

### Repositorios

- `prode-backend` y `prode-frontend` actualizados con los cambios de `fixture-automation`.

### Variables de entorno (backend)

Verificar al menos:

- `DATABASE_URL`
- `JWT_SECRET`
- `FOOTBALL_API_KEY`
- `FIXTURE_POLL_ENABLED=true`
- `FIXTURE_POLL_MINUTES=15`
- `FOOTBALL_API_MAX_REQUESTS_PER_DAY=80` (recomendado para dejar buffer)

Opcional:

- `FIXTURE_POLL_TICKER_SECONDS=60`
- `FOOTBALL_API_BASE_URL=https://v3.football.api-sports.io`

### DB y migraciones

- Migración aplicada con los campos nuevos en `Match`:
  - `externalId`, `externalStatus`, `resultSource`, `manualOverride`, `lastSyncedAt`.

### Usuario admin

- Existe un usuario con `role=ADMIN`.

---

## 3) Smoke técnico inicial

1. Backend levanta sin errores.
2. Frontend levanta sin errores.
3. Login con admin funciona.
4. Ruta `/admin` visible y accesible.
5. Panel `Import y sincronización` visible.

Resultado esperado:

- No errores 4xx/5xx inesperados al abrir `/admin`.

---

## 4) Casos de prueba funcionales

## Caso A — Importación inicial de fixture

1. Ir a `/admin`.
2. Click en `Importar fixture`.
3. Esperar toast de éxito.
4. Refrescar listado de partidos.

Validar:

- Se crean/actualizan partidos con `externalId`.
- Se completa metadata de sync (`externalStatus`, `resultSource`, `lastSyncedAt`).
- El contador de equipos descubiertos es coherente.

Resultado esperado:

- Import OK sin duplicar partidos existentes.

---

## Caso B — Idempotencia del import

1. Ejecutar `Importar fixture` dos veces seguidas.

Validar:

- La segunda ejecución no duplica matches.
- Solo actualiza lo necesario.

Resultado esperado:

- `createdMatches` en segunda corrida cercano a 0 (o 0), sin duplicados.

---

## Caso C — Sync manual de resultados

1. Click en `Sync ahora`.
2. Revisar resultado en toast y bloque de estado.

Validar:

- `lastPollResult` cambia.
- `requestsUsedToday` incrementa.
- Si no hay ventana activa: `no_active_match_window`.

Resultado esperado:

- Respuesta consistente con estado real de partidos.

---

## Caso D — Recalculo por cambio de marcador

1. Elegir partido con predicciones cargadas.
2. Cargar resultado manual desde `/admin`.
3. Revisar leaderboard y predicciones.

Validar:

- Se recalculan puntos solo para predicciones del partido afectado.
- Totales por usuario (`totalPoints`, grupos/knockout) quedan consistentes.

Resultado esperado:

- Puntajes correctos y sin recálculo global innecesario.

---

## Caso E — Override manual prevalece sobre API

1. Cargar resultado manual para un partido (esto activa override).
2. Ejecutar `Sync ahora`.

Validar:

- El sync no pisa el resultado manual.
- Resultado de sync reporta skip por `manual_override` para ese partido.

Resultado esperado:

- El marcador manual permanece intacto.

---

## Caso F — Reanudar sync en partido overrideado

1. En partido con override, click `Reanudar sync`.
2. Ejecutar `Sync ahora`.

Validar:

- `manualOverride` pasa a `false`.
- El partido vuelve a ser elegible para sync externo.

Resultado esperado:

- El flujo automático vuelve a aplicarse para ese match.

---

## Caso G — Presupuesto y frecuencia de requests

1. Observar estado de sync durante un período de partidos.
2. Verificar que no hay consultas fuera de ventana activa.

Validar:

- Frecuencia efectiva base: 15 min.
- En ventana inactiva: sync automático no consume cuota.
- Hard cap diario respeta `FOOTBALL_API_MAX_REQUESTS_PER_DAY`.

Resultado esperado:

- Comportamiento budget-aware estable.

---

## Caso H — Estados especiales del partido

Con partidos reales o simulación de payload:

- `1H`, `HT`, `2H`, `ET`, `P` (en juego),
- `FT`, `AET`, `PEN` (finalizado),
- `PST`, `SUSP`, `CANC` (incidencias).

Validar:

- Ventana activa y decisiones de sync alineadas al estado externo.
- No recálculo inválido cuando falta marcador final.

Resultado esperado:

- Transiciones de estado robustas sin inconsistencias.

---

## 5) Checklist de regresión rápida (viernes/sábado)

- [ ] Login admin OK.
- [ ] `/admin` carga sin errores.
- [ ] Import fixture OK (sin duplicados).
- [ ] Sync manual OK.
- [ ] Override manual preservado.
- [ ] Reanudar sync funciona.
- [ ] Leaderboard consistente tras cambios.
- [ ] Cuota de requests bajo control.

---

## 6) Validaciones de base de datos sugeridas

Consultar en `Match`:

- `externalId` no nulo en partidos importados.
- `manualOverride=true` luego de carga manual.
- `manualOverride=false` luego de `Reanudar sync`.
- `resultSource` en valores esperados (`ADMIN`, `API`, `IMPORT`).
- `lastSyncedAt` actualiza en import/sync.

Consultar en `Prediction` y `User`:

- Cambios de `points` en predicciones del partido afectado.
- Agregados de `User` coherentes tras recálculo.

---

## 7) Troubleshooting

### `missing_api_key`

- Falta `FOOTBALL_API_KEY` o está inválida.

### `daily_budget_exhausted`

- Se alcanzó el límite configurado; esperar reset diario o aumentar presupuesto.

### `no_active_match_window`

- No hay partidos dentro de ventana activa (esperado fuera de horario de juego).

### Sync no refleja cambios

- Revisar si el partido está en override manual.
- Verificar `externalId` cargado correctamente.
- Confirmar estado externo del partido en proveedor.

---

## 8) Criterio de aceptación final

Se considera aprobada la funcionalidad cuando:

1. importa fixture sin duplicados,
2. sincroniza resultados en ventana activa respetando cuota,
3. recalcula puntajes correctamente al cambiar marcador,
4. el override manual siempre tiene prioridad y puede revertirse,
5. frontend y backend pasan lint/tests/build en local.

