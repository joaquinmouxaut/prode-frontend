# Guía de prueba local — Lógica de mata-mata (knockout)

Cómo probar el cambio `knockout-advancement` **en local, antes del deploy**.

> **Importante:** los partidos de eliminatoria todavía **no existen en la API** de football-data.org
> (aún no están definidos los cruces), así que **no se pueden importar**. Para probar, creamos
> partidos de knockout **a mano** con `POST /matches` y simulamos el kickoff con `PATCH /matches/:id`.
> Hacé todo esto contra una base **local o de desarrollo**, nunca contra producción.

---

## 0. Preparación (una sola vez)

```bash
# Backend: aplicar la migración a tu DB local + regenerar cliente
cd prode-backend
# .env debe apuntar a una DATABASE_URL LOCAL/dev (no prod)
npx prisma migrate dev        # aplica 20260619110000_knockout_advancement y regenera el client
npm run start:dev             # backend en http://localhost:3000
```

```bash
# Frontend (otra terminal)
cd prode-frontend
npm start                     # http://localhost:4200 (o el puerto que uses)
```

Registrá **2-3 usuarios** desde la UI (`/register`). Elegí uno como **admin**:

```sql
-- en tu DB local (psql / Prisma Studio)
UPDATE "User" SET role = 'ADMIN' WHERE email = 'TU_EMAIL_ADMIN';
```

Volvé a iniciar sesión con ese usuario para que el JWT traiga el rol `ADMIN` (aparece el menú **Admin**).

---

## 1. Crear un partido de knockout a mano

Como no hay fixtures de eliminatoria en la API, lo creamos directo.

> **Auth requerida:** hay un guard JWT global, así que **todas** las rutas (salvo `/auth/register`
> y `/auth/login`) necesitan un token `Bearer`. `POST /matches`, `PATCH /matches/:id` y
> `DELETE /matches/:id` solo requieren estar **logueado** (no hace falta rol ADMIN). Primero obtené
> el token; la fecha del partido debe ser **futura** para que las predicciones queden abiertas.

```powershell
# 1) Login → guardar el token (cualquier usuario registrado sirve)
$login = Invoke-RestMethod -Method Post -Uri http://localhost:3000/auth/login `
  -ContentType 'application/json' `
  -Body (@{ email = 'TU_EMAIL'; password = 'TU_PASSWORD' } | ConvertTo-Json)
$headers = @{ Authorization = "Bearer $($login.accessToken)" }

# 2) Crear el partido (usá una fecha futura)
$body = @{
  homeTeam = 'Equipo A'
  awayTeam = 'Equipo B'
  date     = '2026-06-23T22:00:00.000Z'   # futura: predicciones abiertas
  phase    = 'ROUND_OF_16'
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:3000/matches `
  -Headers $headers -ContentType 'application/json' -Body $body
```

(equivalente `curl`)

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"TU_EMAIL","password":"TU_PASSWORD"}' | jq -r .accessToken)

curl -X POST http://localhost:3000/matches \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"homeTeam":"Equipo A","awayTeam":"Equipo B","date":"2026-06-23T22:00:00.000Z","phase":"ROUND_OF_16"}'
```

Anotá el `id` que devuelve (lo llamamos `<MATCH_ID>`). El partido aparece en el **Fixture** bajo su día.
Mientras la sesión de PowerShell siga abierta, reutilizá `$headers` para los pasos siguientes.

---

## 2. Cargar predicciones (con cada usuario) y verificar la UI

Entrá al **Fixture** con cada usuario y cargá su predicción del partido "Equipo A vs Equipo B".
Aprovechá para verificar el comportamiento del selector **"¿Quién avanza?"**:

| Chequeo de UI | Esperado |
|---|---|
| Partido de **grupos** | **No** aparece el selector de avance (regresión). |
| Knockout, marcador **decisivo** (ej. 2-0) | El equipo con más goles queda **autoseleccionado y bloqueado**; no se puede cambiar. |
| Knockout, **empate** (ej. 1-1) | El selector se **habilita** y hay que elegir manualmente quién avanza. |
| Empate **sin elegir** avance → Guardar | Muestra error "Elegí qué equipo avanza a la próxima ronda" y no guarda. |

