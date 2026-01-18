-- Update product_photos RLS policies to allow all relevant roles to manage photos

-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Authorized users can insert product_photos" ON public.product_photos;

-- Create new INSERT policy that includes sales and project_manager roles
CREATE POLICY "Authorized users can insert product_photos"
  ON public.product_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sourcing')
    OR has_role(auth.uid(), 'qc')
    OR has_role(auth.uid(), 'merchandising')
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'project_manager')
  );

-- Drop existing UPDATE policy if exists
DROP POLICY IF EXISTS "Authorized users can update product_photos" ON public.product_photos;

-- Create UPDATE policy for managing photos
CREATE POLICY "Authorized users can update product_photos"
  ON public.product_photos FOR UPDATE
  TO authenticated
  USING (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sourcing')
    OR has_role(auth.uid(), 'qc')
    OR has_role(auth.uid(), 'merchandising')
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'project_manager')
  );

-- Drop existing DELETE policy if exists
DROP POLICY IF EXISTS "Authorized users can delete product_photos" ON public.product_photos;

-- Create DELETE policy for removing photos
CREATE POLICY "Authorized users can delete product_photos"
  ON public.product_photos FOR DELETE
  TO authenticated
  USING (
    is_privileged_user(auth.uid())
    OR has_role(auth.uid(), 'sourcing')
    OR has_role(auth.uid(), 'qc')
    OR has_role(auth.uid(), 'merchandising')
    OR has_role(auth.uid(), 'sales')
    OR has_role(auth.uid(), 'project_manager')
  );