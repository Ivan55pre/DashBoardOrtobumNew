import React, { useState } from 'react'
import { Bell } from 'lucide-react'

const NotificationSettingsCard: React.FC = () => {
  // TODO: Загружать начальные значения из настроек пользователя и сохранять их при изменении.
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [criticalAlerts, setCriticalAlerts] = useState(true)

  return (
    <div className="card p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Bell className="w-5 h-5 text-primary-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Уведомления</h2>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label htmlFor="email-notifications" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            Email уведомления
          </label>
          <input id="email-notifications" type="checkbox" className="rounded" checked={emailNotifications} onChange={(e) => setEmailNotifications(e.target.checked)} />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="push-notifications" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            Push уведомления
          </label>
          <input id="push-notifications" type="checkbox" className="rounded" checked={pushNotifications} onChange={(e) => setPushNotifications(e.target.checked)} />
        </div>
        <div className="flex items-center justify-between">
          <label htmlFor="critical-alerts" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            Критические изменения
          </label>
          <input id="critical-alerts" type="checkbox" className="rounded" checked={criticalAlerts} onChange={(e) => setCriticalAlerts(e.target.checked)} />
        </div>
      </div>
    </div>
  )
}

export default NotificationSettingsCard