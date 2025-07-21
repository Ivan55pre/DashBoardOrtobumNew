import React from 'react'
import { Building, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const NoOrganizationState: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-dark-800 rounded-lg shadow-md h-full">
      <Building className="w-16 h-16 text-primary-500 mb-4" />
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Вы не состоите ни в одной организации
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        Чтобы начать работу, создайте новую организацию или попросите администратора существующей организации пригласить вас.
      </p>
      <button
        onClick={() => navigate('/settings')}
        className="btn-primary flex items-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Создать организацию
      </button>
    </div>
  )
}

export default NoOrganizationState