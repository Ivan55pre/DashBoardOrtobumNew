import React, { useState, useEffect, useRef } from 'react';
import { useOrganizations } from '../../contexts/OrganizationContext';
import { ChevronDown, Check, X } from 'lucide-react';

const OrganizationFilter: React.FC = () => {
  const { organizations, isLoading, selectedOrgIds, setSelectedOrgIds, isAllSelected } = useOrganizations();
  const [isOpen, setIsOpen] = useState(false);
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(selectedOrgIds);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Синхронизируем временное состояние при изменении глобального
  useEffect(() => {
    setTempSelectedIds(selectedOrgIds);
  }, [selectedOrgIds]);

  // Обработка кликов вне компонента для закрытия выпадающего списка
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        // При клике снаружи отменяем изменения и закрываем
        setTempSelectedIds(selectedOrgIds);
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef, selectedOrgIds]);

  const handleApply = () => {
    setSelectedOrgIds(tempSelectedIds);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempSelectedIds(selectedOrgIds);
    setIsOpen(false);
  };

  const handleToggle = () => {
    // При открытии синхронизируем временное состояние с глобальным
    if (!isOpen) {
      setTempSelectedIds(selectedOrgIds);
    }
    setIsOpen(!isOpen);
  };
  
  const handleCheckboxChange = (orgId: string) => {
    setTempSelectedIds(prev =>
      prev.includes(orgId) ? prev.filter(id => id !== orgId) : [...prev, orgId]
    );
  };

  const handleSelectAll = () => {
    setTempSelectedIds(organizations.map(org => org.id));
  };

  const handleDeselectAll = () => {
    setTempSelectedIds([]);
  };

  const getSelectionText = () => {
    if (isAllSelected) {
      return 'Все организации';
    }
    if (selectedOrgIds.length === 1) {
      const org = organizations.find(o => o.id === selectedOrgIds[0]);
      return org?.name || '1 организация';
    }
    return `Выбрано: ${selectedOrgIds.length}`;
  };

  if (isLoading) {
    return <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-64 animate-pulse"></div>;
  }

  return (
    <div className="min-w-[250px] relative" ref={wrapperRef}>
      <label htmlFor="org-filter-btn" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Организации
      </label>
      <button
        id="org-filter-btn"
        type="button"
        onClick={handleToggle}
        className="form-input flex items-center justify-between w-full pl-3 pr-2 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-dark-800 dark:border-gray-600 dark:text-white"
      >
        <span className="truncate">{getSelectionText()}</span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-dark-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
          <div className="p-2 flex justify-between border-b border-gray-200 dark:border-gray-700">
            <button onClick={handleSelectAll} className="text-xs text-primary-600 hover:underline dark:text-primary-400">Выбрать все</button>
            <button onClick={handleDeselectAll} className="text-xs text-primary-600 hover:underline dark:text-primary-400">Снять все</button>
          </div>
          <ul className="py-1 max-h-60 overflow-y-auto">
            {organizations.map(org => (
              <li key={org.id} className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-dark-700 cursor-pointer" onClick={() => handleCheckboxChange(org.id)}>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="form-checkbox h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" checked={tempSelectedIds.includes(org.id)} onChange={() => handleCheckboxChange(org.id)} onClick={(e) => e.stopPropagation()} />
                  <span className="text-sm text-gray-900 dark:text-gray-200">{org.name}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="p-2 flex justify-end space-x-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-800/50 rounded-b-md">
            <button onClick={handleCancel} className="btn-secondary flex items-center space-x-1 px-3 py-1.5 text-sm"><X className="w-4 h-4" /><span>Отмена</span></button>
            <button onClick={handleApply} className="btn-primary flex items-center space-x-1 px-3 py-1.5 text-sm"><Check className="w-4 h-4" /><span>Применить</span></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationFilter;