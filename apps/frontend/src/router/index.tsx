import { createBrowserRouter, RouterProvider } from 'react-router'

import MainLayout from '@/layouts'
import Territories from '@/pages/Territories'
import NotFound from '§/NotFound'
import ErrorBoundary from '@/components/ux/navigation/ErrorBoundary'
import Territory from '@/pages/Territory'
import Configuration from '@/pages/Configuration'
import AllTerritory from '@/pages/AllTerritory'

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <AllTerritory /> },
      { path: 'territory/:num', element: <Territory /> },
      { path: 'configuration', element: <Configuration /> },
      { path: 'all', element: <Territories /> },
      { path: '*', element: <NotFound /> },
    ],
    errorElement: <ErrorBoundary />,
  },
])

const AppRouter = () => <RouterProvider router={router} />

export default AppRouter
