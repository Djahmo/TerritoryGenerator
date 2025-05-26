import { createBrowserRouter, RouterProvider } from 'react-router'

import MainLayout from '@/layouts'
import Home from '§/Home'
import NotFound from '§/NotFound'
import ErrorBoundary from '@/components/ux/navigation/ErrorBoundary'

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: '*', element: <NotFound /> },
    ],
    errorElement: <ErrorBoundary />,
  },
])

const AppRouter = () => <RouterProvider router={router} />

export default AppRouter
