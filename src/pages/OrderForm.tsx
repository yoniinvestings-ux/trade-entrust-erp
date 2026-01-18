import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, Trash2, Package, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useOrder, useCreateOrder, useUpdateOrder, useCustomers } from '@/hooks/useOrders';
import { useSuppliers } from '@/hooks/usePurchaseOrders';
import { useAuth } from '@/lib/auth';
import { ProductPhotoUpload } from '@/components/uploads/ProductPhotoUpload';
import { DesignFileUpload } from '@/components/uploads/DesignFileUpload';

interface ProductPhoto {
  id: string;
  url: string;
  file_name: string;
  is_main: boolean;
}

interface ProjectFile {
  id: string;
  url: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  uploaded_at?: string;
}

const orderItemSchema = z.object({
  id: z.string().optional(),
  product_name: z.string().min(1, 'Product name is required'),
  model_number: z.string().min(1, 'Model number is required'),
  product_number: z.string().optional(),
  specifications: z.string().optional(),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unit_price: z.coerce.number().min(0, 'Price must be positive'),
  cartons: z.coerce.number().optional(),
  gross_weight_kg: z.coerce.number().optional(),
  cbm: z.coerce.number().optional(),
  remarks: z.string().optional(),
  supplier_id: z.string().optional(), // Supplier for this item
});

const orderSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  status: z.string().default('draft'),
  trade_term: z.enum(['EXW', 'FOB', 'CIF', 'DDP', 'DAP']).default('EXW'),
  delivery_date: z.string().optional(),
  factory_lead_days: z.coerce.number().optional(),
  customer_lead_days: z.coerce.number().optional(),
  estimated_ship_date: z.string().optional(),
  estimated_delivery_date: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'At least one product is required'),
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function OrderForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = !!id;
  
  // Get state from navigation (when converting from quotation)
  const quotationState = location.state as {
    fromQuotation?: string;
    customerId?: string;
    leadId?: string;
    quotationItems?: any[];
    tradeTerm?: string;
    currency?: string;
    sourcingProjectId?: string;
  } | null;
  
  const { user } = useAuth();
  const { data: order, isLoading: orderLoading } = useOrder(id);
  const { data: customers, isLoading: customersLoading } = useCustomers();
  const { data: suppliers } = useSuppliers();
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();

  // State for photos and files per item
  const [itemPhotos, setItemPhotos] = useState<Record<number, ProductPhoto[]>>({});
  const [designFiles, setDesignFiles] = useState<ProjectFile[]>([]);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customer_id: '',
      status: 'draft',
      trade_term: 'EXW',
      delivery_date: '',
      factory_lead_days: undefined,
      customer_lead_days: undefined,
      estimated_ship_date: '',
      estimated_delivery_date: '',
      notes: '',
      items: [
        {
          product_name: '',
          model_number: '',
          product_number: '',
          specifications: '',
          quantity: 1,
          unit_price: 0,
          cartons: undefined,
          gross_weight_kg: undefined,
          cbm: undefined,
          remarks: '',
          supplier_id: '',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // Populate form when editing
  useEffect(() => {
    if (order && isEditing) {
      form.reset({
        customer_id: order.customer_id,
        status: order.status,
        trade_term: (order as any).trade_term || 'EXW',
        delivery_date: order.delivery_date 
          ? new Date(order.delivery_date).toISOString().split('T')[0] 
          : '',
        factory_lead_days: order.factory_lead_days || undefined,
        customer_lead_days: order.customer_lead_days || undefined,
        estimated_ship_date: order.estimated_ship_date 
          ? new Date(order.estimated_ship_date).toISOString().split('T')[0] 
          : '',
        estimated_delivery_date: order.estimated_delivery_date 
          ? new Date(order.estimated_delivery_date).toISOString().split('T')[0] 
          : '',
        notes: order.notes || '',
        items: order.order_items?.map(item => ({
          id: item.id,
          product_name: item.product_name,
          model_number: item.model_number,
          product_number: (item as any).product_number || '',
          specifications: item.specifications || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          cartons: (item as any).cartons || undefined,
          gross_weight_kg: (item as any).gross_weight_kg || undefined,
          cbm: (item as any).cbm || undefined,
          remarks: item.remarks || '',
          supplier_id: (item as any).supplier_id || '',
        })) || [],
      });

      // Load existing photos for each item
      const photosMap: Record<number, ProductPhoto[]> = {};
      order.order_items?.forEach((item, index) => {
        if (item.product_photos && item.product_photos.length > 0) {
          photosMap[index] = item.product_photos.map(p => ({
            id: p.id,
            url: p.url,
            file_name: p.file_name,
            is_main: p.is_main || false,
          }));
        }
      });
      setItemPhotos(photosMap);
    }
  }, [order, isEditing, form]);

  // Populate form when converting from quotation
  useEffect(() => {
    if (!isEditing && quotationState?.fromQuotation && quotationState?.quotationItems) {
      const items = quotationState.quotationItems;
      const customerId = quotationState.customerId;
      const tradeTerm = quotationState.tradeTerm || 'EXW';

      form.reset({
        customer_id: customerId || '',
        status: 'draft',
        trade_term: tradeTerm as any,
        delivery_date: '',
        factory_lead_days: undefined,
        customer_lead_days: undefined,
        estimated_ship_date: '',
        estimated_delivery_date: '',
        notes: '',
        items: items.length > 0 ? items.map((item: any) => ({
          product_name: item.product_name || '',
          model_number: item.model_number || '',
          product_number: '',
          specifications: item.specifications || '',
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          cartons: undefined,
          gross_weight_kg: undefined,
          cbm: undefined,
          remarks: item.remarks || '',
          supplier_id: item.supplier_id || '',
        })) : [{
          product_name: '',
          model_number: '',
          product_number: '',
          specifications: '',
          quantity: 1,
          unit_price: 0,
          cartons: undefined,
          gross_weight_kg: undefined,
          cbm: undefined,
          remarks: '',
          supplier_id: '',
        }],
      });

      // Load photos from quotation items
      const photosMap: Record<number, ProductPhoto[]> = {};
      items.forEach((item: any, index: number) => {
        if (item.photos && Array.isArray(item.photos) && item.photos.length > 0) {
          photosMap[index] = item.photos.map((p: any) => ({
            id: p.id || crypto.randomUUID(),
            url: p.url,
            file_name: p.file_name || 'photo',
            is_main: p.is_main || false,
          }));
        }
      });
      if (Object.keys(photosMap).length > 0) {
        setItemPhotos(photosMap);
      }
    }
  }, [quotationState, isEditing, form]);

  const watchedItems = form.watch('items');
  const totalValue = watchedItems.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0),
    0
  );

  const handleItemPhotosChange = (index: number, photos: ProductPhoto[]) => {
    setItemPhotos(prev => ({ ...prev, [index]: photos }));
  };

  const onSubmit = async (data: OrderFormValues) => {
    const orderData = {
      customer_id: data.customer_id,
      status: data.status,
      trade_term: data.trade_term,
      delivery_date: data.delivery_date || null,
      factory_lead_days: data.factory_lead_days || null,
      customer_lead_days: data.customer_lead_days || null,
      estimated_ship_date: data.estimated_ship_date || null,
      estimated_delivery_date: data.estimated_delivery_date || null,
      currency: 'USD', // Always USD for customer orders
      notes: data.notes || null,
      total_value: totalValue,
      created_by: user?.id,
    };

    const items = data.items.map((item) => ({
      id: item.id, // Include existing item ID for smart update
      product_name: item.product_name,
      model_number: item.model_number,
      product_number: item.product_number || null,
      specifications: item.specifications || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
      cartons: item.cartons || null,
      gross_weight_kg: item.gross_weight_kg || null,
      cbm: item.cbm || null,
      remarks: item.remarks || null,
      supplier_id: item.supplier_id || null,
      order_id: id || '',
    }));

    if (isEditing) {
      await updateOrder.mutateAsync({ 
        id, 
        ...orderData, 
        items: items as any,
        itemPhotos, // Pass photos to be persisted
      });
    } else {
      await createOrder.mutateAsync({ 
        ...orderData, 
        items: items as any,
        itemPhotos, // Pass photos to be persisted
      });
    }
    
    navigate('/dashboard/orders');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  if (orderLoading && isEditing) {
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
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/orders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? `Edit Order ${order?.order_number}` : 'New Order'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update order details and products' : 'Create a new customer order'}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
              <CardDescription>Basic order information and customer selection (Currency: USD)</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer *</FormLabel>
                    {isEditing ? (
                      <>
                        {/* Keep the actual customer_id value registered in the form */}
                        <Input type="hidden" {...field} />
                        <FormControl>
                          <Input
                            value={order?.customer?.company_name || '—'}
                            readOnly
                            aria-readonly="true"
                          />
                        </FormControl>
                      </>
                    ) : (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers?.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.company_name}
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
                        <SelectItem value="sample_before_production">Sample</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="qc">QC</SelectItem>
                        <SelectItem value="shipping">Shipping</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
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
                    <FormLabel>Delivery Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2 lg:col-span-3">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional notes for this order..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Design Files */}
          <Card>
            <CardHeader>
              <CardTitle>Design Files</CardTitle>
              <CardDescription>Upload project design files (AI, PSD, PDF, etc.)</CardDescription>
            </CardHeader>
            <CardContent>
              <DesignFileUpload
                orderId={id}
                files={designFiles}
                onFilesChange={setDesignFiles}
              />
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Products</CardTitle>
                <CardDescription>Add products with photos, model numbers, and specifications</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => append({
                  product_name: '',
                  model_number: '',
                  product_number: '',
                  specifications: '',
                  quantity: 1,
                  unit_price: 0,
                  cartons: undefined,
                  gross_weight_kg: undefined,
                  cbm: undefined,
                  remarks: '',
                  supplier_id: '',
                })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {fields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No products added yet</p>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => append({
                      product_name: '',
                      model_number: '',
                      product_number: '',
                      specifications: '',
                      quantity: 1,
                      unit_price: 0,
                      cartons: undefined,
                      gross_weight_kg: undefined,
                      cbm: undefined,
                      remarks: '',
                      supplier_id: '',
                    })}
                  >
                    Add your first product
                  </Button>
                </div>
              ) : (
                fields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Product #{index + 1}</h4>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            remove(index);
                            // Clean up photos for removed item
                            setItemPhotos(prev => {
                              const newPhotos = { ...prev };
                              delete newPhotos[index];
                              return newPhotos;
                            });
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Product Photos */}
                    <ProductPhotoUpload
                      orderItemId={watchedItems[index]?.id || `new-${index}`}
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
                              <Input placeholder="e.g. LED Flashlight" {...field} />
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
                              <Input 
                                placeholder="e.g. FL-2024-A" 
                                className="font-mono"
                                {...field} 
                              />
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
                            <FormLabel>Unit Price (USD) *</FormLabel>
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
                                placeholder="Detailed product specifications..."
                                className="resize-none min-h-[80px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Packing Details Section */}
                      <div className="md:col-span-4 pt-2">
                        <p className="text-sm font-medium text-muted-foreground mb-3">Packing Details (for Packing List)</p>
                      </div>

                      <FormField
                        control={form.control}
                        name={`items.${index}.product_number`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Number (PN)</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. PN-001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.cartons`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cartons (CTNS)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                placeholder="e.g. 10"
                                {...field} 
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.gross_weight_kg`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gross Weight (KGS)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.01"
                                placeholder="e.g. 150.5"
                                {...field} 
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.cbm`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Volume (CBM)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.001"
                                placeholder="e.g. 2.5"
                                {...field} 
                                value={field.value ?? ''}
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

                      <FormField
                        control={form.control}
                        name={`items.${index}.supplier_id`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Supplier (Factory)</FormLabel>
                            <Select 
                              onValueChange={(val) => field.onChange(val === 'none' ? '' : val)} 
                              value={field.value || 'none'}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select supplier for this item" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">No supplier assigned</SelectItem>
                                {suppliers?.map((supplier) => (
                                  <SelectItem key={supplier.id} value={supplier.id}>
                                    {supplier.supplier_name} ({(supplier as any).preferred_currency || 'RMB'})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                            (watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unit_price || 0)
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
                  <div className="flex justify-end">
                    <div className="text-right">
                      <span className="text-muted-foreground">Order Total: </span>
                      <span className="text-2xl font-bold">{formatCurrency(totalValue)}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard/orders')}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={createOrder.isPending || updateOrder.isPending}
            >
              {(createOrder.isPending || updateOrder.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? 'Update Order' : 'Create Order'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
