import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './AuthContext';
import { useAuth } from './AuthContext';
import { Organization } from '../types';

interface OrganizationContextType {
  allOrganizations: Organization[];
  selectedOrganizationIds: string[];
  setSelectedOrganizationIds: (ids: string[]) => void;
  isLoading: boolean;
  error: string | null;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserOrganizations = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1. Получаем список организаций, в которых состоит пользователь
        const { data: orgMembers, error: memberError } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id);

        if (memberError) throw memberError;

        if (orgMembers && orgMembers.length > 0) {
          const orgIds = orgMembers.map(m => m.organization_id);

          // 2. Получаем детали этих организаций
          const { data: orgsData, error: orgsError } = await supabase
            .from('organizations')
            .select('id, name')
            .in('id', orgIds);

          if (orgsError) throw orgsError;

          const fetchedOrgs = orgsData || [];
          setAllOrganizations(fetchedOrgs);

          // 3. ГЛАВНОЕ ИЗМЕНЕНИЕ: Выбираем все доступные организации по умолчанию
          setSelectedOrganizationIds(fetchedOrgs.map(org => org.id));
        } else {
          setAllOrganizations([]);
          setSelectedOrganizationIds([]);
        }
      } catch (e: any) {
        console.error("Ошибка загрузки организаций в контексте:", e);
        setError(`Ошибка загрузки организаций: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserOrganizations();
  }, [user]);

  const value = { allOrganizations, selectedOrganizationIds, setSelectedOrganizationIds, isLoading, error };

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
};

export const useOrganizations = (): OrganizationContextType => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganizations must be used within an OrganizationProvider');
  }
  return context;
};