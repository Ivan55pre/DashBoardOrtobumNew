// d:\ProjectGitHub\DashBoardOrtobumNew\src\components\Layout\Layout.tsx

import React, { useState } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import TelegramUpgrade from '../Telegram/TelegramUpgrade'
import { useTelegram } from '../../contexts/TelegramContext'

interface LayoutProps {
  children: React.ReactNode // Сюда будет подставляться контент конкретной страницы (Dashboard, Settings и т.д.)
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isTelegram } = useTelegram()
  // Состояние для управления видимостью боковой панели на мобильных
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    // Основной flex-контейнер
    <div className="flex h-screen bg-gray-50 dark:bg-dark-900">
      {/* Боковая панель, которая получает состояние и функцию для его изменения */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      {/* Контейнер для основного контента */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Шапка, которая получает функцию для открытия боковой панели */}
        <Header onMenuButtonClick={() => setIsSidebarOpen(true)} />
        
        {/* Основная область, где будет рендериться дочерний компонент (страница) */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-dark-900 p-4 md:p-6">
          {children}
        </main>
        
        {/* Условный рендеринг плашки для Telegram */}
        {isTelegram && <TelegramUpgrade />}
      </div>
    </div>
  )
}

export default Layout
