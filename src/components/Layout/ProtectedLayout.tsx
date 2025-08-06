import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Layout from './Layout';
import { ReportDateProvider } from '../../contexts/ReportDateContext';

const ProtectedLayout: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    // Можно заменить на более красивый спиннер/скелетон
    return <div className="flex justify-center items-center h-screen">Загрузка...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ReportDateProvider>
      <Layout><Outlet /></Layout>
    </ReportDateProvider>
  );
};

export default ProtectedLayout;