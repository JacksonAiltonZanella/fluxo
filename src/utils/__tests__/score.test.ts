import { describe, expect, it } from "vitest";
import { computeScore } from "../score";
import { PRIORITY_WEIGHT, type TaskPriority } from "../../types";
import { fullCalendarDaysBetween } from "../date";

const PRIORITIES = Object.keys(PRIORITY_WEIGHT) as TaskPriority[];

describe("computeScore", () => {
  it("no dia da criação, o acréscimo por dias é zero para todas as prioridades", () => {
    const createdAt = Date.parse("2026-09-09T15:00:00-03:00");
    const now = new Date("2026-09-09T23:00:00-03:00");
    for (const priority of PRIORITIES) {
      expect(computeScore(priority, createdAt, now)).toBe(PRIORITY_WEIGHT[priority]);
    }
  });

  it("no dia seguinte (fuso America/Sao_Paulo), o acréscimo é exatamente um", () => {
    const createdAt = Date.parse("2026-09-09T23:50:00-03:00");
    const now = new Date("2026-09-10T00:10:00-03:00");
    expect(computeScore("Alto", createdAt, now)).toBe(PRIORITY_WEIGHT.Alto + 1);
  });

  it("soma peso + dias corridos completos após vários dias", () => {
    const createdAt = Date.parse("2026-09-01T09:00:00-03:00");
    const now = new Date("2026-09-06T09:00:00-03:00");
    expect(computeScore("Para Hoje", createdAt, now)).toBe(PRIORITY_WEIGHT["Para Hoje"] + 5);
  });

  it.each(PRIORITIES)("pesos batem com a tabela de negócio para %s", (priority) => {
    const createdAt = Date.now();
    expect(computeScore(priority, createdAt, new Date(createdAt))).toBe(
      PRIORITY_WEIGHT[priority],
    );
  });

  it("Acompanhar tem o maior peso (201) e Para Hoje o segundo (200)", () => {
    expect(PRIORITY_WEIGHT.Acompanhar).toBe(201);
    expect(PRIORITY_WEIGHT["Para Hoje"]).toBe(200);
    expect(PRIORITY_WEIGHT.Acompanhar).toBeGreaterThan(PRIORITY_WEIGHT["Para Hoje"]);
  });
});

describe("fullCalendarDaysBetween", () => {
  it("mesma data no fuso de SP => 0 dias, mesmo com horas diferentes", () => {
    const from = new Date("2026-09-09T02:00:00-03:00");
    const to = new Date("2026-09-09T23:59:00-03:00");
    expect(fullCalendarDaysBetween(from, to)).toBe(0);
  });

  it("virada de meia-noite em SP conta como 1 dia mesmo com poucos minutos de diferença", () => {
    const from = new Date("2026-09-09T23:58:00-03:00");
    const to = new Date("2026-09-10T00:02:00-03:00");
    expect(fullCalendarDaysBetween(from, to)).toBe(1);
  });
});
