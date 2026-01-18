import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Package,
  Loader2,
} from 'lucide-react';
import {
  useCustomerOrders,
  useCustomerServiceRequests,
  useCreateServiceRequest,
} from '@/hooks/useCustomerPortal';
import { format } from 'date-fns';
import { toast } from 'sonner';

const REQUEST_TYPES = [
  { value: 'general_inquiry', label: 'General Inquiry' },
  { value: 'order_issue', label: 'Order Issue' },
  { value: 'shipping_inquiry', label: 'Shipping Inquiry' },
  { value: 'quality_complaint', label: 'Quality Complaint' },
  { value: 'return_request', label: 'Return Request' },
  { value: 'invoice_request', label: 'Invoice Request' },
  { value: 'other', label: 'Other' },
];

export default function CustomerSupport() {
  const { data: orders } = useCustomerOrders();
  const { data: requests, isLoading } = useCustomerServiceRequests();
  const createRequest = useCreateServiceRequest();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    request_type: '',
    order_id: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.request_type || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await createRequest.mutateAsync({
        request_type: formData.request_type,
        description: formData.description,
        order_id: formData.order_id || undefined,
      });
      toast.success('Support request submitted successfully');
      setDialogOpen(false);
      setFormData({ request_type: '', order_id: '', description: '' });
    } catch (error) {
      toast.error('Failed to submit request');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'resolved':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeLabel = (type: string) => {
    return REQUEST_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support</h1>
          <p className="text-muted-foreground">Submit and track your support requests</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Submit Support Request</DialogTitle>
              <DialogDescription>
                Describe your issue and we'll get back to you as soon as possible
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="request_type">Request Type *</Label>
                <Select
                  value={formData.request_type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, request_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUEST_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order_id">Related Order (Optional)</Label>
                <Select
                  value={formData.order_id || 'none'}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, order_id: value === 'none' ? '' : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select order..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific order</SelectItem>
                    {orders?.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.order_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Please describe your issue in detail..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={5}
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createRequest.isPending}>
                  {createRequest.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests?.filter((r) => r.status === 'open').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests?.filter((r) => r.status === 'in_progress').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests?.filter((r) => r.status === 'resolved').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Requests</CardTitle>
          <CardDescription>All your support requests and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : requests?.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg">No support requests</h3>
              <p className="text-muted-foreground mb-4">
                Submit a request if you need help with anything
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Submit Request
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {requests?.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(request.status || 'open')}
                      <Badge variant="outline">{getTypeLabel(request.request_type)}</Badge>
                      {request.orders && (
                        <Badge variant="secondary">
                          <Package className="mr-1 h-3 w-3" />
                          {(request.orders as any).order_number}
                        </Badge>
                      )}
                    </div>
                    <StatusBadge status={request.status || 'open'} />
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {request.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      Submitted: {format(new Date(request.created_at!), 'MMM d, yyyy h:mm a')}
                    </span>
                    {request.resolved_at && (
                      <span className="text-green-600">
                        Resolved: {format(new Date(request.resolved_at), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
