import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useDrag, useDrop } from 'react-dnd';
import { XYCoord } from 'dnd-core';
import { Settings, Eye, EyeOff } from 'lucide-react';
import CashBankWidget from '../components/Dashboard/CashBankWidget';
import CashDynamicsChart from '../components/Dashboard/CashDynamicsChart';
import DebtWidget from '../components/Dashboard/DebtWidget';
import PlanFactWidget from '../components/Dashboard/PlanFactWidget';
import InventoryWidget from '../components/Dashboard/InventoryWidget';
import { useReportDate } from '../contexts/ReportDateContext';
import { useOrganizations } from '../contexts/OrganizationContext';
import NoOrganizationState from '../components/Layout/NoOrganizationState';
import { useCashDynamicsData } from '../hooks/useCashDynamicsData';
import { useOrganizationCheck } from '../hooks/useOrganizationCheck';
import { useUserSettings } from '../hooks/useUserSettings';

const WIDGET_TYPE = 'WIDGET';

interface DragItem {
  index: number;
  id: string;
  type: string;
}

const SortableWidget: React.FC<{
  id: string;
  index: number;
  moveWidget: (dragIndex: number, hoverIndex: number) => void;
  children: React.ReactNode;
  onDrop: () => void;
}> = ({ id, index, moveWidget, children, onDrop }) => {
  const ref = useRef<HTMLDivElement>(null)

  const [, drop] = useDrop<DragItem>({
    accept: WIDGET_TYPE,
    hover(item, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      moveWidget(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: WIDGET_TYPE,
    item: () => ({ id, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      if (monitor.didDrop()) {
        onDrop();
      }
    },
  });

  const opacity = isDragging ? 0 : 1;
  drag(drop(ref));

  return (
    <div ref={ref} style={{ opacity }} className="cursor-move">
      {children}
    </div>
  );
};

// Карта виджетов для динамического рендеринга
const WIDGET_COMPONENTS: Record<string, React.ComponentType<any>> = {
  cash_bank: CashBankWidget,
  debt: DebtWidget,
  plan_fact: PlanFactWidget,
  inventory: InventoryWidget,
  cash_dynamics_chart: CashDynamicsChart,
};

const Dashboard: React.FC = () => {
  const { reportDate } = useReportDate();
  const { isLoading: isOrgCheckLoading, hasOrganizations } = useOrganizationCheck();
  const { selectedOrgIds } = useOrganizations();
  const { dateRange } = useReportDate();
  const { settings, loading: areSettingsLoading, updateSettings } = useUserSettings();
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);

  // Локальное состояние для порядка виджетов во время перетаскивания
  const [localWidgetOrder, setLocalWidgetOrder] = useState<string[]>([]);

  useEffect(() => {
    // Синхронизируем локальный порядок с настройками пользователя
    if (settings?.dashboard?.widgetOrder) {
      setLocalWidgetOrder(settings.dashboard.widgetOrder);
    }
  }, [settings?.dashboard?.widgetOrder]);

  const moveWidget = useCallback((dragIndex: number, hoverIndex: number) => {
    setLocalWidgetOrder(prevOrder => {
      const newOrder = [...prevOrder];
      const [draggedItem] = newOrder.splice(dragIndex, 1);
      newOrder.splice(hoverIndex, 0, draggedItem);
      return newOrder;
    });
  }, []);

  const handleDrop = useCallback(() => {
    updateSettings({ widgetOrder: localWidgetOrder });
  }, [localWidgetOrder, updateSettings]);

  const toggleChartVisibility = () => {
    if (!settings?.dashboard) return;
    const currentVisibility = settings.dashboard.widgetVisibility;
    updateSettings({
      widgetVisibility: {
        ...currentVisibility,
        'cash_dynamics_chart': !currentVisibility['cash_dynamics_chart'],
      }
    });
    setIsSettingsMenuOpen(false);
  };

  const { 
    data: cashDynamicsData, 
    isLoading: isCashDynamicsLoading, 
    error: cashDynamicsError 
  } = useCashDynamicsData({
    organizationIds: selectedOrgIds,
    startDate: dateRange?.from?.toISOString().split('T')[0],
    endDate: dateRange?.to?.toISOString().split('T')[0],
  });

  if (isOrgCheckLoading || areSettingsLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (!hasOrganizations) {
    return <NoOrganizationState />;
  }

  if (!settings?.dashboard) {
    return <div>Ошибка загрузки настроек дашборда.</div>;
  }

  const { widgetVisibility } = settings.dashboard;
  const visibleWidgetIds = localWidgetOrder.filter(id => widgetVisibility[id]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Сводка по показателям
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Данные на {new Date(reportDate + 'T00:00:00').toLocaleDateString('ru-RU')} г.
          </p>
        </div>
        <div className="relative">
          <button onClick={() => setIsSettingsMenuOpen(prev => !prev)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700">
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          {isSettingsMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white dark:bg-dark-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
              <div className="py-1">
                <button onClick={toggleChartVisibility} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-700">
                  {widgetVisibility['cash_dynamics_chart'] ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                  <span>{widgetVisibility['cash_dynamics_chart'] ? 'Скрыть график' : 'Показать график'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {visibleWidgetIds.map(widgetId => {
          const WidgetComponent = WIDGET_COMPONENTS[widgetId];
          if (!WidgetComponent) return null;

          const index = localWidgetOrder.findIndex(id => id === widgetId);

          let widgetProps: any = {};
          if (widgetId === 'cash_dynamics_chart') {
            widgetProps = { data: cashDynamicsData, isLoading: isCashDynamicsLoading, error: cashDynamicsError };
          } else {
            widgetProps = { organizationIds: selectedOrgIds };
          }

          return (
            <SortableWidget
              key={widgetId}
              id={widgetId}
              index={index}
              moveWidget={moveWidget}
              onDrop={handleDrop}
            >
              <WidgetComponent {...widgetProps} />
            </SortableWidget>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;