import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
export function DashboardLayout() {
  return <div className="min-h-screen bg-accent">
      <Sidebar />
      <div className="pl-64 transition-all duration-normal">
        <Header />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>;
}