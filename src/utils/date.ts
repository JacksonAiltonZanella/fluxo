/**
 * Utilidades de data/hora, sempre no fuso America/Sao_Paulo,
 * independentemente do fuso do dispositivo do usuário.
 */

const TIME_ZONE = "America/Sao_Paulo";

/** Retorna a chave "YYYY-MM-DD" de um instante, já convertida para o fuso de São Paulo. */
export function toSaoPauloDateKey(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date); // en-CA produz YYYY-MM-DD
}

/**
 * Dias corridos completos entre duas datas, contados em dias de calendário
 * no fuso America/Sao_Paulo (não em horas/24h). No mesmo dia = 0.
 */
export function fullCalendarDaysBetween(from: Date, to: Date): number {
  const fromKey = toSaoPauloDateKey(from);
  const toKey = toSaoPauloDateKey(to);
  const fromUtcMidnight = Date.parse(`${fromKey}T00:00:00Z`);
  const toUtcMidnight = Date.parse(`${toKey}T00:00:00Z`);
  const diffMs = toUtcMidnight - fromUtcMidnight;
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

/** Formata um instante como data/hora curta em pt-BR, fuso de São Paulo. */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Formata apenas a data em pt-BR, fuso de São Paulo. */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** Converte uma string "YYYY-MM-DD" (data de previsão) para exibição pt-BR sem depender de fuso. */
export function formatDateKey(key: string | null): string {
  if (!key) return "—";
  const [y, m, d] = key.split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

/** Milissegundos até a próxima virada de dia no fuso de São Paulo. */
export function msUntilNextSaoPauloMidnight(from: Date = new Date()): number {
  const key = toSaoPauloDateKey(from);
  const [y, m, d] = key.split("-").map(Number);
  // Meia-noite de São Paulo no dia seguinte, aproximada via UTC-3 fixo (sem horário de verão desde 2019).
  const nextMidnightUtc = Date.UTC(y, m - 1, d + 1, 3, 0, 0, 0);
  return Math.max(nextMidnightUtc - from.getTime(), 1000);
}
