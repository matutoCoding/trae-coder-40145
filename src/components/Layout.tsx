import { ReactNode, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Percent,
  FileText,
  Gift,
  Receipt,
  Umbrella,
  Menu,
  X,
  User,
  Wallet,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../services/transactionService';

interface LayoutProps {
  children: ReactNode;
}

const menuItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/promotion', label: '优惠配置', icon: Percent },
  { path: '/bills', label: '账单管理', icon: FileText },
  { path: '/quota', label: '额度管理', icon: Gift },
  { path: '/transactions', label: '消费明细', icon: Receipt },
  { path: '/rent', label: '借还雨伞', icon: Umbrella },
];

export const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { user, currentRental } = useStore();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside
        className={`${
          sidebarOpen ? 'w-60' : 'w-20'
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col h-screen sticky top-0`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <Umbrella className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-primary-500">共享雨伞</span>
            </div>
          )}
          {!sidebarOpen && (
            <div className="w-full flex justify-center">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <Umbrella className="w-6 h-6 text-white" />
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5 text-gray-500" />
            ) : (
              <Menu className="w-5 h-5 text-gray-500" />
            )}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                title={sidebarOpen ? undefined : item.label}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
                {sidebarOpen && item.path === '/bills' && currentRental && (
                  <span className="ml-auto w-2 h-2 bg-accent-500 rounded-full animate-pulse-soft" />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <div className={`flex items-center gap-3 p-2 rounded-lg ${sidebarOpen ? '' : 'justify-center'}`}>
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-primary-500" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Wallet className="w-3 h-3" />
                  <span>{formatCurrency(user.balance)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {menuItems.find(m => m.path === location.pathname)?.label || '仪表盘'}
            </h1>
          </div>
          {currentRental && (
            <div className="flex items-center gap-2 bg-accent-50 text-accent-700 px-4 py-2 rounded-full animate-pulse-soft">
              <Umbrella className="w-4 h-4" />
              <span className="text-sm font-medium">租借中</span>
            </div>
          )}
        </header>

        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
