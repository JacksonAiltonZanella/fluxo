import { PRIORITY_WEIGHT, type TaskPriority } from "../types";
import { fullCalendarDaysBetween } from "./date";

/**
 * score = peso da prioridade + dias corridos completos desde a criação,
 * contados em dias de calendário no fuso America/Sao_Paulo.
 * No dia da criação o acréscimo é zero; no dia seguinte, um; e assim por diante.
 * A data de previsão não entra nesta fórmula (por definição do produto).
 *
 * O score nunca é lido de um campo do banco: é sempre derivado no cliente a
 * partir de priority + createdAt, para que não possa ser manipulado por
 * escrita direta no Firestore.
 */
export function computeScore(
  priority: TaskPriority,
  createdAt: number,
  now: Date = new Date(),
): number {
  const weight = PRIORITY_WEIGHT[priority];
  const daysSinceCreation = fullCalendarDaysBetween(new Date(createdAt), now);
  return weight + Math.max(daysSinceCreation, 0);
}
