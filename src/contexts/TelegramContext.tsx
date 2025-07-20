import React, { createContext, useContext, useEffect, useState } from 'react'

interface TelegramWebApp {
  initData: string
  initDataUnsafe: any
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: any
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  headerColor: string
  backgroundColor: string
  isClosingConfirmationEnabled: boolean
  BackButton: any
  MainButton: any
  HapticFeedback: any
  ready: () => void
  expand: () => void
  close: () => void
}

interface TelegramContextType {
  webApp: TelegramWebApp | null
  isTelegram: boolean
  user: any
}

const TelegramContext = createContext<TelegramContextType | undefined>(undefined)

export const useTelegram = () => {
  const context = useContext(TelegramContext)
  if (!context) {
    throw new Error('useTelegram must be used within a TelegramProvider')
  }
  return context
}

export const TelegramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null)
  const [isTelegram, setIsTelegram] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    if (tg) {
      setWebApp(tg)
      setIsTelegram(true)
      setUser(tg.initDataUnsafe?.user)
      tg.ready()
      tg.expand()
    }
  }, [])

  return (
    <TelegramContext.Provider value={{ webApp, isTelegram, user }}>
      {children}
    </TelegramContext.Provider>
  )
}