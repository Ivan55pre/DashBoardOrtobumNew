import React, { useState, useEffect, useCallback } from 'react'
import OrganizationManagement from '../components/Settings/OrganizationManagement'
import UserProfileCard from '../components/Settings/UserProfileCard'
import NotificationSettingsCard from '../components/Settings/NotificationSettingsCard'
import AppearanceSettingsCard from '../components/Settings/AppearanceSettingsCard'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../contexts/AuthContext'
import { Organization } from '../types'

const Settings: React.FC = () => {
  const { user } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [isOrgsLoading, setIsOrgsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrganizations = useCallback(async () => {
    if (!user) return
    setIsOrgsLoading(true)
    setError(null)
    try {
      const { data: orgMembers, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)

      if (memberError) throw memberError

      if (orgMembers && orgMembers.length > 0) {
        const orgIds = orgMembers.map(m => m.organization_id)
        const { data: orgsData, error: orgsError } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', orgIds)

        if (orgsError) throw orgsError

        const fetchedOrgs = orgsData || []
        setOrganizations(fetchedOrgs)
        if (fetchedOrgs.length > 0 && !selectedOrg) {
          setSelectedOrg(fetchedOrgs[0])
        }
      } else {
        setOrganizations([])
        setSelectedOrg(null)
      }
    } catch (e: any) {
      setError(`Ошибка загрузки организаций: ${e.message}`)
    } finally {
      setIsOrgsLoading(false)
    }
  }, [user, selectedOrg])

  useEffect(() => {
    fetchOrganizations()
  }, [fetchOrganizations])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Настройки
      </h1>
      {error && <div className="p-4 mb-4 bg-red-100 text-red-800 rounded-lg">{error}</div>}
      <OrganizationManagement organizations={organizations} selectedOrg={selectedOrg} onSelectOrg={(id) => setSelectedOrg(organizations.find(o => o.id === id) || null)} isOrgsLoading={isOrgsLoading} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserProfileCard selectedOrg={selectedOrg} />
        <NotificationSettingsCard />
        <AppearanceSettingsCard />
        {/* Можно также вынести карточку "Источники данных" в отдельный компонент */}
      </div>
    </div>
  )
}

export default Settings