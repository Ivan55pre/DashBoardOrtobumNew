import React from 'react'
import OrganizationManagement from '../components/Settings/OrganizationManagement'
import UserProfileCard from '../components/Settings/UserProfileCard'
import NotificationSettingsCard from '../components/Settings/NotificationSettingsCard'
import AppearanceSettingsCard from '../components/Settings/AppearanceSettingsCard'

const Settings: React.FC = () => {

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Настройки
      </h1>

      {/* Компонент управления организацией */}
      <OrganizationManagement />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserProfileCard />
        <NotificationSettingsCard />
        <AppearanceSettingsCard />
        {/* Можно также вынести карточку "Источники данных" в отдельный компонент */}
      </div>
    </div>
  )
}

export default Settings