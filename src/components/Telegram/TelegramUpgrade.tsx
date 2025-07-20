import React from 'react'
import { ExternalLink } from 'lucide-react'

const TelegramUpgrade: React.FC = () => {
  const handleUpgrade = () => {
    window.open(window.location.href, '_blank')
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-primary-500 text-white p-4 md:hidden">
      <button
        onClick={handleUpgrade}
        className="w-full flex items-center justify-center space-x-2 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        <span>Перейти к полной версии</span>
      </button>
    </div>
  )
}

export default TelegramUpgrade