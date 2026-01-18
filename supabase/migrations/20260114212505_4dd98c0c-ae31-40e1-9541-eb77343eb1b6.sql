-- Step 2: Create all foundation tables

-- 1. Create customer_users table (link customer portal users to customers)
CREATE TABLE public.customer_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  access_level TEXT DEFAULT 'viewer' CHECK (access_level IN ('viewer', 'admin')),
  invited_by UUID,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, customer_id)
);

ALTER TABLE public.customer_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customer_users" ON public.customer_users
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Privileged users can insert customer_users" ON public.customer_users
  FOR INSERT WITH CHECK (public.is_privileged_user(auth.uid()));

CREATE POLICY "Privileged users can update customer_users" ON public.customer_users
  FOR UPDATE USING (public.is_privileged_user(auth.uid()));

CREATE POLICY "Privileged users can delete customer_users" ON public.customer_users
  FOR DELETE USING (public.is_privileged_user(auth.uid()));

-- 2. Create supplier_users table (link supplier portal users to suppliers)
CREATE TABLE public.supplier_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
  access_level TEXT DEFAULT 'viewer' CHECK (access_level IN ('viewer', 'admin')),
  invited_by UUID,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, supplier_id)
);

ALTER TABLE public.supplier_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view supplier_users" ON public.supplier_users
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Privileged users can insert supplier_users" ON public.supplier_users
  FOR INSERT WITH CHECK (public.is_privileged_user(auth.uid()));

CREATE POLICY "Privileged users can update supplier_users" ON public.supplier_users
  FOR UPDATE USING (public.is_privileged_user(auth.uid()));

CREATE POLICY "Privileged users can delete supplier_users" ON public.supplier_users
  FOR DELETE USING (public.is_privileged_user(auth.uid()));

-- 3. Create invitation_tokens table
CREATE TABLE public.invitation_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  role public.app_role NOT NULL,
  entity_type TEXT CHECK (entity_type IN ('customer', 'supplier', 'team')),
  entity_id UUID,
  invited_by UUID,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.invitation_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Privileged users can manage invitation_tokens" ON public.invitation_tokens
  FOR ALL USING (public.is_privileged_user(auth.uid()));

-- 4. Create permission_settings table
CREATE TABLE public.permission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  module TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  can_assign BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role, module)
);

ALTER TABLE public.permission_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view permission_settings" ON public.permission_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admin can manage permission_settings" ON public.permission_settings
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- 5. Create workflow_steps table (defines all workflow steps)
CREATE TABLE public.workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('order', 'purchase_order', 'sourcing', 'lead')),
  step_order INTEGER NOT NULL,
  step_key TEXT NOT NULL,
  step_name TEXT NOT NULL,
  step_name_cn TEXT,
  responsible_roles TEXT[] DEFAULT '{}',
  is_required BOOLEAN DEFAULT true,
  can_skip BOOLEAN DEFAULT false,
  blocked_by_steps TEXT[] DEFAULT '{}',
  auto_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(entity_type, step_key)
);

ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view workflow_steps" ON public.workflow_steps
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admin can manage workflow_steps" ON public.workflow_steps
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- 6. Create workflow_progress table (tracks progress per entity)
CREATE TABLE public.workflow_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  step_key TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'blocked')),
  assigned_to UUID[],
  completed_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(entity_type, entity_id, step_key)
);

ALTER TABLE public.workflow_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view workflow_progress" ON public.workflow_progress
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert workflow_progress" ON public.workflow_progress
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update workflow_progress" ON public.workflow_progress
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 7. Create entity_updates table (Monday.com style updates/comments)
CREATE TABLE public.entity_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('order', 'purchase_order', 'sourcing', 'customer', 'supplier', 'lead', 'shipment', 'qc_inspection')),
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL,
  parent_id UUID REFERENCES public.entity_updates(id) ON DELETE CASCADE,
  mentions UUID[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  reactions JSONB DEFAULT '{}',
  is_customer_visible BOOLEAN DEFAULT false,
  is_supplier_visible BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.entity_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view entity_updates" ON public.entity_updates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert entity_updates" ON public.entity_updates
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authors can update their entity_updates" ON public.entity_updates
  FOR UPDATE USING (auth.uid() = author_id OR public.is_privileged_user(auth.uid()));

CREATE POLICY "Authors can delete their entity_updates" ON public.entity_updates
  FOR DELETE USING (auth.uid() = author_id OR public.is_privileged_user(auth.uid()));

CREATE INDEX idx_entity_updates_entity ON public.entity_updates(entity_type, entity_id);
CREATE INDEX idx_entity_updates_mentions ON public.entity_updates USING GIN(mentions);

-- 8. Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mention', 'reply', 'assignment', 'workflow', 'system', 'wecom', 'portal')),
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT,
  entity_id UUID,
  action_url TEXT,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, read, created_at DESC);

-- 9. Add WeCom fields to suppliers table
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS wecom_group_id TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS wecom_api_connected BOOLEAN DEFAULT false;

-- 10. Create wecom_messages table
CREATE TABLE public.wecom_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  entity_type TEXT,
  entity_id UUID,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  message_type TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  wecom_message_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.wecom_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view wecom_messages" ON public.wecom_messages
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert wecom_messages" ON public.wecom_messages
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 11. Create shipment_tracking_logs table (for AI tracking)
CREATE TABLE public.shipment_tracking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE NOT NULL,
  tracking_type TEXT CHECK (tracking_type IN ('air', 'sea', 'land')),
  carrier_response JSONB,
  parsed_status TEXT,
  location TEXT,
  estimated_arrival TIMESTAMP WITH TIME ZONE,
  ai_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.shipment_tracking_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view shipment_tracking_logs" ON public.shipment_tracking_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert shipment_tracking_logs" ON public.shipment_tracking_logs
  FOR INSERT WITH CHECK (true);

-- 12. Create customer_service_requests table
CREATE TABLE public.customer_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('after_sales', 'reorder', 'inquiry', 'complaint')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  items JSONB DEFAULT '[]',
  description TEXT,
  attachments JSONB DEFAULT '[]',
  assigned_to UUID,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.customer_service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customer_service_requests" ON public.customer_service_requests
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert customer_service_requests" ON public.customer_service_requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update customer_service_requests" ON public.customer_service_requests
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 13. Create function to check module permissions
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _module TEXT, _action TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role app_role;
  _has_perm BOOLEAN := false;
BEGIN
  SELECT role INTO _role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
  
  IF _role = 'super_admin' THEN
    RETURN true;
  END IF;
  
  SELECT 
    CASE _action
      WHEN 'view' THEN can_view
      WHEN 'create' THEN can_create
      WHEN 'edit' THEN can_edit
      WHEN 'delete' THEN can_delete
      WHEN 'assign' THEN can_assign
      ELSE false
    END INTO _has_perm
  FROM public.permission_settings
  WHERE role = _role AND module = _module;
  
  RETURN COALESCE(_has_perm, false);
END;
$$;