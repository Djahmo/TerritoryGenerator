import { createBrowserRouter, RouterProvider } from 'react-router'

import MainLayout from '@/layouts'
import Territories from '@/pages/Territories'
import NotFound from '§/NotFound'
import ErrorBoundary from '@/components/ux/navigation/ErrorBoundary'
import Territory from '@/pages/Territory'
import Configuration from '@/pages/Configuration'
import AllTerritory from '@/pages/AllTerritory'
import Exportation from '@/pages/Exportation'
import ProtectedRoute from '@/components/ux/navigation/ProtectedRoute'

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <AllTerritory />
          </ProtectedRoute>
        )
      },
      {
        path: 'territory/:num',
        element: (
          <ProtectedRoute>
            <Territory />
          </ProtectedRoute>
        )
      },
      {
        path: 'configuration',
        element: (
          <ProtectedRoute allowAnonymous={true}>
            <Configuration />
          </ProtectedRoute>
        )
      },
      {
        path: 'territories',
        element: (
          <ProtectedRoute>
            <Territories />
          </ProtectedRoute>
        )
      },
      {
        path: 'exportation',
        element: (
          <ProtectedRoute>
            <Exportation />
          </ProtectedRoute>
        )
      },
      { path: '*', element: <NotFound /> },
    ],
    errorElement: <ErrorBoundary />,
  },
])

const AppRouter = () => <RouterProvider router={router} />

export default AppRouter
