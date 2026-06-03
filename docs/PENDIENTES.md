# Pendientes y faltantes — Prode WC 2026

Bitácora viva para anotar huecos detectados en desarrollo, pruebas manuales u operación.

- **Plan de producto:** `docs/PLAN.md`
- **Guía de pruebas fixture-automation:** `docs/FIXTURE_AUTOMATION_TEST_GUIDE.md`
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


| Fecha | Ítem                                                                                                                                                        | Contexto | Prioridad | Estado  | Notas |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------- | ------- | ----- |
| 3/6   | una vez comenzado un partido todos los usuarios deberán poder ver las predicciones de los demás usuarios para ese partido y los que ya se hayan disputado.  |          | alta      | abierto |       |
| 3/6   | quitar el usuario admin del ranking general                                                                                                                 |          | baja      | abierto |       |
| 3/6   | crear un documento con las reglas para luego ponerlas en el frontend                                                                                        |          | baja      | abierto |       |
| 3/6   | cuando el partido aún no haya comenzado los resultados se mostraran como - - y no 0 a 0. Evitar que se calculen puntajes antes de comenzado un partido.     |          | media     | abierto |       |
| 3/6   | sincronizar un resultado manualmente no impide que se mantenga la sincronización automatica por api mientras la ventana de partido esté activa              |          | alta      | abierto |       |
| 3/6   | el puntaje por acertar el resultado exacto debe ser 8 y no 12 (4 puntos por acertar el resultado del ganador o empate, más bonus de 4 por resultado exacto) |          | alta      | abierto |       |


## Cerrados

Referencia rápida de ítems ya resueltos (copiá aquí la fila al cerrar):


| Fecha cerrado | Ítem | Cómo se resolvió |
| ------------- | ---- | ---------------- |
|               |      |                  |


