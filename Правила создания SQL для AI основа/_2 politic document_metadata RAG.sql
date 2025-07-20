CREATE POLICY "Authenticated users can view their own document metadata." 
ON public.document_metadata 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert document metadata." 
ON public.document_metadata 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update their own document metadata." 
ON public.document_metadata 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete their own document metadata." 
ON public.document_metadata 
FOR DELETE 
TO authenticated 
USING (true);