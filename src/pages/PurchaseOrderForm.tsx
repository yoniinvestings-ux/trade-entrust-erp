import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Loader2, Link as LinkIcon, Plus, Trash2, Package, Sparkles, ListPlus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePurchaseOrder, useCreatePurchaseOrder, useUpdatePurchaseOrder, useSuppliers } from '@/hooks/usePurchaseOrders';
import { usePurchaseOrderItems, useSavePurchaseOrderItems, useOrderItems } from '@/hooks/usePurchaseOrderItems';
import { useOrders, useOrder } from '@/hooks/useOrders';
import { ProductPhotoUpload } from '@/components/uploads/ProductPhotoUpload';
import { OrderItemSelectorDialog } from '@/components/orders/OrderItemSelectorDialog';

interface ProductPhoto {
  id: string;
  url: string;
  file_name: string;
  is_main: boolean;
}

const poItemSchema = z.object({
  id: z.string().optional(), // For existing items
  order_item_id: z.string().optional(), // Link to customer order item
  product_name: z.string().min(1, 'Product name is required'),
  product_name_cn: z.string().optional(),
  model_number: z.string().min(1, 'Model number is required'),
  specifications: z.string().optional(),
  specifications_cn: z.string().optional(),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.coerce.number().min(0, 'Price must be positive'),
  remarks: z.string().optional(),
});

const poSchema = z.object({
  order_id: z.string().min(1, 'Linked order is required'),
  supplier_id: z.string().min(1, 'Supplier is required'),
  status: z.string().default('draft'),
  trade_term: z.enum(['EXW', 'FOB', 'CIF', 'DDP', 'DAP']).default('EXW'),
  delivery_date: z.string().optional(),
  currency: z.enum(['USD', 'RMB']).default('USD'),
  factory_payment_currency: z.enum(['USD', 'RMB']).default('RMB'),
  exchange_rate: z.coerce.number().optional(),
  payment_terms: z.string().optional(),
  factory_deposit_amount: z.coerce.number().optional(),
  factory_balance_amount: z.coerce.number().optional(),
  shipping_cost: z.coerce.number().optional(),
  shipping_cost_currency: z.enum(['USD', 'RMB']).default('USD'),
  product_name_cn: z.string().optional(),
  specifications_cn: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(poItemSchema),
});

type POFormValues = z.infer<typeof poSchema>;

