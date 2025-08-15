import React from 'react'
import { ExternalLink } from 'lucide-react'

const TelegramUpgrade: React.FC = () => {
  const handleUpgrade = () => {
    window.open(window.location.href, '_blank')
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 md:hidden">
      <button
        onClick={handleUpgrade}
        className="flex items-center justify-center w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors"
        title="Перейти к полной версии в браузере"
      >
        <ExternalLink className="w-6 h-6" />
      </button>
    </div>
  )
}

export default TelegramUpgrade