-- Add WeCom webhook fields to suppliers table
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS wecom_webhook_url TEXT;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS wecom_webhook_token TEXT DEFAULT gen_random_uuid()::text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS wecom_integration_status TEXT DEFAULT 'not_setup' CHECK (wecom_integration_status IN ('not_setup', 'active', 'testing', 'failed'));
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS wecom_last_test TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS wecom_error_count INTEGER DEFAULT 0;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS wecom_last_error TEXT;

-- Add factory tracking fields to purchase_orders table
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS factory_confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS factory_qc_status TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS factory_tracking_number TEXT;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS last_factory_message_at TIMESTAMP WITH TIME ZONE;

-- Extend wecom_messages table with parsing and tracking fields
ALTER TABLE public.wecom_messages ADD COLUMN IF NOT EXISTS parsed_action TEXT;
ALTER TABLE public.wecom_messages ADD COLUMN IF NOT EXISTS parsed_data JSONB;
ALTER TABLE public.wecom_messages ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.wecom_messages ADD COLUMN IF NOT EXISTS entity_update_id UUID REFERENCES public.entity_updates(id) ON DELETE SET NULL;
ALTER TABLE public.wecom_messages ADD COLUMN IF NOT EXISTS wecom_response JSONB;
ALTER TABLE public.wecom_messages ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Create index for faster message lookups
CREATE INDEX IF NOT EXISTS idx_wecom_messages_entity ON public.wecom_messages(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_wecom_messages_supplier ON public.wecom_messages(supplier_id);
CREATE INDEX IF NOT EXISTS idx_wecom_messages_status ON public.wecom_messages(status);

-- Enable RLS on wecom_messages if not already enabled
ALTER TABLE public.wecom_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for wecom_messages
DROP POLICY IF EXISTS "Allow authenticated users to view wecom messages" ON public.wecom_messages;
CREATE POLICY "Allow authenticated users to view wecom messages" 
  ON public.wecom_messages 
  FOR SELECT 
  TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert wecom messages" ON public.wecom_messages;
CREATE POLICY "Allow authenticated users to insert wecom messages" 
  ON public.wecom_messages 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update wecom messages" ON public.wecom_messages;
CREATE POLICY "Allow authenticated users to update wecom messages" 
  ON public.wecom_messages 
  FOR UPDATE 
  TO authenticated 
  USING (true);

-- Allow service role full access for edge functions
DROP POLICY IF EXISTS "Allow service role full access to wecom messages" ON public.wecom_messages;
CREATE POLICY "Allow service role full access to wecom messages"
  ON public.wecom_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);