export default function PurchaseOrderForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const preselectedOrderId = searchParams.get('orderId');

  const { data: po, isLoading: poLoading } = usePurchaseOrder(id);
  const { data: poItems, isLoading: poItemsLoading } = usePurchaseOrderItems(id);
  const { data: suppliers } = useSuppliers();
  const { data: orders } = useOrders();
  const createPO = useCreatePurchaseOrder();
  const updatePO = useUpdatePurchaseOrder();
  const savePOItems = useSavePurchaseOrderItems();

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(preselectedOrderId);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [showItemSelector, setShowItemSelector] = useState(false);
  const { data: selectedOrder } = useOrder(selectedOrderId || undefined);
  const { data: orderItems } = useOrderItems(selectedOrderId || undefined);

  // State for photos per item
  const [itemPhotos, setItemPhotos] = useState<Record<number, ProductPhoto[]>>({});
  const [isTranslating, setIsTranslating] = useState(false);

  const handleAITranslate = async () => {
    const items = form.getValues('items');
    if (!items || items.length === 0) {
      toast.error('No items to translate. Add products first.');
      return;
    }

    setIsTranslating(true);
    try {
      // Gather product names and specifications
      const productNames = items.map(item => item.product_name).join('\n');
      const specifications = items.map(item => item.specifications || '').filter(Boolean).join('\n---\n');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-to-chinese`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ productNames, specifications }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          toast.error('Translation rate limited. Please try again in a moment.');
          return;
        }
        if (response.status === 402) {
          toast.error('AI credits exhausted. Please add credits to continue.');
          return;
        }
        throw new Error(errorData.error || 'Translation failed');
      }

      const data = await response.json();
      
      // Update the form fields
      if (data.productNamesCn) {
        form.setValue('product_name_cn', data.productNamesCn);
      }
      if (data.specificationsCn) {
        form.setValue('specifications_cn', data.specificationsCn);
      }

      toast.success('Translation complete! Review and edit if needed.');
    } catch (error) {
      console.error('Translation error:', error);
      toast.error(error instanceof Error ? error.message : 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  const form = useForm<POFormValues>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      order_id: preselectedOrderId || '',
      supplier_id: '',
      status: 'draft',
      trade_term: 'EXW',
      delivery_date: '',
      currency: 'RMB',
      factory_payment_currency: 'RMB',
      exchange_rate: 6.8,
      payment_terms: '',
      factory_deposit_amount: undefined,
      factory_balance_amount: undefined,
      shipping_cost: undefined,
      shipping_cost_currency: 'USD',
      product_name_cn: '',
      specifications_cn: '',
      notes: '',
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // Populate form when editing
  useEffect(() => {
    if (po && isEditing) {
      form.reset({
        order_id: po.order_id,
        supplier_id: po.supplier_id,
        status: po.status,
        trade_term: ((po as any).trade_term as 'EXW' | 'FOB' | 'CIF' | 'DDP' | 'DAP') || 'EXW',
        delivery_date: po.delivery_date 
          ? new Date(po.delivery_date).toISOString().split('T')[0] 
          : '',
        currency: (po.currency as 'USD' | 'RMB') || 'RMB',
        factory_payment_currency: ((po as any).factory_payment_currency as 'USD' | 'RMB') || 'RMB',
        exchange_rate: (po as any).exchange_rate || 6.8,
        payment_terms: po.payment_terms || '',
        factory_deposit_amount: (po as any).factory_deposit_amount || undefined,
        factory_balance_amount: (po as any).factory_balance_amount || undefined,
        shipping_cost: (po as any).shipping_cost || undefined,
        shipping_cost_currency: ((po as any).shipping_cost_currency as 'USD' | 'RMB') || 'USD',
        product_name_cn: (po as any).product_name_cn || '',
        specifications_cn: (po as any).specifications_cn || '',
        notes: po.notes || '',
        items: [],
      });
      setSelectedOrderId(po.order_id);
      setSelectedSupplierId(po.supplier_id);
    }
  }, [po, isEditing, form]);

  // Load existing PO items when editing
  useEffect(() => {
    if (poItems && poItems.length > 0 && isEditing) {
      const existingItems = poItems.map(item => ({
        id: item.id,
        order_item_id: item.order_item_id || '',
        product_name: item.product_name,
        product_name_cn: item.product_name_cn || '',
        model_number: item.model_number,
        specifications: item.specifications || '',
        specifications_cn: item.specifications_cn || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        remarks: item.remarks || '',
      }));
      form.setValue('items', existingItems);
    }
  }, [poItems, isEditing, form]);

  // Handle adding items from the order item selector dialog
  const handleAddItemsFromOrder = (items: any[]) => {
    // Get supplier's preferred currency if selected
    const supplier = suppliers?.find(s => s.id === selectedSupplierId);
    const preferredCurrency = (supplier as any)?.preferred_currency || 'RMB';
    
    // Set PO currency to match supplier preference if not already set
    if (!form.getValues('currency') || form.getValues('currency') === 'USD') {
      form.setValue('currency', preferredCurrency as 'USD' | 'RMB');
      form.setValue('factory_payment_currency', preferredCurrency as 'USD' | 'RMB');
    }

    // Add items to the form
    items.forEach((item, idx) => {
      append({
        order_item_id: item.id,
        product_name: item.product_name,
        product_name_cn: '',
        model_number: item.model_number,
        specifications: item.specifications || '',
        specifications_cn: '',
        quantity: item.quantity,
        unit_price: 0, // Factory price needs to be entered
        remarks: item.remarks || '',
      });

      // Copy photos to item photos state
      if (item.product_photos && item.product_photos.length > 0) {
        const currentIndex = fields.length + idx;
        setItemPhotos(prev => ({
          ...prev,
          [currentIndex]: item.product_photos.map((p: any) => ({
            id: p.id,
            url: p.url,
            file_name: p.file_name,
            is_main: p.is_main || false,
          })),
        }));
      }
    });

    toast.success(`Added ${items.length} item(s) from order`);
  };

  const watchedItems = form.watch('items');
  const watchedCurrency = form.watch('currency');
  const watchedExchangeRate = form.watch('exchange_rate');
  
  const totalValue = watchedItems.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0),
    0
  );
  
  // Convert PO total to USD for profit calculations
  const convertToUSD = (value: number, currency: string, exchangeRate?: number) => {
    if (currency === 'USD') return value;
    // RMB to USD: divide by exchange rate
    const rate = exchangeRate || 6.8;
    return value / rate;
  };
  
  const totalValueInUSD = convertToUSD(totalValue, watchedCurrency, watchedExchangeRate);

  const handleItemPhotosChange = (index: number, photos: ProductPhoto[]) => {
    setItemPhotos(prev => ({ ...prev, [index]: photos }));
  };

  const onSubmit = async (data: POFormValues) => {
    const poData = {
      order_id: data.order_id,
      supplier_id: data.supplier_id,
      status: data.status,
      trade_term: data.trade_term,
      delivery_date: data.delivery_date || null,
      currency: data.currency,
      factory_payment_currency: data.factory_payment_currency,
      exchange_rate: data.exchange_rate || null,
      total_value: totalValue,
      payment_terms: data.payment_terms || null,
      factory_deposit_amount: data.factory_deposit_amount || 0,
      factory_balance_amount: data.factory_balance_amount || 0,
      shipping_cost: data.shipping_cost || 0,
      shipping_cost_currency: data.shipping_cost_currency,
      product_name_cn: data.product_name_cn || null,
      specifications_cn: data.specifications_cn || null,
      notes: data.notes || null,
    };
    
    try {
      let poId = id;
      
      if (isEditing) {
        await updatePO.mutateAsync({ id, ...poData });
      } else {
        const newPO = await createPO.mutateAsync(poData as any);
        poId = newPO.id;
      }
      
      // Save PO items
      if (poId) {
        await savePOItems.mutateAsync({
          poId,
          items: data.items.map(item => ({
            purchase_order_id: poId!,
            order_item_id: item.order_item_id || null,
            product_name: item.product_name,
            product_name_cn: item.product_name_cn || null,
            model_number: item.model_number,
            specifications: item.specifications || null,
            specifications_cn: item.specifications_cn || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            remarks: item.remarks || null,
          })),
        });
      }
      
      navigate('/dashboard/purchase-orders');
    } catch (error) {
      console.error('Failed to save PO:', error);
    }
  };

  const formatCurrency = (value: number | null | undefined, currency: string | null | undefined) => {
    if (!value) return currency === 'RMB' ? '¥0.00' : '$0.00';
    return new Intl.NumberFormat(currency === 'RMB' ? 'zh-CN' : 'en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(value);
  };

  if (poLoading && isEditing) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/purchase-orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? `Edit ${po?.po_number}` : 'New Purchase Order'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update purchase order details' : 'Create a new supplier purchase order'}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Linked Order */}
          <Card>
            <CardHeader>
              <CardTitle>Linked Customer Order</CardTitle>
              <CardDescription>Select the customer order this PO is for - items will be copied automatically</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="order_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Order *</FormLabel>
                    {isEditing ? (
                      <>
                        {/* Keep the actual order_id value registered in the form */}
                        <Input type="hidden" {...field} />
                        <FormControl>
                          <Input
                            value={po?.order?.order_number ? `${po.order.order_number} — ${po.order.customer?.company_name || ''}` : '—'}
                            readOnly
                            aria-readonly="true"
                          />
                        </FormControl>
                      </>
                    ) : (
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedOrderId(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer order" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {orders?.map((order) => (
                            <SelectItem key={order.id} value={order.id}>
                              {order.order_number} - {order.customer?.company_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedOrder && (
                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono font-medium">{selectedOrder.order_number}</span>
                    <Badge variant="secondary">{selectedOrder.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Customer</p>
                      <p className="font-medium">{selectedOrder.customer?.company_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Order Total (USD)</p>
                      <p className="font-medium">{formatCurrency(selectedOrder.total_value, 'USD')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Items</p>
                      <p className="font-medium">{selectedOrder.order_items?.length || 0} products</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Current Margin</p>
                      <p className={`font-medium ${(selectedOrder.profit_margin || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedOrder.profit_margin?.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* PO Details */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase Order Details</CardTitle>
              <CardDescription>Supplier and order information</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="supplier_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier *</FormLabel>
                    {isEditing ? (
                      <>
                        {/* Keep the actual supplier_id value registered in the form */}
                        <Input type="hidden" {...field} />
                        <FormControl>
                          <Input
                            value={po?.supplier?.supplier_name || '—'}
                            readOnly
                            aria-readonly="true"
                          />
                        </FormControl>
                      </>
                    ) : (
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedSupplierId(value);
                          // Clear items when supplier changes
                          form.setValue('items', []);
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers?.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.supplier_name} ({(supplier as any).preferred_currency || 'RMB'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trade_term"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trade Terms (Incoterms)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select trade term" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EXW">EXW (Ex Works)</SelectItem>
                        <SelectItem value="FOB">FOB (Free On Board)</SelectItem>
                        <SelectItem value="CIF">CIF (Cost, Insurance & Freight)</SelectItem>
                        <SelectItem value="DDP">DDP (Delivered Duty Paid)</SelectItem>
                        <SelectItem value="DAP">DAP (Delivered At Place)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="delivery_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Delivery Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PO Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="RMB">RMB (¥)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Product pricing currency</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="factory_payment_currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Factory Payment Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="RMB">RMB (¥)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Currency for factory payments</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Exchange Rate - Show when PO currency is RMB (orders are in USD) */}
              {watchedCurrency === 'RMB' && (
                <FormField
                  control={form.control}
                  name="exchange_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exchange Rate (RMB to USD)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0.01"
                          placeholder="6.80"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>1 USD = X RMB (e.g., 6.8)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="payment_terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Terms</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 30% deposit, 70% before shipping" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Factory Payment Section */}
          <Card>
            <CardHeader>
              <CardTitle>Factory Payment Details</CardTitle>
              <CardDescription>Track deposit, balance, and shipping cost payments to factory</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="factory_deposit_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Factory Deposit Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>Deposit to factory</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="factory_balance_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Factory Balance Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>Balance before shipping</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shipping_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping Cost</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shipping_cost_currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping Cost Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="RMB">RMB (¥)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Chinese Translation Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Chinese Translation (中文翻译)</CardTitle>
                <CardDescription>Product name and specifications in Chinese for PO documents</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleAITranslate}
                disabled={isTranslating || fields.length === 0}
              >
                {isTranslating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {isTranslating ? 'Translating...' : 'AI Translate'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Add products first to enable AI translation
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="product_name_cn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name (产品名称)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="中文产品名称 - Click 'AI Translate' to auto-generate"
                          className="resize-none min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specifications_cn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specifications (规格)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="中文规格说明 - Click 'AI Translate' to auto-generate"
                          className="resize-none min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional notes for this PO..."
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* PO Items - Same as Customer Order */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Products (Supplier Pricing)</CardTitle>
                <CardDescription>Items from customer order - enter supplier prices in {watchedCurrency}</CardDescription>
              </div>
              <div className="flex gap-2">
                {!isEditing && selectedOrderId && orderItems && orderItems.length > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowItemSelector(true)}
                  >
                    <ListPlus className="mr-2 h-4 w-4" />
                    Add from Order ({orderItems.length})
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({
                    product_name: '',
                    model_number: '',
                    specifications: '',
                    quantity: 1,
                    unit_price: 0,
                    remarks: '',
                  })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {fields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  {selectedOrderId && orderItems && orderItems.length > 0 ? (
                    <div>
                      <p className="mb-2">Order has {orderItems.length} item(s) available</p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowItemSelector(true)}
                      >
                        <ListPlus className="mr-2 h-4 w-4" />
                        Add Items from Order
                      </Button>
                    </div>
                  ) : (
                    <p>Select a customer order to add items, or add manually</p>
                  )}
                </div>
              ) : (
                fields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Item #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Product Photos */}
                    <ProductPhotoUpload
                      orderItemId={`po-${id || 'new'}-${index}`}
                      photos={itemPhotos[index] || []}
                      onPhotosChange={(photos) => handleItemPhotosChange(index, photos)}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name={`items.${index}.product_name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Name *</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.model_number`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Model Number *</FormLabel>
                            <FormControl>
                              <Input className="font-mono" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity *</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.unit_price`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Price ({watchedCurrency}) *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.01"
                                placeholder="0.00"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.specifications`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Specifications</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Detailed specifications..."
                                className="resize-none min-h-[60px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.remarks`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Remarks</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Additional notes..."
                                className="resize-none min-h-[60px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end pt-2 border-t">
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground">Line Total: </span>
                        <span className="font-bold text-lg">
                          {formatCurrency(
                            (watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unit_price || 0),
                            watchedCurrency
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {fields.length > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-end gap-6">
                    <div className="text-right">
                      <span className="text-muted-foreground">PO Total: </span>
                      <span className="text-2xl font-bold">{formatCurrency(totalValue, watchedCurrency)}</span>
                    </div>
                    {watchedCurrency === 'RMB' && watchedExchangeRate && (
                      <div className="text-right">
                        <span className="text-muted-foreground">≈ in USD: </span>
                        <span className="text-2xl font-bold text-muted-foreground">{formatCurrency(totalValueInUSD, 'USD')}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Margin Preview */}
          {selectedOrder && (
            <Card>
              <CardHeader>
                <CardTitle>Profit Margin Preview</CardTitle>
                <CardDescription>
                  How this PO affects the order's profit margin 
                  {watchedCurrency === 'RMB' && watchedExchangeRate && 
                    ` (Rate: 1 USD = ${watchedExchangeRate} RMB)`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const poTotalInUSD = totalValueInUSD;
                  const orderTotal = selectedOrder.total_value || 0;
                  
                  // Convert existing POs to USD based on their currencies
                  const existingPOsInUSD = selectedOrder.purchase_orders
                    ?.filter(p => isEditing ? p.id !== id : true)
                    ?.reduce((sum, p) => {
                      const poValue = p.total_value || 0;
                      const poCurrency = (p as any).currency || 'USD';
                      const poRate = (p as any).exchange_rate || 6.8;
                      // Convert to USD if currency is RMB
                      const valueInUSD = poCurrency === 'RMB' ? poValue / poRate : poValue;
                      return sum + valueInUSD;
                    }, 0) || 0;
                  
                  const newSupplierTotalInUSD = existingPOsInUSD + poTotalInUSD;
                  const newProfit = orderTotal - newSupplierTotalInUSD;
                  const newMargin = orderTotal > 0 ? (newProfit / orderTotal) * 100 : 0;

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Order Total (USD)</p>
                        <p className="text-lg font-medium">{formatCurrency(orderTotal, 'USD')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">This PO ({watchedCurrency})</p>
                        <p className="text-lg font-medium">{formatCurrency(totalValue, watchedCurrency)}</p>
                        {watchedCurrency === 'RMB' && (
                          <p className="text-xs text-muted-foreground">≈ {formatCurrency(poTotalInUSD, 'USD')}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Cost (USD)</p>
                        <p className="text-lg font-medium">{formatCurrency(newSupplierTotalInUSD, 'USD')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated Profit</p>
                        <p className={`text-lg font-medium ${newProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(newProfit, 'USD')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Margin %</p>
                        <p className={`text-lg font-medium ${newMargin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {newMargin.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard/purchase-orders')}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={createPO.isPending || updatePO.isPending}
            >
              {(createPO.isPending || updatePO.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? 'Update PO' : 'Create PO'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Order Item Selector Dialog */}
      <OrderItemSelectorDialog
        open={showItemSelector}
        onOpenChange={setShowItemSelector}
        orderItems={orderItems || []}
        onAddItems={handleAddItemsFromOrder}
        currency={selectedOrder?.currency || 'USD'}
      />
    </div>
  );
}
