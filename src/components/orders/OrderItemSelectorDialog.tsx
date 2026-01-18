import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, ImageIcon, Check } from 'lucide-react';

interface ProductPhoto {
  id: string;
  url: string;
  file_name: string;
  is_main: boolean;
}

interface OrderItem {
  id: string;
  product_name: string;
  model_number: string;
  specifications: string | null;
  quantity: number;
  unit_price: number;
  remarks: string | null;
  product_photos?: ProductPhoto[];
}

interface OrderItemSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderItems: OrderItem[];
  onAddItems: (items: OrderItem[]) => void;
  currency?: string;
}

export function OrderItemSelectorDialog({
  open,
  onOpenChange,
  orderItems,
  onAddItems,
  currency = 'USD',
}: OrderItemSelectorDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === orderItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orderItems.map(item => item.id)));
    }
  };

  const handleAddSelected = () => {
    const selectedItems = orderItems.filter(item => selectedIds.has(item.id));
    onAddItems(selectedItems);
    setSelectedIds(new Set());
    onOpenChange(false);
  };

  const handleAddAll = () => {
    onAddItems(orderItems);
    setSelectedIds(new Set());
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(currency === 'RMB' ? 'zh-CN' : 'en-US', {
      style: 'currency',
      currency: currency === 'RMB' ? 'CNY' : 'USD',
    }).format(value);
  };

  const getMainPhoto = (photos?: ProductPhoto[]) => {
    if (!photos || photos.length === 0) return null;
    return photos.find(p => p.is_main) || photos[0];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Items from Order</DialogTitle>
          <DialogDescription>
            Select items to add to this Purchase Order. Photos and details will be copied.
          </DialogDescription>
        </DialogHeader>

        {orderItems.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No items found in this order</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between py-2 border-b">
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {selectedIds.size === orderItems.length ? 'Deselect All' : 'Select All'}
              </Button>
              <Badge variant="secondary">
                {selectedIds.size} of {orderItems.length} selected
              </Badge>
            </div>

            <ScrollArea className="max-h-[400px] pr-4">
              <div className="space-y-3">
                {orderItems.map((item) => {
                  const mainPhoto = getMainPhoto(item.product_photos);
                  const isSelected = selectedIds.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleItem(item.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleItem(item.id)}
                        onClick={(e) => e.stopPropagation()}
                      />

                      {/* Photo thumbnail */}
                      <div className="w-16 h-16 rounded-md border bg-muted flex-shrink-0 overflow-hidden">
                        {mainPhoto ? (
                          <img
                            src={mainPhoto.url}
                            alt={item.product_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Item details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium truncate">{item.product_name}</h4>
                            <p className="text-sm text-muted-foreground font-mono">{item.model_number}</p>
                          </div>
                          {isSelected && (
                            <Check className="h-5 w-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm">
                          <span>Qty: <strong>{item.quantity.toLocaleString()}</strong></span>
                          <span className="text-muted-foreground">
                            Customer price: {formatCurrency(item.unit_price)}
                          </span>
                        </div>
                        {item.specifications && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {item.specifications}
                          </p>
                        )}
                        {item.product_photos && item.product_photos.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <ImageIcon className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {item.product_photos.length} photo{item.product_photos.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleAddAll}
            disabled={orderItems.length === 0}
          >
            Add All Items
          </Button>
          <Button
            onClick={handleAddSelected}
            disabled={selectedIds.size === 0}
          >
            Add Selected ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
