import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../contexts/AuthContext'

// Определяем структуру настроек
export interface DashboardSettings {
  widgetOrder: string[];
  widgetVisibility: { [key: string]: boolean };
}

export interface UserSettings {
  dashboard?: DashboardSettings;
}

const defaultWidgetOrder = ['cash_bank', 'debt', 'plan_fact', 'inventory', 'cash_dynamics_chart'];

const defaultSettings: UserSettings = {
  dashboard: {
    widgetOrder: defaultWidgetOrder,
    widgetVisibility: {
      'cash_bank': true,
      'debt': true,
      'plan_fact': true,
      'inventory': true,
      'cash_dynamics_chart': true,
    },
  },
}

export function useUserSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSettings = useCallback(async () => {
    if (!user) {
      // No user, no settings to fetch. Can't do much.
      setLoading(false);
      return;
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116: "Запрошена одна строка, но найдено 0"
        throw error
      }

      // Глубокое объединение с настройками по умолчанию для обеспечения обратной совместимости
      const savedSettings = data?.settings || {};
      const savedDashboardSettings = savedSettings.dashboard || {};

      // Убедимся, что все виджеты из `default` присутствуют, на случай добавления новых
      const currentOrder = savedDashboardSettings.widgetOrder || defaultSettings.dashboard!.widgetOrder;
      const newWidgets = defaultSettings.dashboard!.widgetOrder.filter(w => !currentOrder.includes(w));
      const finalOrder = [...currentOrder, ...newWidgets];

      const finalVisibility = {
        ...defaultSettings.dashboard!.widgetVisibility,
        ...(savedDashboardSettings.widgetVisibility || {}),
      };

      const userSettings: UserSettings = {
        ...defaultSettings,
        ...savedSettings,
        dashboard: {
          ...defaultSettings.dashboard,
          ...savedDashboardSettings,
          widgetOrder: finalOrder,
          widgetVisibility: finalVisibility,
        },
      }
      setSettings(userSettings)
    } catch (error) {
      console.error('Ошибка загрузки настроек пользователя:', error)
      setSettings(defaultSettings) // Возвращаемся к настройкам по умолчанию в случае ошибки
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSettings = useCallback(
    async (newDashboardSettings: Partial<DashboardSettings>) => {
      if (!user || !settings?.dashboard) return

      const updatedDashboardSettings = { ...settings.dashboard, ...newDashboardSettings };
      const updatedSettings = { ...settings, dashboard: updatedDashboardSettings };
      
      setSettings(updatedSettings) // Оптимистичное обновление

      const { error } = await supabase.from('profiles').update({ settings: updatedSettings }).eq('id', user.id)
      if (error) 
        console.error('Ошибка обновления настроек пользователя:', error)
    },
    [user, settings]
  )

  return { settings, loading, updateSettings }
}