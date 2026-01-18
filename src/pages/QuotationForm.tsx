import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Plus, Trash2, Save, ImageIcon } from 'lucide-react';
import { ProductPhotoUpload, ProductPhoto } from '@/components/uploads/ProductPhotoUpload';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface QuotationItem {
  id?: string;
  product_name: string;
  model_number: string;
  specifications: string;
  quantity: number;
  unit_price: number;
  lead_time_days: number | null;
  remarks: string;
  sourcing_item_id?: string | null;
  supplier_id?: string | null;
  photos?: any[];
}

const TRADE_TERMS = ['EXW', 'FOB', 'CIF', 'DDP', 'DAP'];

export default function QuotationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const leadIdParam = searchParams.get('lead');
  const customerIdParam = searchParams.get('customer');
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [form, setForm] = useState({
    lead_id: (leadIdParam as string | null) ?? null,
    customer_id: (customerIdParam as string | null) ?? null,
    sourcing_project_id: projectId,
    currency: 'USD',
    trade_term: 'FOB',
    valid_until: '',
    notes: '',
  });

  const [items, setItems] = useState<QuotationItem[]>([{
    product_name: '',
    model_number: '',
    specifications: '',
    quantity: 1,
    unit_price: 0,
    lead_time_days: null,
    remarks: '',
    photos: [],
  }]);
  const [photoDialogIndex, setPhotoDialogIndex] = useState<number | null>(null);

  // Fetch existing quotation
  const { data: quotation, isLoading: quotationLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          quotation_items(*)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  // Fetch sourcing project meta (lead) to keep selection stable when coming from Sourcing
  const { data: sourcingProjectMeta } = useQuery({
    queryKey: ['sourcing-project-meta-for-quotation', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sourcing_projects')
        .select('id, lead_id')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !isEditing,
  });

  useEffect(() => {
    if (!isEditing && sourcingProjectMeta) {
      setForm((prev) => {
        // Don't override if user already selected something or query params already provided it
        if (prev.lead_id || prev.customer_id) return prev;

        return {
          ...prev,
          lead_id: sourcingProjectMeta.lead_id ?? null,
        };
      });
    }
  }, [isEditing, sourcingProjectMeta]);

  // Fetch sourcing project items if linked (with photos)
  const { data: sourcingItems } = useQuery({
    queryKey: ['sourcing-items-for-quotation', projectId],
    queryFn: async () => {
      const { data: itemsData, error } = await supabase
        .from('sourcing_items')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at');
      if (error) throw error;

      // Fetch photos for all items
      if (itemsData && itemsData.length > 0) {
        const itemIds = itemsData.map((item) => item.id);
        const { data: photosData } = await supabase
          .from('product_photos')
          .select('*')
          .in('sourcing_item_id', itemIds);

        // Attach photos to each item
        return itemsData.map((item) => ({
          ...item,
          photos: photosData?.filter((p) => p.sourcing_item_id === item.id) || [],
        }));
      }

      return itemsData || [];
    },
    enabled: !!projectId && !isEditing,
  });

  // Fetch leads and customers
  const { data: leads } = useQuery({
    queryKey: ['leads-for-quotation'],
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('id, company_name, contact_person').order('company_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-for-quotation'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('id, company_name, contact_person').order('company_name');
      if (error) throw error;
      return data;
    },
  });

  // Initialize form with existing data or sourcing items
  useEffect(() => {
    if (quotation) {
      setForm({
        lead_id: quotation.lead_id,
        customer_id: quotation.customer_id,
        sourcing_project_id: quotation.sourcing_project_id,
        currency: quotation.currency || 'USD',
        trade_term: quotation.trade_term || 'FOB',
        valid_until: quotation.valid_until?.split('T')[0] || '',
        notes: quotation.notes || '',
      });
      if (quotation.quotation_items?.length > 0) {
        setItems(quotation.quotation_items.map((item: any) => ({
          id: item.id,
          product_name: item.product_name,
          model_number: item.model_number || '',
          specifications: item.specifications || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          lead_time_days: item.lead_time_days,
          remarks: item.remarks || '',
          sourcing_item_id: item.sourcing_item_id,
        })));
      }
    }
  }, [quotation]);

  useEffect(() => {
    if (sourcingItems && sourcingItems.length > 0 && !isEditing) {
      setItems(sourcingItems.map((item: any) => ({
        product_name: item.product_name,
        model_number: item.model_number || '',
        specifications: item.specifications || '',
        quantity: item.target_quantity || 1,
        unit_price: item.target_price || 0,
        lead_time_days: item.lead_time_days,
        remarks: item.remarks || '',
        sourcing_item_id: item.id,
        supplier_id: item.supplier_id || null,
        photos: item.photos || [],
      })));
    }
  }, [sourcingItems, isEditing]);

  const createQuotation = useMutation({
    mutationFn: async () => {
      // Generate quotation number
      const { data: quotationNumber } = await supabase.rpc('generate_quotation_number');
      
      // Calculate total
      const total_value = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      // Create quotation
      const { data: newQuotation, error: quotationError } = await supabase
        .from('quotations')
        .insert({
          quotation_number: quotationNumber,
          lead_id: form.lead_id,
          customer_id: form.customer_id,
          sourcing_project_id: form.sourcing_project_id,
          currency: form.currency,
          trade_term: form.trade_term as any,
          valid_until: form.valid_until || null,
          notes: form.notes,
          total_value,
          status: 'draft',
        })
        .select()
        .single();
      
      if (quotationError) throw quotationError;

      // Create items with photos JSONB
      const itemsToInsert = items.filter(item => item.product_name).map(item => ({
        quotation_id: newQuotation.id,
        product_name: item.product_name,
        model_number: item.model_number || null,
        specifications: item.specifications || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        lead_time_days: item.lead_time_days,
        remarks: item.remarks || null,
        sourcing_item_id: item.sourcing_item_id || null,
        supplier_id: item.supplier_id || null,
        photos: item.photos ? JSON.stringify(item.photos.map((p: any) => ({
          id: p.id,
          url: p.url,
          file_name: p.file_name,
          is_main: p.is_main || false,
        }))) : '[]',
      }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase.from('quotation_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      return newQuotation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation created');
      navigate(`/dashboard/quotations/${data.id}`);
    },
    onError: (error) => toast.error('Failed to create quotation: ' + error.message),
  });

  const updateQuotation = useMutation({
    mutationFn: async () => {
      const total_value = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      const { error: quotationError } = await supabase
        .from('quotations')
        .update({
          lead_id: form.lead_id,
          customer_id: form.customer_id,
          currency: form.currency,
          trade_term: form.trade_term as any,
          valid_until: form.valid_until || null,
          notes: form.notes,
          total_value,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      
      if (quotationError) throw quotationError;

      // Delete existing items and recreate
      await supabase.from('quotation_items').delete().eq('quotation_id', id);

      const itemsToInsert = items.filter(item => item.product_name).map(item => ({
        quotation_id: id,
        product_name: item.product_name,
        model_number: item.model_number || null,
        specifications: item.specifications || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        lead_time_days: item.lead_time_days,
        remarks: item.remarks || null,
        sourcing_item_id: item.sourcing_item_id || null,
        supplier_id: item.supplier_id || null,
        photos: item.photos ? JSON.stringify(item.photos.map((p: any) => ({
          id: p.id,
          url: p.url,
          file_name: p.file_name,
          is_main: p.is_main || false,
        }))) : '[]',
      }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase.from('quotation_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      toast.success('Quotation updated');
      navigate(`/dashboard/quotations/${id}`);
    },
    onError: (error) => toast.error('Failed to update quotation: ' + error.message),
  });

  const handleAddItem = () => {
    setItems([...items, {
      product_name: '',
      model_number: '',
      specifications: '',
      quantity: 1,
      unit_price: 0,
      lead_time_days: null,
      remarks: '',
      photos: [],
    }]);
  };

  const handlePhotosChange = (index: number, photos: ProductPhoto[]) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], photos };
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof QuotationItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = () => {
    if (isEditing) {
      updateQuotation.mutate();
    } else {
      createQuotation.mutate();
    }
  };

  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  if (quotationLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/quotations')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader 
          title={isEditing ? 'Edit Quotation' : 'New Quotation'} 
          description={isEditing ? `Editing ${quotation?.quotation_number}` : 'Create a new customer quotation'}
        />
      </div>

      {/* Quotation Details */}
      <Card>
        <CardHeader>
          <CardTitle>Quotation Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select 
                value={form.customer_id || 'none'} 
                onValueChange={(v) => setForm({ ...form, customer_id: v === 'none' ? null : v, lead_id: null })}
              >
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No customer</SelectItem>
                  {customers?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Or Lead</Label>
              <Select 
                value={form.lead_id || 'none'} 
                onValueChange={(v) => setForm({ ...form, lead_id: v === 'none' ? null : v, customer_id: null })}
              >
                <SelectTrigger><SelectValue placeholder="Select lead" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No lead</SelectItem>
                  {leads?.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valid Until</Label>
              <Input
                type="date"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="CNY">CNY</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Trade Term</Label>
              <Select value={form.trade_term} onValueChange={(v) => setForm({ ...form, trade_term: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRADE_TERMS.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional terms, conditions, or notes..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quotation Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Quotation Items</CardTitle>
          <Button variant="outline" onClick={handleAddItem}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Model #</TableHead>
                <TableHead className="w-[160px]">Product Name</TableHead>
                <TableHead className="w-[80px]">Photo</TableHead>
                <TableHead>Specifications</TableHead>
                <TableHead className="w-[70px]">Qty</TableHead>
                <TableHead className="w-[90px]">Unit Price</TableHead>
                <TableHead className="w-[90px]">Total</TableHead>
                <TableHead className="w-[70px]">Lead Days</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      value={item.model_number}
                      onChange={(e) => handleItemChange(index, 'model_number', e.target.value)}
                      placeholder="Model #"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.product_name}
                      onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                      placeholder="Product name"
                    />
                  </TableCell>
                  <TableCell>
                    <Dialog open={photoDialogIndex === index} onOpenChange={(open) => setPhotoDialogIndex(open ? index : null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="relative h-12 w-12 p-0">
                          {item.photos && item.photos.length > 0 ? (
                            <>
                              <img 
                                src={item.photos.find(p => p.is_main)?.url || item.photos[0]?.url} 
                                alt="Product" 
                                className="w-full h-full object-cover rounded"
                              />
                              {item.photos.length > 1 && (
                                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                                  {item.photos.length}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                          )}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Product Photos</DialogTitle>
                        </DialogHeader>
                        <ProductPhotoUpload
                          photos={(item.photos as ProductPhoto[]) || []}
                          onPhotosChange={(photos) => handlePhotosChange(index, photos)}
                          maxPhotos={5}
                          label="Upload photos for this product"
                        />
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.specifications}
                      onChange={(e) => handleItemChange(index, 'specifications', e.target.value)}
                      placeholder="Specs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                      min={1}
                      className="w-16"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))}
                      min={0}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: form.currency }).format(item.quantity * item.unit_price)}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.lead_time_days || ''}
                      onChange={(e) => handleItemChange(index, 'lead_time_days', e.target.value ? Number(e.target.value) : null)}
                      placeholder="Days"
                      className="w-16"
                    />
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end mt-4 pt-4 border-t">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: form.currency }).format(totalValue)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => navigate('/dashboard/quotations')}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={items.every(i => !i.product_name)}>
          <Save className="h-4 w-4 mr-2" />
          {isEditing ? 'Update Quotation' : 'Create Quotation'}
        </Button>
      </div>
    </div>
  );
}
