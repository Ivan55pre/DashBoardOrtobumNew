import React from 'react'
import { NavLink } from 'react-router-dom'
import { BarChart3, FileText, Settings, Home } from 'lucide-react'

const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/reports', icon: FileText, label: 'Отчеты' },
    { to: '/settings', icon: Settings, label: 'Настройки' },
  ]

  return (
    <aside className="w-64 bg-white dark:bg-dark-800 shadow-sm border-r border-gray-200 dark:border-gray-700 hidden md:block">
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-8 h-8 text-primary-500" />
          <span className="text-xl font-bold text-gray-900 dark:text-white">Analytics</span>
        </div>
      </div>
      
      <nav className="mt-8">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-6 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors ${
                isActive ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border-r-2 border-primary-500' : ''
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar