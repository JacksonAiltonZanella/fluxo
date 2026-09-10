import { useEffect, useState } from "react";
import { subscribeAllUsers } from "../firebase/users";
import type { UserProfile } from "../types";

interface UseUsersResult {
  users: UserProfile[];
  loading: boolean;
  error: string | null;
}

/** Só resolve dados para quem tem permissão de admin — a regra do Firestore barra os demais. */
export function useAllUsers(enabled: boolean): UseUsersResult {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setUsers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeAllUsers(
      (list) => {
        setUsers(list);
        setLoading(false);
        setError(null);
      },
      () => {
        setError("Não foi possível carregar os usuários.");
        setLoading(false);
      },
    );
    return unsub;
  }, [enabled]);

  return { users, loading, error };
}
