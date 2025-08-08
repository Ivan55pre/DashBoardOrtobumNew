import React from 'react';
import { useOrganizations } from '../../contexts/OrganizationContext';

const OrganizationFilter: React.FC = () => {
  const { organizations, isLoading, selectedOrgIds, setSelectedOrgIds } = useOrganizations();

  const handleSelectionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(event.target.selectedOptions, option => option.value);
    // If the user deselects everything, it will result in an empty array, which our context interprets as "All".
    setSelectedOrgIds(selectedOptions);
  };

  if (isLoading) {
    return <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-64 animate-pulse"></div>;
  }

  return (
    <div className="min-w-[250px]">
      <label htmlFor="org-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Организации
      </label>
      <select
        id="org-select"
        multiple
        value={selectedOrgIds}
        onChange={handleSelectionChange}
        className="form-multiselect block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-dark-800 dark:border-gray-600 dark:text-white"
        style={{ minHeight: '42px', maxHeight: '150px' }}
      >
        {organizations.map(org => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {selectedOrgIds.length === 0 ? 'Показаны все организации.' : `Выбрано: ${selectedOrgIds.length}`}
      </p>
    </div>
  );
};

export default OrganizationFilter;