import { useEffect, useState } from "react";
import { subscribeComments } from "../firebase/comments";
import type { TaskComment } from "../types";

interface UseCommentsResult {
  comments: TaskComment[];
  loading: boolean;
  error: string | null;
}

export function useComments(taskId: string | null): UseCommentsResult {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) {
      setComments([]);
      return;
    }
    setLoading(true);
    const unsub = subscribeComments(
      taskId,
      (list) => {
        setComments(list);
        setLoading(false);
        setError(null);
      },
      () => {
        setError("Não foi possível carregar os comentários.");
        setLoading(false);
      },
    );
    return unsub;
  }, [taskId]);

  return { comments, loading, error };
}
