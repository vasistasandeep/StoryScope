import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import Dashboard from './routes/Dashboard.tsx'
import Submit from './routes/Submit.tsx'
import Recent from './routes/Recent.tsx'
import StoryDetail from './routes/StoryDetail.tsx'
import Settings from './routes/Settings.tsx'
import Auth from './routes/Auth.tsx'
import Protected from './routes/Protected.tsx'
import Admin from './routes/Admin.tsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { path: 'auth', element: <Auth /> },
      {
        element: <Protected />, children: [
          { index: true, element: <Dashboard /> },
          { path: 'submit', element: <Submit /> },
          { path: 'recent', element: <Recent /> },
          { path: 'story/:id', element: <StoryDetail /> },
          { path: 'settings', element: <Settings /> },
          { path: 'admin', element: <Admin /> },
        ]
      },
    ]
  }
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
