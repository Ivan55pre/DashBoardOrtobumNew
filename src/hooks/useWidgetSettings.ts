import { useState, useEffect } from 'react';
import { supabase } from '../contexts/AuthContext';
import { useAuth } from '../contexts/AuthContext';

export interface WidgetSetting {
  widget_id: string;
  is_visible: boolean;
  widget_order: number;
}

export const useWidgetSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<WidgetSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.rpc('get_user_widget_settings');
        if (error) throw error;
        setSettings(data || []);
      } catch (e: any) {
        setError(new Error('Не удалось загрузить настройки виджетов.'));
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  return { settings, isLoading, error };
};