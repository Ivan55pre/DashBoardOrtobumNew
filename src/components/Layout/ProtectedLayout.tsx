import React from 'react'
import { Outlet } from 'react-router-dom'
import ProtectedRoute from '../Auth/ProtectedRoute'
import Layout from './Layout'

const ProtectedLayout: React.FC = () => {
  return (
    <ProtectedRoute>
      <Layout>
        <Outlet />
      </Layout>
    </ProtectedRoute>
  )
}

export default ProtectedLayout