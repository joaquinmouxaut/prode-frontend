/** Zona horaria de referencia para fechas del torneo (Argentina). */
export const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';

/** Clave `YYYY-MM-DD` del día calendario actual en Argentina. */
export function argentinaTodayDateKey(now: Date = new Date()): string {
  return argentinaDateKey(now.toISOString());
}

/** Clave `YYYY-MM-DD` del día calendario en Argentina para un instante ISO. */
export function argentinaDateKey(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

/** Encabezado de día para agrupación del fixture (ej. «viernes, 12 de junio»). */
export function formatArgentinaDayHeading(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const noonArgentina = new Date(Date.UTC(year, month - 1, day, 15, 0, 0));
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: ARGENTINA_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(noonArgentina);
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
