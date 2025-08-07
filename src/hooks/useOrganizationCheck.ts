import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../contexts/AuthContext';

/**
 * A custom hook to check if the current user is a member of any organization.
 * @returns An object containing:
 * - `isLoading`: boolean - True while the check is in progress.
 * - `hasOrganizations`: boolean - True if the user has one or more organizations, false otherwise.
 */
export const useOrganizationCheck = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasOrganizations, setHasOrganizations] = useState(false); // Default to false

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setHasOrganizations(false);
      return;
    }

    const checkOrgs = async () => {
      setIsLoading(true);
      const { count, error } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setHasOrganizations(!error && count !== null && count > 0);
      setIsLoading(false);
    };

    checkOrgs();
  }, [user]);

  return { isLoading, hasOrganizations };
};