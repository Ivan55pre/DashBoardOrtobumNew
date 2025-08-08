import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { XYCoord } from 'dnd-core';
import CashBankWidget from '../components/Dashboard/CashBankWidget';
import DebtWidget from '../components/Dashboard/DebtWidget';
import PlanFactWidget from '../components/Dashboard/PlanFactWidget';
import InventoryWidget from '../components/Dashboard/InventoryWidget';
import { useReportDate } from '../contexts/ReportDateContext';
import NoOrganizationState from '../components/Layout/NoOrganizationState';
import { useOrganizationCheck } from '../hooks/useOrganizationCheck';
import { useWidgetSettings, WidgetSetting } from '../hooks/useWidgetSettings';
import { supabase } from '../contexts/AuthContext';

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
  saveOrder: () => void;
  children: React.ReactNode;
}> = ({ id, index, moveWidget, saveOrder, children }) => {
  const ref = useRef<HTMLDivElement>(null);

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
    end: (_item, monitor) => {
      // Save order only when the drop is successful
      if (monitor.didDrop()) {
        saveOrder();
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

const WIDGET_MAP: Record<string, React.ReactNode> = {
  cash_bank: <CashBankWidget />,
  debt: <DebtWidget />,
  plan_fact: <PlanFactWidget />,
  inventory: <InventoryWidget />,
};

const Dashboard: React.FC = () => {
  const { reportDate } = useReportDate();
  const { isLoading: isOrgCheckLoading, hasOrganizations } = useOrganizationCheck();
  const { settings: initialWidgetSettings, isLoading: areSettingsLoading } = useWidgetSettings();
  const [widgets, setWidgets] = useState<WidgetSetting[]>([]);
  const widgetsRef = useRef(widgets);

  useEffect(() => {
    if (initialWidgetSettings) {
      setWidgets(initialWidgetSettings);
    }
  }, [initialWidgetSettings]);

  // Keep a ref to the latest widgets state to avoid stale closures in callbacks
  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  const moveWidget = useCallback((dragIndex: number, hoverIndex: number) => {
    setWidgets((prevWidgets) => {
      const newWidgets = [...prevWidgets];
      const [draggedItem] = newWidgets.splice(dragIndex, 1);
      newWidgets.splice(hoverIndex, 0, draggedItem);
      return newWidgets;
    });
  }, []);

  const saveWidgetOrder = useCallback(async () => {
    const currentWidgets = widgetsRef.current;
    const payload = currentWidgets.map((widget, index) => ({
      widget_id: widget.widget_id,
      order: index,
    }));

    const { error } = await supabase.rpc('save_widget_order', { p_widget_orders: payload });

    if (error) {
      console.error("Failed to save widget order", error);
      // Revert on failure by refetching or using initial settings
      if (initialWidgetSettings) {
        setWidgets(initialWidgetSettings);
      }
    }
  }, [initialWidgetSettings]); // Dependency on initial settings for potential revert

  if (isOrgCheckLoading || areSettingsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card h-40 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (!hasOrganizations) {
    return <NoOrganizationState />;
  }

  const visibleWidgets = widgets.filter(setting => setting.is_visible);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Сводка по показателям
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Данные на {new Date(reportDate + 'T00:00:00').toLocaleDateString('ru-RU')} г.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {visibleWidgets.map((setting, index) => (
          <SortableWidget
            key={setting.widget_id}
            id={setting.widget_id}
            index={index}
            moveWidget={moveWidget}
            saveOrder={saveWidgetOrder}
          >
            {WIDGET_MAP[setting.widget_id]}
          </SortableWidget>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;