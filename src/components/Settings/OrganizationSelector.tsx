import React from 'react'
import { Building } from 'lucide-react'

interface Organization {
  id: string
  name: string
}

interface OrganizationSelectorProps {
  organizations: Organization[]
  selectedOrgId: string | null
  onSelectOrg: (id: string | null) => void
  onCreateOrg: () => void
  loading: boolean
}

const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({ organizations, selectedOrgId, onSelectOrg, onCreateOrg, loading }) => {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex-grow">
        <label htmlFor="org-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Выберите организацию
        </label>
        <select
          id="org-select"
          value={selectedOrgId || ''}
          onChange={(e) => onSelectOrg(organizations.find(o => o.id === e.target.value)?.id || null)}
          disabled={loading}
          className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-70"
        >
          {organizations.map(org => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
      </div>
      <button onClick={onCreateOrg} className="btn-secondary flex items-center gap-2">
        <Building className="w-4 h-4" />
        Создать организацию
      </button>
    </div>
  )
}

export default OrganizationSelector