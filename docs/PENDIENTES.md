# Pendientes y faltantes — Prode WC 2026

Bitácora viva para anotar huecos detectados en desarrollo, pruebas manuales u operación.

- **Plan de producto:** `docs/PLAN.md`
- **Guía de pruebas fixture-automation:** `docs/FIXTURE_AUTOMATION_TEST_GUIDE.md`
- **Reglas de puntaje y visibilidad:** `docs/REGLAS.md`
- **Tasks SDD por change:** `sdd/{change}/tasks` (cuando aplique)

---

## Cómo anotar

Por cada ítem, agregá una fila en la tabla de la sección que corresponda:


| Campo         | Qué poner                                                 |
| ------------- | --------------------------------------------------------- |
| **Fecha**     | `AAAA-MM-DD` (día en que lo notaste)                      |
| **Ítem**      | Qué falta, en una frase                                   |
| **Contexto**  | Dónde lo viste (pantalla, endpoint, caso de prueba, etc.) |
| **Prioridad** | `alta` · `media` · `baja`                                 |
| **Estado**    | `abierto` · `en curso` · `hecho` · `descartado`           |
| **Notas**     | Detalle, link, idea de solución (opcional)                |


Cuando cierres un ítem, cambiá **Estado** a `hecho` y opcionalmente mové la fila a [Cerrados](#cerrados) al final del archivo.

---

## Fixture automation (Fase 2)


| Fecha | Ítem | Contexto | Prioridad | Estado | Notas |
| ----- | ---- | -------- | --------- | ------ | ----- |
|       |      |          |           |        |       |


## Cerrados

Referencia rápida de ítems ya resueltos (copiá aquí la fila al cerrar):


| Fecha cerrado | Ítem | Cómo se resolvió |
| ------------- | ---- | ---------------- |
| 2026-06-05 | Una vez comenzado un partido, todos ven las predicciones ajenas para ese partido y los ya disputados | `PredictionsService.findVisible` + sección "Predicciones del grupo" en `/fixture` |
| 2026-06-05 | Quitar el usuario admin del ranking general | `LeaderboardService` filtra `role: USER` |
| 2026-06-05 | Documento con las reglas para luego ponerlas en el frontend | `docs/REGLAS.md` |
| 2026-06-05 | Antes del kickoff mostrar `— —` y no calcular puntajes | `match-lifecycle` en back/front; recálculo gated por `hasScoreableResult` |
| 2026-06-05 | Sync manual no impide sync automática en ventana activa | Eliminado skip por `manualOverride` en `applyExternalResult`; last-write-wins |
| 2026-06-05 | Puntaje exacto = 8 (4 resultado + 4 bonus), no 12 | `PointsService` simplificado; tests actualizados |

