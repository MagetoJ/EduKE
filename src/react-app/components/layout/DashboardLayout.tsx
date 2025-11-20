import { Outlet } from 'react-router'
import Sidebar from './Sidebar'
import Header from './Header'

export default function DashboardLayout() {
  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300">
          <div className="container mx-auto px-8 py-8 max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
