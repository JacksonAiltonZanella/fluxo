import { useEffect, useMemo, useState } from "react";
import { subscribeTasksForUser } from "../firebase/tasks";
import { computeScore } from "../utils/score";
import { msUntilNextSaoPauloMidnight } from "../utils/date";
import type { EffectiveRole, Task } from "../types";

export interface TaskWithScore extends Task {
  score: number;
}

interface UseTasksResult {
  tasks: TaskWithScore[];
  loading: boolean;
  error: string | null;
}

/**
 * Assina as atividades visíveis ao usuário e mantém o score recalculado.
 * Um timer reagenda o recálculo (e a nova ordenação) exatamente na virada
 * do dia no fuso America/Sao_Paulo, sem exigir recarregar a página.
 */
export function useTasks(uid: string | null, role: EffectiveRole): UseTasksResult {
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoreTick, setScoreTick] = useState(0);

  useEffect(() => {
    if (!uid) {
      setRawTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeTasksForUser(
      uid,
      role,
      (tasks) => {
        setRawTasks(tasks);
        setLoading(false);
        setError(null);
      },
      () => {
        setError("Não foi possível carregar as atividades. Verifique sua conexão ou permissões.");
        setLoading(false);
      },
    );
    return unsub;
  }, [uid, role]);

  useEffect(() => {
    const timer = setTimeout(() => setScoreTick((t) => t + 1), msUntilNextSaoPauloMidnight());
    return () => clearTimeout(timer);
  }, [scoreTick]);

  const tasks = useMemo<TaskWithScore[]>(() => {
    void scoreTick;
    const now = new Date();
    return rawTasks.map((task) => ({ ...task, score: computeScore(task.priority, task.createdAt, now) }));
  }, [rawTasks, scoreTick]);

  return { tasks, loading, error };
}
