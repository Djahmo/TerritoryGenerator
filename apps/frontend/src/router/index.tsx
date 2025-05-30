import { createBrowserRouter, RouterProvider } from 'react-router'

import MainLayout from '@/layouts'
import Home from '§/Home'
import NotFound from '§/NotFound'
import ErrorBoundary from '@/components/ux/navigation/ErrorBoundary'
import Territory from '@/pages/Territory'
import Configuration from '@/pages/Configuration'

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'territory/:num', element: <Territory /> },
      { path: 'configuration', element: <Configuration /> },
      { path: '*', element: <NotFound /> },
    ],
    errorElement: <ErrorBoundary />,
  },
])

const AppRouter = () => <RouterProvider router={router} />

export default AppRouter
