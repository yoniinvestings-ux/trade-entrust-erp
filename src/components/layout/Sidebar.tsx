import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Target, ShoppingCart, Package, Factory, FileText,
  ClipboardCheck, Truck, DollarSign, FolderKanban, Settings, ChevronLeft,
  ChevronRight, Search, Megaphone, AlertTriangle, Headphones,
  UsersRound, Shield, Globe, ChevronDown, ChevronUp, BarChart3, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { usePermissionCheck } from '@/hooks/usePermissions';

interface NavChild {
  label: string;
  href: string;
  module?: string; // Module permission required for this child
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  module?: string; // Module permission required for this nav item
  adminOnly?: boolean; // Only super_admin can see
  children?: NavChild[];
}

const navigation: NavItem[] = [
  // Core Modules
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    href: '/dashboard',
    module: 'dashboard',
  },
  {
    icon: Target,
    label: 'Sales',
    href: '/dashboard/sales',
    module: 'sales',
    children: [
      { label: 'Manager Dashboard', href: '/dashboard/sales', module: 'sales' },
      { label: 'Leads', href: '/dashboard/leads', module: 'leads' },
    ]
  },
  {
    icon: Megaphone,
    label: 'Marketing',
    href: '/dashboard/marketing',
    module: 'marketing',
    children: [
      { label: 'Campaigns', href: '/dashboard/marketing/campaigns', module: 'marketing' },
    ]
  },
  {
    icon: Users,
    label: 'Customers',
    href: '/dashboard/customers',
    module: 'customers',
  },
  {
    icon: Search,
    label: 'Sourcing',
    href: '/dashboard/sourcing',
    module: 'sourcing',
    children: [
      { label: 'Projects', href: '/dashboard/sourcing', module: 'sourcing' },
      { label: 'Quotations', href: '/dashboard/quotations', module: 'quotations' },
    ]
  },
  {
    icon: ShoppingCart,
    label: 'Orders',
    href: '/dashboard/orders',
    module: 'orders',
    children: [
      { label: 'All Orders', href: '/dashboard/orders', module: 'orders' },
      { label: 'Import Orders', href: '/dashboard/orders/import', module: 'orders' },
    ]
  },
  {
    icon: Package,
    label: 'Suppliers',
    href: '/dashboard/suppliers',
    module: 'suppliers',
  },
  {
    icon: FileText,
    label: 'Purchase Orders',
    href: '/dashboard/purchase-orders',
    module: 'purchase_orders',
  },
  {
    icon: FolderKanban,
    label: 'Projects',
    href: '/dashboard/projects',
    module: 'orders', // Uses same permission as orders
  },
  {
    icon: ClipboardCheck,
    label: 'QC',
    href: '/dashboard/qc',
    module: 'qc',
    children: [
      { label: 'Inspections', href: '/dashboard/qc/inspections', module: 'qc' },
      { label: 'Corrective Actions', href: '/dashboard/qc/corrective-actions', module: 'qc' },
      { label: 'After-Sales Cases', href: '/dashboard/qc/after-sales', module: 'after_sales' },
    ]
  },
  {
    icon: Truck,
    label: 'Shipments',
    href: '/dashboard/shipments',
    module: 'shipments',
  },
  {
    icon: DollarSign,
    label: 'Finance',
    href: '/dashboard/finance',
    module: 'finance',
    children: [
      { label: 'Overview', href: '/dashboard/finance', module: 'finance' },
      { label: 'Customer Ledger', href: '/dashboard/customer-ledger', module: 'finance' },
      { label: 'Customer Payments', href: '/dashboard/finance/customer-payments', module: 'finance' },
      { label: 'Supplier Payments', href: '/dashboard/finance/supplier-payments', module: 'finance' },
      { label: 'Expenses', href: '/dashboard/finance/expenses', module: 'finance' },
      { label: 'Salaries', href: '/dashboard/finance/salaries', module: 'salary' },
    ]
  },
  {
    icon: UsersRound,
    label: 'HR',
    href: '/dashboard/hr',
    module: 'hr',
    children: [
      { label: 'Employees', href: '/dashboard/hr/employees', module: 'hr' },
      { label: 'Attendance', href: '/dashboard/hr/attendance', module: 'hr' },
      { label: 'Recruitment', href: '/dashboard/hr/recruitment', module: 'hr' },
      { label: 'Performance', href: '/dashboard/hr/performance', module: 'hr' },
      { label: 'Admin Requests', href: '/dashboard/hr/admin', module: 'hr' },
    ]
  },
  {
    icon: BarChart3,
    label: 'Analytics',
    href: '/dashboard/workload',
    module: 'analytics',
    children: [
      { label: 'Workload & Profit', href: '/dashboard/workload', module: 'analytics' },
    ]
  },
  {
    icon: Shield,
    label: 'Admin',
    href: '/dashboard/admin',
    adminOnly: true,
    children: [
      { label: 'Users', href: '/dashboard/admin/users' },
      { label: 'Permissions', href: '/dashboard/admin/permissions' },
      { label: 'Settings', href: '/dashboard/settings', module: 'settings' },
    ]
  },
  {
    icon: Globe,
    label: 'Customer Portal',
    href: '/dashboard/customer-portal',
    module: 'customer_portal',
  },
  {
    icon: Factory,
    label: 'Supplier Portal',
    href: '/dashboard/supplier-portal',
    module: 'supplier_portal',
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const location = useLocation();
  const { role, profile } = useAuth();
  const { hasPermission, isLoading: permissionsLoading } = usePermissionCheck();

  // Filter navigation based on permissions
  const filteredNavigation = navigation.filter(item => {
    // Admin-only items require super_admin role
    if (item.adminOnly) {
      return role === 'super_admin';
    }

    // If no module specified, always show (like Settings in Admin children)
    if (!item.module) {
      return true;
    }

    // Check if user has view permission for this module
    return hasPermission(item.module, 'view');
  });

  // Filter children based on permissions
  const getFilteredChildren = (children?: NavChild[]) => {
    if (!children) return undefined;

    return children.filter(child => {
      if (!child.module) return true;
      return hasPermission(child.module, 'view');
    });
  };

  const toggleExpanded = (href: string) => {
    setExpandedItems(prev =>
      prev.includes(href)
        ? prev.filter(h => h !== href)
        : [...prev, href]
    );
  };

  const isItemActive = (item: NavItem) => {
    if (location.pathname === item.href) return true;
    if (item.children?.some(child => location.pathname === child.href)) return true;
    if (item.href !== '/dashboard' && location.pathname.startsWith(item.href)) return true;
    return false;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen transition-all duration-normal",
        collapsed ? "w-16" : "w-64"
      )}
      style={{ background: 'var(--gradient-sidebar)' }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <img src="/images/logo.png" alt="Trade Entrust" className="h-10 w-10 object-contain" />
            <div className="flex flex-col">
              <span className="font-heading font-bold text-sidebar-foreground text-lg leading-tight">Trade Entrust</span>
              <span className="text-xs text-sidebar-foreground/60">ERP System</span>
            </div>
          </div>
        )}
        {collapsed && <img src="/images/logo.png" alt="Trade Entrust" className="h-8 w-8 object-contain mx-auto" />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors",
            collapsed && "absolute right-2"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin max-h-[calc(100vh-8rem)]">
        <ul className="space-y-1">
          {filteredNavigation.map(item => {
            const isActive = isItemActive(item);
            const isExpanded = expandedItems.includes(item.href) || isActive;
            const filteredChildren = getFilteredChildren(item.children);
            const hasChildren = filteredChildren && filteredChildren.length > 0;

            return (
              <li key={item.href}>
                {hasChildren && !collapsed ? (
                  <>
                    <button
                      onClick={() => toggleExpanded(item.href)}
                      className={cn(
                        "nav-item w-full justify-between",
                        isActive && "active"
                      )}
                    >
                      <div className="flex items-center">
                        <item.icon className="nav-item-icon" />
                        <span>{item.label}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    {isExpanded && (
                      <ul className="ml-6 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                        {filteredChildren.map(child => (
                          <li key={child.href}>
                            <NavLink
                              to={child.href}
                              className={cn(
                                "nav-item text-sm py-2",
                                location.pathname === child.href && "active"
                              )}
                            >
                              <span>{child.label}</span>
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <NavLink
                    to={hasChildren ? filteredChildren![0].href : item.href}
                    className={cn("nav-item", isActive && "active")}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="nav-item-icon" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User info at bottom */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-4 bg-sidebar">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-primary font-semibold text-sm">
              {profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.display_name || 'User'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 capitalize truncate">
                {role?.replace('_', ' ') || 'No role'}
              </p>
            </div>
            <NavLink
              to="/dashboard/settings"
              className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              <Settings className="h-4 w-4" />
            </NavLink>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-primary font-semibold text-sm">
              {profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
