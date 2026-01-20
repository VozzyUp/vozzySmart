-- Storage bucket para cache de mídia de templates WhatsApp
-- Igual padrão CRM: INSERT com ON CONFLICT para ser idempotente

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('wa-template-media', 'wa-template-media', true, 52428800) -- 50MB limit
ON CONFLICT (id) DO NOTHING;

-- Policies para acesso ao bucket
-- Permite leitura pública (necessário para preview de mídia)
DROP POLICY IF EXISTS "wa_template_media_public_read" ON storage.objects;
CREATE POLICY "wa_template_media_public_read" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'wa-template-media');

-- Permite upload via service_role (backend)
DROP POLICY IF EXISTS "wa_template_media_service_upload" ON storage.objects;
CREATE POLICY "wa_template_media_service_upload" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'wa-template-media');

-- Permite delete via service_role (backend)
DROP POLICY IF EXISTS "wa_template_media_service_delete" ON storage.objects;
CREATE POLICY "wa_template_media_service_delete" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'wa-template-media');
