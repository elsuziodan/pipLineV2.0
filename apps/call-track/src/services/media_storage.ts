import { supabaseAdmin } from '../config/supabase.js';
import { MetaClient } from '../whatsapp/meta_client.js';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

/**
 * downloadAndUploadMedia
 * ----------------------
 * Descarga un archivo multimedia desde Meta API y lo sube directamente
 * al bucket 'chat-media' de Supabase Storage.
 * 
 * @param mediaId - ID del media en Meta
 * @param clientId - UUID del cliente (para organizar el storage)
 * @param mediaType - 'audio' | 'image'
 * @returns La URL pública del archivo en Supabase Storage
 */
export async function downloadAndUploadMedia(
  mediaId: string,
  clientId: string,
  mediaType: 'audio' | 'image' | 'video'
): Promise<string> {
  try {
    console.log(`[MediaStorage] Iniciando transferencia de ${mediaType} (Meta ID: ${mediaId})`);

    // 1. Obtener URL de descarga desde Meta
    const mediaUrl = await MetaClient.getMediaUrl(mediaId);

    // 2. Descargar el buffer
    const response = await axios.get(mediaUrl, {
      responseType: 'arraybuffer',
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
    });

    const buffer = Buffer.from(response.data);
    const timestamp = Date.now();
    let extension = 'jpg';
    let folder = 'images';
    let contentType = 'image/jpeg';
    
    if (mediaType === 'audio') {
        extension = 'ogg'; folder = 'audios'; contentType = 'audio/ogg';
    } else if (mediaType === 'video') {
        extension = 'mp4'; folder = 'videos'; contentType = 'video/mp4';
    }

    const fileName = `${timestamp}.${extension}`;
    const storagePath = `${clientId}/${folder}/${fileName}`;

    // 3. Subir a Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('chat-media')
      .upload(storagePath, buffer, {
        contentType,
        upsert: true
      });

    if (error) {
      console.error('[MediaStorage] Error en upload:', error);
      throw new Error(`Supabase Storage Upload Error: ${error.message}`);
    }

    // 4. Generar y retornar URL pública
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('chat-media')
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;
    console.log(`[MediaStorage] ✅ Media disponible en: ${publicUrl}`);

    return publicUrl;
  } catch (err: any) {
    console.error(`[MediaStorage] ❌ Fallo crítico en la migración de media:`, err.message);
    throw err;
  }
}
