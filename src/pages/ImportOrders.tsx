import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, ChevronRight, ChevronDown, Check, AlertTriangle, X, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useCustomers } from '@/hooks/useOrders';
import { useSuppliers } from '@/hooks/usePurchaseOrders';
import { useImportOrders, ParsedOrder, ParsedOrderItem } from '@/hooks/useImportOrders';
import { cn } from '@/lib/utils';

type Step = 'upload' | 'preview' | 'customers' | 'import';

interface CustomerMatch {
  excelName: string;
  matchedId: string | null;
  matchType: 'exact' | 'fuzzy' | 'new' | 'none';
  createNew: boolean;
}

export default function ImportOrders() {
  const [step, setStep] = useState<Step>('upload');
  const [parsedOrders, setParsedOrders] = useState<ParsedOrder[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [customerMatches, setCustomerMatches] = useState<Map<string, CustomerMatch>>(new Map());
  const [importProgress, setImportProgress] = useState(0);

  const { data: customers = [] } = useCustomers();
  const { data: suppliers = [] } = useSuppliers();
  const importMutation = useImportOrders();

  // Parse Excel file
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // First, get raw data to find the actual header row
        let jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          defval: '',
          raw: false // Convert all values to strings for easier parsing
        });
        
        console.log('Initial parse - first 5 rows:', jsonData.slice(0, 5));
        
        // Find the actual header row (contains 'Name' and 'Order Status' as VALUES)
        const headerRowIndex = jsonData.findIndex((row: any) => {
          const values = Object.values(row);
          return values.includes('Name') && 
                 (values.includes('Order Status') || values.includes('Subitems'));
        });
        
        console.log('Header row index:', headerRowIndex);
        
        if (headerRowIndex > 0) {
          // Re-parse starting from the actual header row
          jsonData = XLSX.utils.sheet_to_json(worksheet, {
            defval: '',
            range: headerRowIndex, // Start from the actual header
            raw: false
          });
          console.log('Re-parsed with correct headers - first 5 rows:', jsonData.slice(0, 5));
        }
        
        // Log detected columns
        if (jsonData.length > 0) {
          console.log('Detected columns:', Object.keys(jsonData[0]));
        }

        const orders = parseExcelData(jsonData);
        setParsedOrders(orders);
        setSelectedOrders(new Set(orders.map((_, i) => i)));
        
        // Extract unique customers
        const uniqueCustomers = [...new Set(orders.map(o => o.customerName).filter(Boolean))];
        const matches = new Map<string, CustomerMatch>();
        
        uniqueCustomers.forEach(name => {
          const exactMatch = customers.find(c => 
            c.company_name.toLowerCase() === name.toLowerCase()
          );
          const fuzzyMatch = !exactMatch ? customers.find(c => 
            c.company_name.toLowerCase().includes(name.toLowerCase().split(' ')[0]) ||
            name.toLowerCase().includes(c.company_name.toLowerCase().split(' ')[0])
          ) : null;

          matches.set(name, {
            excelName: name,
            matchedId: exactMatch?.id || fuzzyMatch?.id || null,
            matchType: exactMatch ? 'exact' : fuzzyMatch ? 'fuzzy' : 'none',
            createNew: !exactMatch && !fuzzyMatch,
          });
        });
        
        setCustomerMatches(matches);
        setStep('preview');
        toast.success(`Parsed ${orders.length} orders from Excel`);
      } catch (error) {
        console.error('Error parsing Excel:', error);
        toast.error('Failed to parse Excel file');
      }
    };
    reader.readAsArrayBuffer(file);
  }, [customers]);

  // Helper to clean numeric strings (remove commas)
  const cleanNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    return parseFloat(String(val).replace(/,/g, '')) || 0;
  };

  // Parse Excel data into structured orders
  const parseExcelData = (data: any[]): ParsedOrder[] => {
    const orders: ParsedOrder[] = [];
    let currentOrder: ParsedOrder | null = null;

    console.log('Parsing', data.length, 'rows');

    for (const row of data) {
      const rowValues = Object.values(row);
      
      // Skip header rows (contain column names as values)
      if (rowValues.includes('Name') && rowValues.includes('Order Status')) {
        console.log('Skipping main header row');
        continue;
      }
      if (rowValues.includes('Product Name') && rowValues.includes('Spec.')) {
        console.log('Skipping subitem header row');
        continue;
      }
      
      // Get Name column value
      const name = String(row['Name'] || '').trim();
      const subitems = String(row['Subitems'] || '').trim();
      
      // Parent row detection: 
      // 1. Has "ID - XXXX" pattern in Name
      // 2. Subitems column is empty or not a subitem header
      // 3. Name is not empty and not a column header value
      const isParentRow = 
        name.includes('ID - ') && 
        !name.startsWith('Subitems') &&
        name !== 'Name' &&
        name.length > 0;
      
      if (isParentRow) {
        // Save previous order
        if (currentOrder) {
          orders.push(currentOrder);
          console.log('Saved order:', currentOrder.name, 'with', currentOrder.items.length, 'items');
        }

        // Parse order name: "Customer - Product ID - XXXX"
        const parts = name.split(' ID - ');
        const projectId = parts[1]?.trim() || '';
        const titlePart = parts[0]?.trim() || name;
        
        // Extract customer from "Customers" column
        const customerName = String(row['Customers'] || '').trim();
        
        currentOrder = {
          name: titlePart,
          projectId,
          orderNumber: `ORD-${projectId}`,
          customerName,
          totalValue: cleanNumber(row['Customer T USD'] || row['Total USD']),
          currency: 'USD',
          status: mapStatus(String(row['Order Status'] || '')),
          tradeTerm: String(row['Terms'] || row['Trade Term'] || 'FOB'),
          deliveryTermStart: parseDate(String(row['Production Timeline'] || '').split(' - ')?.[0]),
          deliveryTermEnd: parseDate(String(row['Production Timeline'] || '').split(' - ')?.[1]),
          paymentTerms: String(row['Payment Terms'] || ''),
          notes: String(row['Notes'] || ''),
          items: [],
        };
        
        console.log('Found parent order:', currentOrder.name, 'ID:', projectId, 'Customer:', customerName);
      } 
      // Child row detection: has product details and we have a current order
      else if (currentOrder) {
        const productName = String(row['Product Name'] || '').trim();
        const itemName = String(row['Name'] || '').trim();
        
        // Skip if this row is a header row for subitems
        if (productName === 'Product Name' || itemName === 'Name') {
          continue;
        }
        
        // Must have product name or positive quantity to be a valid item
        const quantity = cleanNumber(row['Quantity']);
        
        if (productName || quantity > 0) {
          const item: ParsedOrderItem = {
            productName: productName || itemName,
            modelNumber: itemName || productName,
            specifications: String(row['Spec.'] || row['Specifications'] || ''),
            quantity: quantity,
            unitPrice: cleanNumber(row['Closing Usd Price'] || row['Unit Price']),
            totalPrice: cleanNumber(row['Total Closing Price'] || row['Total Price']),
            supplierName: String(row['Factory'] || row['Supplier'] || ''),
            cartons: cleanNumber(row['Total Ctn']),
            cbm: cleanNumber(row['Total Cbm']),
            grossWeight: cleanNumber(row['Total GW'] || row['Gross Weight']),
          };
          
          if (item.productName || item.quantity > 0) {
            currentOrder.items.push(item);
            console.log('  Added item:', item.productName, 'Qty:', item.quantity);
          }
        }
      }
    }

    // Don't forget the last order
    if (currentOrder) {
      orders.push(currentOrder);
      console.log('Saved final order:', currentOrder.name, 'with', currentOrder.items.length, 'items');
    }

    console.log('Total orders parsed:', orders.length);
    return orders;
  };

  const mapStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'New': 'pending',
      'In Production': 'production',
      'QC': 'qc',
      'Ready to Ship': 'ready_to_ship',
      'Shipped': 'shipped',
      'Delivered': 'delivered',
      'Completed': 'completed',
      'Cancelled': 'cancelled',
    };
    return statusMap[status] || 'pending';
  };

  const parseDate = (dateStr: string | undefined): string | undefined => {
    if (!dateStr) return undefined;
    try {
      // Try to parse various date formats
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {
      return undefined;
    }
    return undefined;
  };

  const toggleOrderSelection = (index: number) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedOrders(newSelected);
  };

  const toggleOrderExpanded = (index: number) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedOrders(newExpanded);
  };

  const handleCustomerMatchChange = (excelName: string, customerId: string) => {
    const match = customerMatches.get(excelName);
    if (match) {
      setCustomerMatches(new Map(customerMatches.set(excelName, {
        ...match,
        matchedId: customerId || null,
        matchType: customerId ? 'exact' : 'none',
        createNew: !customerId,
      })));
    }
  };

  const handleImport = async () => {
    const ordersToImport = parsedOrders.filter((_, i) => selectedOrders.has(i));
    
    // Match suppliers by supplier_name
    const supplierMap = new Map<string, string>();
    suppliers.forEach(s => {
      supplierMap.set(s.supplier_name.toLowerCase(), s.id);
    });

    // Prepare data with customer and supplier IDs
    const importData = ordersToImport.map(order => {
      const customerMatch = customerMatches.get(order.customerName);
      return {
        ...order,
        customerId: customerMatch?.matchedId || null,
        createCustomer: customerMatch?.createNew || false,
        items: order.items.map(item => ({
          ...item,
          supplierId: supplierMap.get(item.supplierName.toLowerCase()) || null,
        })),
      };
    });

    setStep('import');
    
    try {
      const result = await importMutation.mutateAsync({
        orders: importData,
        onProgress: (progress) => setImportProgress(progress),
      });
      
      toast.success(`Successfully imported ${result.success} orders`);
      if (result.failed > 0) {
        toast.warning(`Failed to import ${result.failed} orders`);
      }
    } catch (error) {
      toast.error('Import failed');
    }
  };

  const renderUploadStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>Upload Excel File</CardTitle>
        <CardDescription>
          Upload your Monday.com export file (.xlsx) to import orders
        </CardDescription>
      </CardHeader>
      <CardContent>
        <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors border-border">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-12 h-12 mb-3 text-muted-foreground" />
            <p className="mb-2 text-lg font-medium text-foreground">
              Drop Excel file here
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse (.xlsx, .xls)
            </p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
          />
        </label>
      </CardContent>
    </Card>
  );

  const renderPreviewStep = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Preview Orders</CardTitle>
            <CardDescription>
              {selectedOrders.size} of {parsedOrders.length} orders selected for import
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('upload')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={() => setStep('customers')} disabled={selectedOrders.size === 0}>
              Match Customers
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedOrders.size === parsedOrders.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedOrders(new Set(parsedOrders.map((_, i) => i)));
                      } else {
                        setSelectedOrders(new Set());
                      }
                    }}
                  />
                </TableHead>
                <TableHead className="w-8"></TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Items</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsedOrders.map((order, index) => (
                <>
                  <TableRow 
                    key={`order-${index}`}
                    className={cn(
                      "cursor-pointer",
                      !selectedOrders.has(index) && "opacity-50"
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedOrders.has(index)}
                        onCheckedChange={() => toggleOrderSelection(index)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleOrderExpanded(index)}
                      >
                        {expandedOrders.has(index) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{order.name}</div>
                      <div className="text-sm text-muted-foreground">{order.orderNumber}</div>
                    </TableCell>
                    <TableCell>{order.customerName || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${order.totalValue.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{order.items.length}</TableCell>
                  </TableRow>
                  {expandedOrders.has(index) && order.items.map((item, itemIndex) => (
                    <TableRow 
                      key={`order-${index}-item-${itemIndex}`}
                      className="bg-muted/30"
                    >
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell colSpan={2} className="pl-10">
                        <div className="text-sm">
                          <span className="font-medium">{item.productName}</span>
                          {item.specifications && (
                            <span className="text-muted-foreground ml-2">
                              ({item.specifications.slice(0, 50)}...)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        ${item.totalPrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.quantity.toLocaleString()} pcs
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {item.supplierName || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  const renderCustomersStep = () => {
    const uniqueCustomers = [...customerMatches.entries()];
    
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Match Customers</CardTitle>
              <CardDescription>
                Match customers from Excel to existing customers or create new ones
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('preview')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleImport}>
                Import {selectedOrders.size} Orders
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Excel Customer Name</TableHead>
                <TableHead>Match Status</TableHead>
                <TableHead>Matched To</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uniqueCustomers.map(([name, match]) => (
                <TableRow key={name}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell>
                    {match.matchType === 'exact' && (
                      <Badge className="bg-green-500/10 text-green-500">
                        <Check className="h-3 w-3 mr-1" />
                        Exact Match
                      </Badge>
                    )}
                    {match.matchType === 'fuzzy' && (
                      <Badge className="bg-yellow-500/10 text-yellow-500">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Fuzzy Match
                      </Badge>
                    )}
                    {match.matchType === 'none' && (
                      <Badge variant="secondary">
                        No Match
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={match.matchedId || 'new'}
                      onValueChange={(value) => handleCustomerMatchChange(name, value === 'new' ? '' : value)}
                    >
                      <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="Select customer..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">+ Create New Customer</SelectItem>
                        {customers.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {match.createNew && (
                      <Badge variant="outline">Will create new</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const renderImportStep = () => (
    <Card>
      <CardHeader>
        <CardTitle>
          {importMutation.isPending ? 'Importing Orders...' : 
           importMutation.isSuccess ? 'Import Complete' : 
           'Import Failed'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Progress value={importProgress} className="h-3" />
        
        <div className="text-center text-lg">
          {importMutation.isPending && (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Importing... {Math.round(importProgress)}%
            </div>
          )}
          {importMutation.isSuccess && (
            <div className="text-green-500 flex items-center justify-center gap-2">
              <Check className="h-5 w-5" />
              Successfully imported orders!
            </div>
          )}
        </div>

        {importMutation.isSuccess && (
          <div className="flex justify-center">
            <Button onClick={() => window.location.href = '/dashboard/orders'}>
              View Orders
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const steps = [
    { key: 'upload', label: 'Upload' },
    { key: 'preview', label: 'Preview' },
    { key: 'customers', label: 'Customers' },
    { key: 'import', label: 'Import' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Orders"
        description="Import orders from Excel (Monday.com export)"
      />

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, index) => (
          <div key={s.key} className="flex items-center">
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
              index <= currentStepIndex 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            )}>
              {index < currentStepIndex ? (
                <Check className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            <span className={cn(
              "ml-2 text-sm",
              index <= currentStepIndex ? "text-foreground" : "text-muted-foreground"
            )}>
              {s.label}
            </span>
            {index < steps.length - 1 && (
              <div className={cn(
                "w-12 h-0.5 mx-3",
                index < currentStepIndex ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 'upload' && renderUploadStep()}
      {step === 'preview' && renderPreviewStep()}
      {step === 'customers' && renderCustomersStep()}
      {step === 'import' && renderImportStep()}
    </div>
  );
}
