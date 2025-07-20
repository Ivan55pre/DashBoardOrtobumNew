import React from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import TelegramUpgrade from '../Telegram/TelegramUpgrade'
import { useTelegram } from '../../contexts/TelegramContext'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isTelegram } = useTelegram()

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-dark-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-dark-900 p-4 md:p-6">
          {children}
        </main>
        {isTelegram && <TelegramUpgrade />}
      </div>
    </div>
  )
}

export default Layout