import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Check, X, AlertTriangle, AlertCircle, Plus, Trash2, Save, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { 
  QCInspectionItem, 
  QC_CHECK_CATEGORIES, 
  QC_RESULT_OPTIONS,
  useUpdateInspectionItem,
  useDeleteInspectionItem,
  useCreateInspectionItem,
} from '@/hooks/useQCInspections';
import { QCPhotoUpload } from './QCPhotoUpload';

interface QCInspectionItemFormProps {
  inspectionId: string;
  items: QCInspectionItem[];
}

export function QCInspectionItemForm({ inspectionId, items }: QCInspectionItemFormProps) {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    check_category: 'appearance',
    check_name: '',
    check_name_cn: '',
    requirement: '',
    requirement_cn: '',
  });
  
  const updateItem = useUpdateInspectionItem();
  const deleteItem = useDeleteInspectionItem();
  const createItem = useCreateInspectionItem();

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.check_category]) {
      acc[item.check_category] = [];
    }
    acc[item.check_category].push(item);
    return acc;
  }, {} as Record<string, QCInspectionItem[]>);

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'pass':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'fail':
        return <X className="h-4 w-4 text-red-500" />;
      case 'minor_issue':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'major_issue':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const getResultColor = (result: string) => {
    const option = QC_RESULT_OPTIONS.find(o => o.value === result);
    return option?.color || 'bg-gray-500';
  };

  const handleUpdateResult = async (item: QCInspectionItem, result: string) => {
    try {
      await updateItem.mutateAsync({
        id: item.id,
        inspection_id: inspectionId,
        result,
      });
      toast.success('Result updated');
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  const handleSaveItemDetails = async (item: QCInspectionItem, data: {
    finding?: string;
    finding_cn?: string;
    corrective_action?: string;
    corrective_action_cn?: string;
    photo_urls?: string[];
  }) => {
    try {
      await updateItem.mutateAsync({
        id: item.id,
        inspection_id: inspectionId,
        ...data,
      });
      setEditingItem(null);
      toast.success('Saved / 已保存');
    } catch (error: any) {
      toast.error('Failed to save: ' + error.message);
    }
  };

  const handleDeleteItem = async (item: QCInspectionItem) => {
    if (!confirm('Delete this check item?')) return;
    try {
      await deleteItem.mutateAsync({ id: item.id, inspection_id: inspectionId });
      toast.success('Deleted');
    } catch (error: any) {
      toast.error('Failed to delete: ' + error.message);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.check_name) {
      toast.error('Check name is required');
      return;
    }
    try {
      await createItem.mutateAsync({
        inspection_id: inspectionId,
        ...newItem,
      });
      setNewItem({
        check_category: 'appearance',
        check_name: '',
        check_name_cn: '',
        requirement: '',
        requirement_cn: '',
      });
      setShowAddForm(false);
      toast.success('Check item added');
    } catch (error: any) {
      toast.error('Failed to add: ' + error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Inspection Checklist / 检验清单</h3>
        <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Check Item
        </Button>
      </div>

      {showAddForm && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add New Check Item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={newItem.check_category} 
                  onValueChange={(v) => setNewItem({ ...newItem, check_category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QC_CHECK_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Check Name *</Label>
                <Input
                  value={newItem.check_name}
                  onChange={(e) => setNewItem({ ...newItem, check_name: e.target.value })}
                  placeholder="e.g., Drop Test"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check Name (Chinese)</Label>
                <Input
                  value={newItem.check_name_cn}
                  onChange={(e) => setNewItem({ ...newItem, check_name_cn: e.target.value })}
                  placeholder="e.g., 跌落测试"
                />
              </div>
              <div className="space-y-2">
                <Label>Requirement</Label>
                <Input
                  value={newItem.requirement}
                  onChange={(e) => setNewItem({ ...newItem, requirement: e.target.value })}
                  placeholder="Test criteria"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddItem} disabled={createItem.isPending}>
                Add Item
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Accordion type="multiple" defaultValue={QC_CHECK_CATEGORIES.map(c => c.value)} className="space-y-2">
        {QC_CHECK_CATEGORIES.map((category) => {
          const categoryItems = groupedItems[category.value] || [];
          if (categoryItems.length === 0) return null;

          const passCount = categoryItems.filter(i => i.result === 'pass').length;
          const failCount = categoryItems.filter(i => i.result === 'fail' || i.result === 'major_issue').length;
          const issueCount = categoryItems.filter(i => i.result === 'minor_issue').length;

          return (
            <AccordionItem key={category.value} value={category.value} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{category.label}</span>
                  <div className="flex gap-1">
                    {passCount > 0 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        {passCount} pass
                      </Badge>
                    )}
                    {issueCount > 0 && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                        {issueCount} minor
                      </Badge>
                    )}
                    {failCount > 0 && (
                      <Badge variant="secondary" className="bg-red-100 text-red-700">
                        {failCount} fail
                      </Badge>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {categoryItems.map((item) => (
                    <div key={item.id} className="border rounded-lg p-3 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {getResultIcon(item.result)}
                            <span className="font-medium">{item.check_name}</span>
                            {item.check_name_cn && (
                              <span className="text-muted-foreground">/ {item.check_name_cn}</span>
                            )}
                          </div>
                          {item.requirement && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.requirement}
                              {item.requirement_cn && ` / ${item.requirement_cn}`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Select 
                            value={item.result} 
                            onValueChange={(v) => handleUpdateResult(item, v)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {QC_RESULT_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                                    {opt.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteItem(item)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>

                      {/* Show findings and corrective action for non-pass items */}
                      {(item.result !== 'pass' && item.result !== 'pending') && (
                        <ItemDetailsForm
                          item={item}
                          onSave={(data) => handleSaveItemDetails(item, data)}
                          isEditing={editingItem === item.id}
                          onEdit={() => setEditingItem(item.id)}
                          onCancel={() => setEditingItem(null)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

interface ItemDetailsFormProps {
  item: QCInspectionItem;
  onSave: (data: {
    finding?: string;
    finding_cn?: string;
    corrective_action?: string;
    corrective_action_cn?: string;
    photo_urls?: string[];
  }) => void;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
}

function ItemDetailsForm({ item, onSave, isEditing, onEdit, onCancel }: ItemDetailsFormProps) {
  const [finding, setFinding] = useState(item.finding || '');
  const [findingCn, setFindingCn] = useState(item.finding_cn || '');
  const [correctiveAction, setCorrectiveAction] = useState(item.corrective_action || '');
  const [correctiveActionCn, setCorrectiveActionCn] = useState(item.corrective_action_cn || '');
  const [photos, setPhotos] = useState<string[]>(item.photo_urls || []);

  if (!isEditing) {
    return (
      <div className="bg-muted/50 rounded-md p-3 space-y-2">
        {item.finding ? (
          <>
            <div>
              <span className="text-sm font-medium text-muted-foreground">Finding:</span>
              <p className="text-sm">{item.finding} {item.finding_cn && `/ ${item.finding_cn}`}</p>
            </div>
            {item.corrective_action && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Corrective Action:</span>
                <p className="text-sm">{item.corrective_action} {item.corrective_action_cn && `/ ${item.corrective_action_cn}`}</p>
              </div>
            )}
            {item.photo_urls && item.photo_urls.length > 0 && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Photos ({item.photo_urls.length}):</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {item.photo_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={`Photo ${i + 1}`} className="w-16 h-16 object-cover rounded border hover:opacity-80" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic">No findings recorded yet</p>
        )}
        <Button variant="outline" size="sm" onClick={onEdit}>
          {item.finding ? 'Edit Details' : 'Add Finding'}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-muted/50 rounded-md p-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm">Finding (English)</Label>
          <Textarea
            value={finding}
            onChange={(e) => setFinding(e.target.value)}
            placeholder="Describe the issue found..."
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Finding (Chinese) / 问题描述</Label>
          <Textarea
            value={findingCn}
            onChange={(e) => setFindingCn(e.target.value)}
            placeholder="描述发现的问题..."
            rows={2}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-sm">Corrective Action (English)</Label>
          <Textarea
            value={correctiveAction}
            onChange={(e) => setCorrectiveAction(e.target.value)}
            placeholder="Required corrective action..."
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Corrective Action (Chinese) / 整改措施</Label>
          <Textarea
            value={correctiveActionCn}
            onChange={(e) => setCorrectiveActionCn(e.target.value)}
            placeholder="整改措施..."
            rows={2}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-sm">Photos / 照片 (for defects)</Label>
        <QCPhotoUpload
          itemId={item.id}
          existingPhotos={photos}
          onPhotosChange={setPhotos}
        />
      </div>
      <div className="flex gap-2">
        <Button 
          size="sm" 
          onClick={() => onSave({
            finding,
            finding_cn: findingCn,
            corrective_action: correctiveAction,
            corrective_action_cn: correctiveActionCn,
            photo_urls: photos,
          })}
        >
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
