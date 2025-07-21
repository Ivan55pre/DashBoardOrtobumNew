import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../contexts/AuthContext';

export interface Organization {
  id: string;
  name: string;
}

export const useUserOrganizations = () => {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!user) {
        setIsLoading(false);
        setOrganizations([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data: orgMembers, error: memberError } = await supabase
          .from('organization_members')
          .select('organizations(id, name)')
          .eq('user_id', user.id);

        if (memberError) throw memberError;

        const userOrgs = (orgMembers || []).flatMap(m => m.organizations).filter((org): org is Organization => org !== null);
        setOrganizations(userOrgs);
      } catch (err: any) {
        console.error("Error fetching user organizations:", err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizations();
  }, [user]);

  return { organizations, isLoading, error };
};