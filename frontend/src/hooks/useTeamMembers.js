import { useState, useEffect, useCallback } from 'react';
import { userApi } from '../services/api';

/**
 * Registered personnel in the given SBU (excluding the signed-in user).
 *
 * The admin identity listing is ADMIN-only, so managers read their team from
 * the transfer-recipients directory (available to every signed-in role) and
 * narrow it to their own SBU here.
 */
export default function useTeamMembers(sbu) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(Boolean(sbu));
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!sbu) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await userApi.listTransferRecipients({ limit: 100 });
      setMembers((data?.users || []).filter((member) => member.sbu === sbu));
    } catch (err) {
      console.error('Failed to fetch team members', err);
      setMembers([]);
      setError(err.uiMessage || 'Team members could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [sbu]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { members, loading, error, reload };
}
