import React, { useState, useEffect } from 'react';
import { supabase } from '../../contexts/AuthContext';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface WidgetSetting {
  widget_id: string;
  is_visible: boolean;
}

const WIDGET_DEFINITIONS = [
  { id: 'cash_bank', name: 'Денежные средства' },
  { id: 'debt', name: 'Задолженности' },
  { id: 'plan_fact', name: 'План-факт выручки' },
  { id: 'inventory', name: 'Товарные запасы' },
];

const WidgetSettingsCard: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<WidgetSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.rpc('get_user_widget_settings');
        if (error) throw error;
        setSettings(data || []);
      } catch (e: any) {
        setError('Не удалось загрузить настройки виджетов.');
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  const handleToggle = async (widgetId: string, isVisible: boolean) => {
    if (!user) return;

    setSettings(currentSettings =>
      currentSettings.map(s =>
        s.widget_id === widgetId ? { ...s, is_visible: isVisible } : s
      )
    );

    const { error } = await supabase
      .from('user_widget_settings')
      .upsert({ user_id: user.id, widget_id: widgetId, is_visible: isVisible });

    if (error) {
      setError('Не удалось сохранить настройки.');
      setSettings(currentSettings =>
        currentSettings.map(s =>
          s.widget_id === widgetId ? { ...s, is_visible: !isVisible } : s
        )
      );
    }
  };

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Настройка виджетов на главной
      </h3>
      {isLoading ? (
        <div className="flex justify-center items-center h-24">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <div className="space-y-4">
          {WIDGET_DEFINITIONS.map(widgetDef => {
            const setting = settings.find(s => s.widget_id === widgetDef.id);
            const isVisible = setting ? setting.is_visible : true;

            return (
              <div key={widgetDef.id} className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">{widgetDef.name}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => handleToggle(widgetDef.id, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WidgetSettingsCard;