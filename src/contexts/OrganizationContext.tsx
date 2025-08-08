import React, { createContext, useState, useContext, ReactNode, useMemo } from 'react';
import { useUserOrganizations } from '../hooks/useUserOrganizations';

// Assuming this type definition exists somewhere like src/types.ts
export interface Organization {
  id: string;
  name: string;
}

interface OrganizationContextType {
  organizations: Organization[];
  isLoading: boolean;
  selectedOrgIds: string[];
  setSelectedOrgIds: (ids: string[]) => void;
  isAllSelected: boolean;
  // A helper to get the final list of IDs to query with
  getTargetOrgIds: () => string[];
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { organizations, isLoading } = useUserOrganizations();
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);

  const isAllSelected = useMemo(() => {
    // If nothing is selected, we treat it as "All"
    return selectedOrgIds.length === 0;
  }, [selectedOrgIds]);

  const getTargetOrgIds = () => {
    if (isAllSelected) {
      return organizations?.map(o => o.id) || [];
    }
    return selectedOrgIds;
  };

  const value = {
    organizations: organizations || [],
    isLoading,
    selectedOrgIds,
    setSelectedOrgIds,
    isAllSelected,
    getTargetOrgIds,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganizations = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganizations must be used within an OrganizationProvider');
  }
  return context;
};