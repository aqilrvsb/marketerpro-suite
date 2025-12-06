import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Truck,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  ClipboardList,
  PanelLeftClose,
  PanelLeft,
  History,
  Package,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  Trophy,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['marketer', 'admin', 'bod', 'logistic', 'account'],
  },
  {
    label: 'Order',
    path: '/dashboard/orders/new',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['marketer', 'admin'],
  },
  {
    label: 'History',
    path: '/dashboard/orders',
    icon: <History className="w-5 h-5" />,
    roles: ['marketer', 'admin', 'bod', 'account'],
  },
  {
    label: 'Leads',
    path: '/dashboard/prospects',
    icon: <Users className="w-5 h-5" />,
    roles: ['marketer', 'admin', 'bod'],
  },
  {
    label: 'Spend',
    path: '/dashboard/spend',
    icon: <Wallet className="w-5 h-5" />,
    roles: ['marketer', 'admin', 'bod'],
  },
  {
    label: 'Reporting Spend',
    path: '/dashboard/reporting-spend',
    icon: <BarChart3 className="w-5 h-5" />,
    roles: ['marketer', 'admin', 'bod'],
  },
  {
    label: 'Top 10',
    path: '/dashboard/top10',
    icon: <Trophy className="w-5 h-5" />,
    roles: ['marketer', 'admin', 'bod'],
  },
  {
    label: 'Logistics',
    path: '/dashboard/logistics',
    icon: <Truck className="w-5 h-5" />,
    roles: ['admin', 'bod'],
  },
  {
    label: 'Order',
    path: '/dashboard/logistics/order',
    icon: <ClipboardList className="w-5 h-5" />,
    roles: ['logistic'],
  },
  {
    label: 'Processed',
    path: '/dashboard/logistics/shipment',
    icon: <Truck className="w-5 h-5" />,
    roles: ['logistic'],
  },
  {
    label: 'Product',
    path: '/dashboard/logistics/product',
    icon: <Package className="w-5 h-5" />,
    roles: ['logistic'],
  },
  {
    label: 'Bundle',
    path: '/dashboard/logistics/bundle',
    icon: <Boxes className="w-5 h-5" />,
    roles: ['logistic'],
  },
  {
    label: 'Stock In',
    path: '/dashboard/logistics/stock-in',
    icon: <ArrowDownToLine className="w-5 h-5" />,
    roles: ['logistic'],
  },
  {
    label: 'Stock Out',
    path: '/dashboard/logistics/stock-out',
    icon: <ArrowUpFromLine className="w-5 h-5" />,
    roles: ['logistic'],
  },
  {
    label: 'Ninjavan Settings',
    path: '/dashboard/logistics/ninjavan-settings',
    icon: <Settings className="w-5 h-5" />,
    roles: ['logistic'],
  },
  {
    label: 'Finance',
    path: '/dashboard/finance',
    icon: <DollarSign className="w-5 h-5" />,
    roles: ['admin', 'account', 'bod'],
  },
  {
    label: 'Reports',
    path: '/dashboard/reports',
    icon: <BarChart3 className="w-5 h-5" />,
    roles: ['admin', 'bod', 'account'],
  },
  {
    label: 'Settings',
    path: '/dashboard/settings',
    icon: <Settings className="w-5 h-5" />,
    roles: ['admin'],
  },
];

const Sidebar: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(profile?.role || '')
  );

  const isItemActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <aside 
      className={cn(
        "min-h-screen bg-background border-r border-border flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo & Toggle */}
      <div className="p-4 flex items-center justify-between">
        {!collapsed && (
          <h1 className="text-xl font-bold text-primary">
            DFR<span className="text-foreground">Empire</span>
          </h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Label */}
      {!collapsed && (
        <div className="px-6 pb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Navigation
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            title={collapsed ? item.label : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-muted-foreground hover:bg-muted hover:text-foreground',
              isItemActive(item.path) && 'bg-primary text-primary-foreground font-medium hover:bg-primary hover:text-primary-foreground',
              collapsed && 'justify-center px-2'
            )}
          >
            {item.icon}
            {!collapsed && <span className="text-sm">{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* User Profile & Logout */}
      <div className="p-3 border-t border-border">
        <div className={cn(
          "flex items-center gap-3 px-3 py-2 mb-2",
          collapsed && "justify-center px-0"
        )}>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
            {profile?.idstaff?.charAt(0) || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.idstaff || 'User'}
              </p>
            </div>
          )}
        </div>
        <Link
          to="/dashboard/profile"
          title={collapsed ? "Profile" : undefined}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200",
            isItemActive('/dashboard/profile') && 'bg-primary text-primary-foreground font-medium hover:bg-primary hover:text-primary-foreground',
            collapsed && "justify-center px-2"
          )}
        >
          <UserCircle className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Profile</span>}
        </Link>
        <button
          onClick={handleLogout}
          title={collapsed ? "Logout" : undefined}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
