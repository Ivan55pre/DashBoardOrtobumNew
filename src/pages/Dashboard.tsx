import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CashBankWidget from '../components/Dashboard/CashBankWidget';
import DebtWidget from '../components/Dashboard/DebtWidget';
import PlanFactWidget from '../components/Dashboard/PlanFactWidget';
import InventoryWidget from '../components/Dashboard/InventoryWidget';
import { useReportDate } from '../contexts/ReportDateContext';
import NoOrganizationState from '../components/Layout/NoOrganizationState';
import { useOrganizationCheck } from '../hooks/useOrganizationCheck';
import { useWidgetSettings, WidgetSetting } from '../hooks/useWidgetSettings';
import { supabase } from '../contexts/AuthContext';

const SortableWidget: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
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

  useEffect(() => {
    if (initialWidgetSettings) {
      setWidgets(initialWidgetSettings);
    }
  }, [initialWidgetSettings]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex((w) => w.widget_id === active.id);
      const newIndex = widgets.findIndex((w) => w.widget_id === over.id);

      const newOrder = arrayMove(widgets, oldIndex, newIndex);
      setWidgets(newOrder); // Optimistic UI update

      // Save the new order to the database
      const payload = newOrder.map((widget, index) => ({
        widget_id: widget.widget_id,
        order: index,
      }));

      const { error } = await supabase.rpc('save_widget_order', { p_widget_orders: payload });

      if (error) {
        console.error("Failed to save widget order", error);
        setWidgets(widgets); // Revert on failure
      }
    }
  };

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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleWidgets.map(w => w.widget_id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {visibleWidgets.map((setting) => (
              <SortableWidget key={setting.widget_id} id={setting.widget_id}>
                {WIDGET_MAP[setting.widget_id]}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default Dashboard;