Sugerencia de predicciones (para cubrir varios escenarios con un solo resultado real):

| Usuario | Predicción | Avance elegido |
|---|---|---|
| U1 | 2 - 0 | (auto) Equipo A |
| U2 | 1 - 1 | Equipo A |
| U3 | 1 - 1 | Equipo B |
| U4 | 3 - 1 | (auto) Equipo A |

---

## 3. Simular el kickoff (para poder cargar el resultado)

El backend solo puntúa partidos ya **empezados**. Movemos la fecha al pasado:

```powershell
$body = @{ date = '2026-06-21T22:00:00.000Z' } | ConvertTo-Json   # en el pasado
Invoke-RestMethod -Method Patch -Uri http://localhost:3000/matches/<MATCH_ID> `
  -Headers $headers -ContentType 'application/json' -Body $body
```

Ahora las predicciones quedan **bloqueadas** (no editables) y el admin puede cargar el resultado.

---

## 4. Cargar el resultado como admin y verificar el puntaje

Entrá a **`/admin`** con el usuario ADMIN, buscá el partido y cargá:

- **Marcador:** 1 — 1 (90'+prórroga)
- Como es **empate** en knockout, aparece el selector **"Equipo que avanza"**: elegí **Equipo A**
  (simula que A ganó por penales).
- **Guardar.**

> Si cargás un marcador decisivo (ej. 2-0), el avance se autoselecciona/bloquea igual que en el fixture.

### Puntajes esperados (fase Octavos → multiplicador ×2)

Con resultado real **1-1, avanza Equipo A**:

| Usuario | Predicción | ¿Acierta avance? | Bonus | Puntos |
|---|---|---|---|---|
| U1 | 2-0 (av. A) | Sí | — | **8** (4×2) |
| U2 | 1-1 av. A | Sí | exacto (+4) | **16** ((4+4)×2) |
| U3 | 1-1 av. B | **No** | — | **0** |
| U4 | 3-1 (av. A) | Sí | un equipo (+1, acierta el 1 visitante) | **10** ((4+1)×2) |

Verificá los puntos en:
- **Fixture** → tarjeta del partido (`+N pts` en tu predicción y en "Predicciones del grupo").
- La tarjeta debe mostrar **"Avanza Equipo A por penales"**.
- **Leaderboard** → totales actualizados.

---

## 5. (Opcional) Caso inverso: predije empate y salió decisivo

Creá un segundo partido knockout (repetí pasos 1-3) y que un usuario prediga **1-1 con avance Equipo A**.
Cargá el resultado real **2-0 a favor de A** (decisivo, avance auto = A). Esperado: **8 puntos**
(acierta el que avanza, sin bonus). Confirma el ejemplo inverso del diseño.

---

## 6. Limpieza

Borrá los partidos de prueba (esto borra en cascada sus predicciones):

```powershell
Invoke-RestMethod -Method Delete -Uri http://localhost:3000/matches/<MATCH_ID> -Headers $headers
```

Recalculá totales si hace falta (al borrar no se recalcula automáticamente): volvé a guardar
un resultado real o reiniciá la DB de prueba.

---

## Checklist final antes del deploy

- [ ] Migración aplicada en local sin errores (`prisma migrate dev`).
- [ ] Selector de avance: oculto en grupos, bloqueado en marcador decisivo, editable en empate.
- [ ] Validación: empate sin avance no guarda (front y back).
- [ ] Puntajes coinciden con la tabla (8 / 16 / 0 / 10).
- [ ] Tarjeta muestra "Avanza X por penales/prórroga".
- [ ] `npm test` (back) y `ng test` (front) en verde.
- [ ] Recién entonces: backup de prod + `prisma migrate deploy` + redeploy (ver `prode-backend/docs/db-backup-restore.md` y `docs/PLAN.md`).
