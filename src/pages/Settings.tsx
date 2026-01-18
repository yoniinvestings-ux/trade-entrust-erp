import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, CreditCard, Image, Loader2, Save } from 'lucide-react';
import { useCompanySettings, useUpdateCompanySettings } from '@/hooks/useCompanySettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const settingsSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  company_name_cn: z.string().optional(),
  address: z.string().optional(),
  address_cn: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  logo_url: z.string().optional(),
  bank_account_name: z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_name: z.string().optional(),
  bank_address: z.string().optional(),
  bank_swift_code: z.string().optional(),
  bank_code: z.string().optional(),
  bank_branch: z.string().optional(),
  bank_currency: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function Settings() {
  const { data: settings, isLoading } = useCompanySettings();
  const updateSettings = useUpdateCompanySettings();
  const [uploading, setUploading] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      company_name: '',
      company_name_cn: '',
      address: '',
      address_cn: '',
      phone: '',
      email: '',
      logo_url: '',
      bank_account_name: '',
      bank_account_number: '',
      bank_name: '',
      bank_address: '',
      bank_swift_code: '',
      bank_code: '',
      bank_branch: '',
      bank_currency: 'USD',
    },
    values: settings ? {
      company_name: settings.company_name || '',
      company_name_cn: settings.company_name_cn || '',
      address: settings.address || '',
      address_cn: settings.address_cn || '',
      phone: settings.phone || '',
      email: settings.email || '',
      logo_url: settings.logo_url || '',
      bank_account_name: settings.bank_account_name || '',
      bank_account_number: settings.bank_account_number || '',
      bank_name: settings.bank_name || '',
      bank_address: settings.bank_address || '',
      bank_swift_code: settings.bank_swift_code || '',
      bank_code: settings.bank_code || '',
      bank_branch: settings.bank_branch || '',
      bank_currency: settings.bank_currency || 'USD',
    } : undefined,
  });

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('system')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('system')
        .getPublicUrl(filePath);

      form.setValue('logo_url', publicUrl);
      toast.success('Logo uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload logo');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = (data: SettingsFormValues) => {
    updateSettings.mutate({
      ...data,
      company_name: data.company_name,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Settings"
        description="Manage your company information and document settings"
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="company" className="space-y-4">
            <TabsList>
              <TabsTrigger value="company" className="gap-2">
                <Building2 className="h-4 w-4" />
                Company Info
              </TabsTrigger>
              <TabsTrigger value="bank" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Bank Details
              </TabsTrigger>
              <TabsTrigger value="branding" className="gap-2">
                <Image className="h-4 w-4" />
                Branding
              </TabsTrigger>
            </TabsList>

            <TabsContent value="company">
              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                  <CardDescription>
                    This information will appear on invoices and other documents
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name (English) *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Your Company Ltd" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="company_name_cn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name (Chinese)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="公司中文名称" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address (English)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Full company address" rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address_cn"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address (Chinese)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="公司地址" rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="+1 234 567 8900" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="info@company.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bank">
              <Card>
                <CardHeader>
                  <CardTitle>Bank Account Details</CardTitle>
                  <CardDescription>
                    Payment information for invoices and documents
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="bank_account_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Your Company Ltd" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bank_account_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="1234567890" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bank_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Bank of Example" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bank_branch"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Main Branch" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bank_swift_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SWIFT Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ABCDUS33" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bank_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Optional" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bank_address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Bank Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Full bank address" rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bank_currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Currency</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="USD" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="branding">
              <Card>
                <CardHeader>
                  <CardTitle>Branding</CardTitle>
                  <CardDescription>
                    Upload your company logo for documents
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-6">
                    {form.watch('logo_url') && (
                      <div className="border rounded-lg p-4 bg-muted/30">
                        <img 
                          src={form.watch('logo_url')} 
                          alt="Company Logo" 
                          className="max-h-24 max-w-48 object-contain"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <FormLabel>Company Logo</FormLabel>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploading}
                      />
                      {uploading && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading...
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Recommended: PNG or JPG, max 500KB, transparent background preferred
                      </p>
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="logo_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Or paste logo URL directly" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
