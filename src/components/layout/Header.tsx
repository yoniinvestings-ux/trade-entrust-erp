import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LogOut, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { NotificationBell } from '@/components/updates/NotificationBell';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

const quickActions = [
  { label: 'Create Order', href: '/dashboard/orders/new', category: 'Actions' },
  { label: 'Add Lead', href: '/dashboard/leads/new', category: 'Actions' },
  { label: 'Add Customer', href: '/dashboard/customers/new', category: 'Actions' },
  { label: 'Create PO', href: '/dashboard/purchase-orders/new', category: 'Actions' },
];

const pages = [
  { label: 'Dashboard', href: '/dashboard', category: 'Pages' },
  { label: 'Orders', href: '/dashboard/orders', category: 'Pages' },
  { label: 'Customers', href: '/dashboard/customers', category: 'Pages' },
  { label: 'Leads', href: '/dashboard/leads', category: 'Pages' },
  { label: 'Suppliers', href: '/dashboard/suppliers', category: 'Pages' },
  { label: 'Sourcing Projects', href: '/dashboard/sourcing', category: 'Pages' },
  { label: 'Purchase Orders', href: '/dashboard/purchase-orders', category: 'Pages' },
  { label: 'QC Inspections', href: '/dashboard/qc', category: 'Pages' },
  { label: 'Shipments', href: '/dashboard/shipments', category: 'Pages' },
  { label: 'Finance', href: '/dashboard/finance', category: 'Pages' },
  { label: 'Projects', href: '/dashboard/projects', category: 'Pages' },
  { label: 'Tasks', href: '/dashboard/tasks', category: 'Pages' },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSelect = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-16 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex h-full items-center justify-center px-6">
          {/* Search - Centered */}
          <Button
            variant="outline"
            className="w-64 justify-start text-muted-foreground absolute left-1/2 -translate-x-1/2"
            onClick={() => setOpen(true)}
          >
            <Search className="mr-2 h-4 w-4" />
            <span>Search...</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          {/* Spacer to push right side content */}
          <div className="flex-1" />

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <NotificationBell />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                    {profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <span className="hidden md:block text-sm font-medium">
                    {profile?.display_name || 'User'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Command Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Quick Actions">
            {quickActions.map((item) => (
              <CommandItem key={item.href} onSelect={() => handleSelect(item.href)}>
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Pages">
            {pages.map((item) => (
              <CommandItem key={item.href} onSelect={() => handleSelect(item.href)}>
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
