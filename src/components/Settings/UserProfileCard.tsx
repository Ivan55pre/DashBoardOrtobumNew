import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../contexts/AuthContext'
import { User } from 'lucide-react'
import { Organization } from '../../types'

interface UserProfileCardProps {
  selectedOrg: Organization | null
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({ selectedOrg }) => {
  const { user } = useAuth()
  const [organizationRole, setOrganizationRole] = useState<string>('Загрузка...')

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user || !selectedOrg) {
        setOrganizationRole(selectedOrg ? 'Загрузка...' : 'Не выбрана')
        return
      }

      setOrganizationRole('Загрузка...')

      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', selectedOrg.id)
        .single()

      if (memberError || !memberData) {
        setOrganizationRole('Не определена')
        if (memberError && memberError.code !== 'PGRST116') { // PGRST116: "The result contains 0 rows"
          console.error('Error fetching organization role:', memberError)
        }
        return
      }

      setOrganizationRole(memberData.role === 'admin' ? 'Администратор' : 'Участник')
    }

    fetchUserRole()
  }, [user, selectedOrg])

  return (
    <div className="card p-6">
      <div className="flex items-center space-x-3 mb-4">
        <User className="w-5 h-5 text-primary-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Профиль пользователя</h2>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <input type="email" value={user?.email || ''} disabled className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Роль в организации</label>
          <input type="text" value={organizationRole} disabled className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white" />
        </div>
      </div>
    </div>
  )
}

export default UserProfileCard