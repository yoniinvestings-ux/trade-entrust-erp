import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Loader2, UserPlus, Mail, Info } from 'lucide-react';
import { useCreateInvitation, ROLE_LABELS, DEPARTMENT_OPTIONS } from '@/hooks/useUsers';
import type { Database } from '@/integrations/supabase/types';
import { Alert, AlertDescription } from '@/components/ui/alert';

type AppRole = Database['public']['Enums']['app_role'];

const inviteSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.string().min(1, 'Role is required'),
  department: z.string().optional(),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: 'team' | 'customer' | 'supplier';
  entityId?: string;
  entityName?: string;
}

const TEAM_ROLES: AppRole[] = [
  'super_admin',
  'manager',
  'cfo',
  'sales',
  'sourcing',
  'marketing',
  'qc',
  'logistics',
  'finance',
  'production',
  'project_manager',
  'hr',
  'merchandising',
];

export function InviteUserDialog({
  open,
  onOpenChange,
  type = 'team',
  entityId,
  entityName,
}: InviteUserDialogProps) {
  const createInvitation = useCreateInvitation();

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      role: type === 'customer' ? 'customer' : type === 'supplier' ? 'supplier' : '',
      department: '',
    },
  });

  const onSubmit = async (data: InviteFormValues) => {
    await createInvitation.mutateAsync({
      email: data.email,
      role: data.role as AppRole,
      entityType: type !== 'team' ? type : undefined,
      entityId: entityId,
    });
    
    form.reset();
    onOpenChange(false);
  };

  const getTitle = () => {
    switch (type) {
      case 'customer':
        return 'Invite Customer Portal User';
      case 'supplier':
        return 'Invite Supplier Portal User';
      default:
        return 'Invite Team Member';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'customer':
        return entityName 
          ? `Invite a user to access the customer portal for ${entityName}`
          : 'Invite a customer to access their portal';
      case 'supplier':
        return entityName 
          ? `Invite a user to access the supplier portal for ${entityName}`
          : 'Invite a supplier to access their portal';
      default:
        return 'Send an invitation to a new team member';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input {...field} type="email" placeholder="user@example.com" className="pl-10" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {type === 'team' && (
              <>
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TEAM_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DEPARTMENT_OPTIONS.map((dept) => (
                            <SelectItem key={dept} value={dept}>
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                The invited user will receive an email. They can use <strong>"Forgot Password"</strong> on the login page to set up their account with the invited email address.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createInvitation.isPending}>
                {createInvitation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
