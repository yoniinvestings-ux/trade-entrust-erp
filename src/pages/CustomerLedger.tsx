import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Search, DollarSign, ShoppingCart, CreditCard, AlertTriangle, 
  CheckCircle, TrendingUp, Users, Trash2 
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function CustomerLedger() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Fetch customer ledger from view
  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ['customer-ledger', search],
    queryFn: async () => {
      let query = supabase
        .from('customer_ledger')
        .select('*')
        .order('balance_due', { ascending: false });

      if (search) {
        query = query.or(`company_name.ilike.%${search}%,contact_person.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent financial records for customers
  const { data: recentPayments } = useQuery({
    queryKey: ['recent-customer-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_records')
        .select(`
          *,
          customer:customers(company_name),
          order:orders(order_number)
        `)
        .eq('type', 'customer_payment')
        .order('date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Delete customers mutation
  const deleteCustomers = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('customers').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['customers-with-totals'] });
      queryClient.invalidateQueries({ queryKey: ['recent-customer-payments'] });
      toast.success(`Deleted ${selectedIds.length} customer(s)`);
      setSelectedIds([]);
      setBulkDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error('Failed to delete customers: ' + error.message);
    },
  });

  const formatCurrency = (value: number | null, currency: string = 'USD') => {
    if (value === null || value === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!ledger) return;
    if (selectedIds.length === ledger.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(ledger.map(c => c.customer_id));
    }
  };

  const handleBulkDelete = () => {
    deleteCustomers.mutate(selectedIds);
  };

  // Calculate totals
  const totalOrderValue = ledger?.reduce((sum, c) => sum + (c.total_order_value || 0), 0) || 0;
  const totalPaid = ledger?.reduce((sum, c) => sum + (c.total_paid || 0), 0) || 0;
  const totalBalance = ledger?.reduce((sum, c) => sum + (c.balance_due || 0), 0) || 0;
  const activeOrders = ledger?.reduce((sum, c) => sum + (c.active_orders || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Customer Ledger" 
        description="Track customer orders, payments, and balances"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-10 w-10 text-primary p-2 bg-primary/10 rounded-lg" />
              <div>
                <p className="text-sm text-muted-foreground">Total Order Value</p>
                <p className="text-2xl font-bold">{formatCurrency(totalOrderValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-10 w-10 text-green-500 p-2 bg-green-500/10 rounded-lg" />
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-10 w-10 text-orange-500 p-2 bg-orange-500/10 rounded-lg" />
              <div>
                <p className="text-sm text-muted-foreground">Balance Due</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-10 w-10 text-blue-500 p-2 bg-blue-500/10 rounded-lg" />
              <div>
                <p className="text-sm text-muted-foreground">Active Orders</p>
                <p className="text-2xl font-bold">{activeOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Ledger Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CardTitle>Customer Balances</CardTitle>
                {selectedIds.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setBulkDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete ({selectedIds.length})
                  </Button>
                )}
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {ledgerLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : ledger?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No customer data found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={ledger?.length ? selectedIds.length === ledger.length : false}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Order Value</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger?.map((customer) => (
                      <TableRow 
                        key={customer.customer_id} 
                        className={`cursor-pointer hover:bg-muted/50 ${selectedIds.includes(customer.customer_id) ? 'bg-muted/30' : ''}`}
                        onClick={() => navigate(`/dashboard/customer-ledger/${customer.customer_id}`)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.includes(customer.customer_id)}
                            onCheckedChange={() => toggleSelect(customer.customer_id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{customer.company_name}</div>
                            <div className="text-xs text-muted-foreground">{customer.contact_person}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">
                            {customer.total_orders || 0} total
                          </Badge>
                          {(customer.active_orders || 0) > 0 && (
                            <Badge variant="secondary" className="ml-1 bg-blue-500 text-white">
                              {customer.active_orders} active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(customer.total_order_value)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {formatCurrency(customer.total_paid)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-bold ${(customer.balance_due || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            {formatCurrency(customer.balance_due)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {(customer.balance_due || 0) > 0 ? (
                            <Badge variant="secondary" className="bg-orange-500 text-white">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Balance Due
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-green-500 text-white">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Paid
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments?.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">No recent payments</p>
            ) : (
              <div className="space-y-3">
                {recentPayments?.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{payment.customer?.company_name || '-'}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.order?.order_number || 'General Payment'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        +{formatCurrency(payment.amount, payment.currency || 'USD')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.date), 'MMM d')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} Customers</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} customer(s)? This action cannot be undone and may affect related orders and payments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
