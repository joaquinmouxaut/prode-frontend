# Reglas del Prode — Mundial 2026

Documento de referencia para la lógica de puntaje y visibilidad. Fuente de verdad en backend: `PointsService`, `UserTotalsService` y `match-lifecycle`.

---

## Resumen para jugadores

1. **Prode inicial:** elegí campeón y goleador (**50 pts** cada uno si acertás). Editables hasta el primer kickoff.
2. **Por partido:** primero hay que acertar el resultado (L/E/V) → **4 pts**. Si fallás, **0**.
3. **Bonus (uno solo):** exacto +4 (total 8), diferencia +2 (total 6), un equipo +1 (total 5), o ninguno (total 4).
4. **Multiplicadores:** grupos ×1, eliminatorias ×2, final ×3.
5. **Ranking:** suma partidos + campeón + goleador. Los admin no aparecen en la tabla.

---

## Predicciones

- Cada usuario carga **un resultado por partido** (goles local y visitante).
- **Antes del kickoff:** solo ves tu propia predicción; las de los demás están ocultas.
- **Una vez iniciado el partido** (o ya disputado): todos los usuarios pueden ver las predicciones del grupo para ese partido y los partidos ya jugados.
- **No se pueden modificar predicciones** después del inicio del partido (bloqueo en frontend y backend).
- **Campeón y goleador** se pueden editar hasta el kickoff del **primer partido** del torneo; después quedan bloqueados.

---

## Resultado del partido

- **Antes del kickoff:** el marcador se muestra como `— —`, aunque la API devuelva `0-0`.
- **Después del kickoff:** se muestra el marcador real cuando hay goles confirmados.
- No se calculan puntos hasta que el partido haya comenzado y exista un resultado válido.

---

## Puntaje por partido

El cálculo tiene **dos pasos**: primero se verifica el resultado principal; solo si se cumple, se evalúa **un único bonus** (el de mayor valor que aplique).

### Paso 1 — Resultado principal (obligatorio)

Hay que acertar el **resultado del partido**:

- victoria local,
- victoria visitante, o
- empate.

Si no se acierta → **0 puntos** en ese partido (no hay bonus posible).

Si se acierta → **4 puntos** base.

### Paso 2 — Un solo bonus (opcional)

Solo se suma **uno** de los siguientes bonus, siempre que se haya cumplido el paso 1. Se elige el de **mayor valor** que corresponda:

| Prioridad | Bonus | Condición | Puntos extra |
| --------- | ----- | --------- | ------------ |
| 1 | **Resultado exacto** | Aciertas goles del local **y** del visitante | **+4** |
| 2 | **Diferencia de goles** | No es exacto, pero la diferencia es la misma | **+2** |
| 3 | **Goles de un solo equipo** | Aciertas los goles de **solo uno** de los dos equipos | **+1** |
| — | Sin bonus | Aciertas el resultado pero ningún bonus aplica | **+0** |

**Totales posibles por partido (fase de grupos, ×1):** 8, 6, 5, 4 o 0.

### Ejemplos (fase de grupos)

| Predicción | Resultado | Cálculo | Total |
| ---------- | --------- | ------- | ----- |
| 2-1 | 2-1 | Resultado ✓ (4) + exacto (+4) | **8** |
| 3-1 | 2-0 | Resultado ✓ (4) + dif. de goles (+2) | **6** |
| 2-1 | 2-0 | Resultado ✓ (4) + goles local (+1) | **5** |
| 3-0 | 2-1 | Resultado ✓ (4), sin bonus | **4** |
| 0-1 | 2-1 | Resultado ✗ | **0** |

Notas:

- Si aplican varios bonus, gana siempre el de **mayor puntaje** (exacto > diferencia > un equipo).
- Ejemplo de diferencia: predicción `3-1` y resultado `2-0` → ambos tienen diferencia +2.
- Ejemplo de un solo equipo: predicción `2-1` y resultado `2-0` → acertás goles del local, no del visitante ni la diferencia.

---

## Campeón y goleador

- Se eligen **una vez** en el Prode inicial (antes del torneo).
- Se pueden **modificar hasta el kickoff del primer partido**; después quedan bloqueados.
- Cada acierto suma **50 puntos** al total del ranking.
- La comparación ignora mayúsculas, tildes y espacios extra (`Argentina` = `argentina`).
- El **admin** carga el campeón y goleador oficial desde el panel; el backend recalcula los puntos de todos los usuarios.
- Entran al **total general** del ranking (no son categoría aparte).

Constantes en backend: `TOURNAMENT_BONUS_POINTS` (`src/tournament/tournament.constants.ts`).

---

## Multiplicadores por fase

El total del partido (resultado + bonus) se multiplica según la fase:

| Fase | Multiplicador |
| ---- | ------------- |
| Grupos 1, 2 y 3 | ×1 |
| Eliminatorias (octavos, cuartos, semifinal, tercer puesto) | ×2 |
| Final | ×3 |

### Ejemplos con multiplicador

| Fase | Predicción | Resultado | Base | × Fase | Total |
| ---- | ---------- | --------- | ---- | ------ | ----- |
| Grupos | 2-1 | 2-1 | 8 | ×1 | **8** |
| Octavos | 2-1 | 2-1 | 8 | ×2 | **16** |
| Final | 2-1 | 2-1 | 8 | ×3 | **24** |
| Octavos | 3-1 | 2-0 | 6 | ×2 | **12** |

---

## Ranking

- El ranking general suma puntos de partidos + campeón + goleador.
- Los usuarios con rol **ADMIN** no aparecen en el ranking.
- Desempates (en orden): más puntos en eliminatorias → fase 3 → fase 2 → fase 1 → nombre.

---

## Sincronización de resultados

- El backend importa el fixture y sincroniza marcadores desde **football-data.org**.
- Durante la ventana activa del partido, la sincronización automática sigue activa aunque un admin haya cargado un resultado manual.
- Prevalece la **última actualización** (last-write-wins por timestamp).
- El admin puede marcar un override manual; eso no bloquea el polling automático mientras el partido esté en curso.

---

## Pantalla de reglas (frontend)

- Ruta `/reglas`: resumen visual para jugadores (sincronizado con este documento).
