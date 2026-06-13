/** Zona horaria de referencia para mostrar horarios al usuario (Argentina). */
export const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';

/**
 * Zona horaria del calendario del torneo (sedes en EEUU, costa oeste).
 * Agrupa partidos por día local del host, no por día en Argentina.
 */
export const FIXTURE_GROUP_TIME_ZONE = 'America/Los_Angeles';

/** Clave `YYYY-MM-DD` del día calendario actual en Argentina. */
export function argentinaTodayDateKey(now: Date = new Date()): string {
  return argentinaDateKey(now.toISOString());
}

/** Clave `YYYY-MM-DD` del día calendario en Argentina para un instante ISO. */
export function argentinaDateKey(iso: string): string {
  return dateKeyInTimeZone(iso, ARGENTINA_TIME_ZONE);
}

/** Clave `YYYY-MM-DD` del día calendario del torneo (hora US) para agrupar el fixture. */
export function fixtureGroupDateKey(iso: string): string {
  return dateKeyInTimeZone(iso, FIXTURE_GROUP_TIME_ZONE);
}

/** Clave `YYYY-MM-DD` del día actual en el calendario del torneo (hora US). */
export function fixtureGroupTodayDateKey(now: Date = new Date()): string {
  return fixtureGroupDateKey(now.toISOString());
}

/** Encabezado de día para agrupación del fixture (calendario US). */
export function formatFixtureGroupDayHeading(dateKey: string): string {
  return formatDayHeadingInTimeZone(dateKey, FIXTURE_GROUP_TIME_ZONE);
}

/** Encabezado de día para agrupación del fixture (ej. «viernes, 12 de junio»). */
export function formatArgentinaDayHeading(dateKey: string): string {
  return formatDayHeadingInTimeZone(dateKey, ARGENTINA_TIME_ZONE);
}

export function formatArgentinaDateTime(
  iso: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
): string {
  try {
    return new Intl.DateTimeFormat('es-AR', {
      ...options,
      timeZone: ARGENTINA_TIME_ZONE,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Hora del partido en Argentina (para la descripción bajo un encabezado de día US). */
export function formatArgentinaMatchTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-AR', {
      timeZone: ARGENTINA_TIME_ZONE,
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function dateKeyInTimeZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

function formatDayHeadingInTimeZone(dateKey: string, timeZone: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 17, 0, 0));
  return new Intl.DateTimeFormat('es-AR', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(noonUtc);
}
