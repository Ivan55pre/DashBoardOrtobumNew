import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { Shield } from 'lucide-react'

const AppearanceSettingsCard: React.FC = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="card p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Shield className="w-5 h-5 text-primary-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Внешний вид</h2>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label htmlFor="dark-theme-toggle" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            Темная тема
          </label>
          <button id="dark-theme-toggle" onClick={toggleTheme} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-primary-500' : 'bg-gray-200'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default AppearanceSettingsCard