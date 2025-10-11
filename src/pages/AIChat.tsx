import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganizations } from '../contexts/OrganizationContext';
import { useReportDate } from '../contexts/ReportDateContext';

const AIChat = () => {
  const { user } = useAuth();
  const { organizations, selectedOrgIds } = useOrganizations();
  const { reportDate, dateRange } = useReportDate();
  const [messages, setMessages] = useState<{id: number, text: string, sender: 'user' | 'ai'}[]>([]);
 const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);
  const [contextOptions, setContextOptions] = useState({
    organization: true,
    reportDate: true,
    dateRange: true,
    user: true
  });
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    // Добавляем сообщение пользователя
    const userMessage = {
      id: Date.now(),
      text: inputText,
      sender: 'user' as const
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Подготовка контекста приложения, если включено
      const appContext = includeContext ? {
        organization: contextOptions.organization ? {
          selected: selectedOrgIds,
          available: organizations.map(org => ({ id: org.id, name: org.name }))
        } : undefined,
        reportDate: contextOptions.reportDate ? reportDate : undefined,
        dateRange: contextOptions.dateRange && dateRange ? {
          from: dateRange.from ? dateRange.from.toISOString() : undefined,
          to: dateRange.to ? dateRange.to.toISOString() : undefined
        } : undefined,
        user: contextOptions.user ? {
          id: user?.id,
          email: user?.email,
          role: user?.role
        } : undefined
      } : null;

      // Отправляем запрос к webhook n8n с контекстом приложения и Auth данными пользователя
      const response = await fetch('https://n8n.preivan.ru/webhook/Julianna_AI', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: inputText,
          context: appContext
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiMessage = {
          id: Date.now() + 1,
          text: data.response || 'Ответ от AI',
          sender: 'ai' as const
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        const aiMessage = {
          id: Date.now() + 1,
          text: 'Ошибка при получении ответа от AI',
          sender: 'ai' as const
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      const aiMessage = {
        id: Date.now() + 1,
        text: 'Ошибка соединения с AI',
        sender: 'ai' as const
      };
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-800 rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Чат с AI</h1>
        <p className="text-gray-600 dark:text-gray-400">Общайтесь с AI помощником для получения аналитики и ответов на вопросы</p>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 max-h-[calc(100vh-250px)]">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.sender === 'user'
                    ? 'bg-primary-500 text-white rounded-br-none'
                    : 'bg-gray-10 dark:bg-dark-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {message.sender === 'ai' && (
                    <Bot className="w-5 h-5 mt-0.5 text-primary-500 dark:text-primary-400 flex-shrink-0" />
                  )}
                  {message.sender === 'user' && (
                    <User className="w-5 h-5 mt-0.5 text-white flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    {message.text}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-4 bg-gray-100 dark:bg-dark-700 text-gray-800 dark:text-gray-200 rounded-bl-none">
                <div className="flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-primary-500 dark:text-primary-400" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-100"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="mt-auto">
        <div className="flex items-center mb-2">
          <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={includeContext}
              onChange={(e) => setIncludeContext(e.target.checked)}
              className="rounded text-primary-500 focus:ring-primary-500"
            />
            <span>Включить контекст приложения</span>
          </label>
        </div>
        {includeContext && (
          <div className="mb-3 p-3 bg-gray-50 dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Настройки контекста:</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={contextOptions.organization}
                  onChange={(e) => setContextOptions(prev => ({...prev, organization: e.target.checked}))}
                  className="rounded text-primary-500 focus:ring-primary-500"
                />
                <span>Организация</span>
              </label>
              <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={contextOptions.reportDate}
                  onChange={(e) => setContextOptions(prev => ({...prev, reportDate: e.target.checked}))}
                  className="rounded text-primary-50 focus:ring-primary-500"
                />
                <span>Дата отчета</span>
              </label>
              <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={contextOptions.dateRange}
                  onChange={(e) => setContextOptions(prev => ({...prev, dateRange: e.target.checked}))}
                  className="rounded text-primary-500 focus:ring-primary-500"
                />
                <span>Период графиков</span>
              </label>
              <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={contextOptions.user}
                  onChange={(e) => setContextOptions(prev => ({...prev, user: e.target.checked}))}
                  className="rounded text-primary-50 focus:ring-primary-500"
                />
                <span>Данные пользователя</span>
              </label>
            </div>
          </div>
        )}
        <div className="flex items-end space-x-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Введите ваш вопрос..."
            className="flex-1 border border-gray-300 dark:border-dark-600 rounded-lg p-3 min-h-[100px] max-h-40 resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-70 dark:text-white"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !inputText.trim()}
            className="bg-primary-500 hover:bg-primary-600 text-white rounded-lg p-3 flex items-center justify-center h-[100px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;