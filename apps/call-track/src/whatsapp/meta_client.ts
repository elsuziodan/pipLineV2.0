import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';

dotenv.config({ path: '.env.local' });

const META_API_URL = 'https://graph.facebook.com/v20.0';
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.error('❌ Faltan credenciales de Meta en .env.local');
}

/**
 * Reintenta una función async con backoff exponencial.
 * Solo reintenta en errores transitorios (429, 500, 503).
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      if (attempt === maxRetries) throw err;
      const status = err.response?.status;
      if (status && ![429, 500, 503].includes(status)) throw err;
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.warn(`⏳ [MetaClient] Retry ${attempt + 1}/${maxRetries} en ${Math.round(delay)}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('[MetaClient] Reintentos agotados');
}

/**
 * Cliente centralizado para interactuar con WhatsApp Cloud API
 */
export const MetaClient = {

    /**
     * Envía un mensaje de texto libre
     * NOTA: Solo permitido dentro de la ventana de 24 hrs después de que el cliente escribió.
     */
    async sendTextMessage(toPhone: string, text: string) {
        try {
            const response = await retryWithBackoff(() =>
                axios.post(
                    `${META_API_URL}/${PHONE_NUMBER_ID}/messages`,
                    {
                        messaging_product: 'whatsapp',
                        recipient_type: 'individual',
                        to: toPhone,
                        type: 'text',
                        text: { preview_url: false, body: text }
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${ACCESS_TOKEN}`,
                            'Content-Type': 'application/json'
                        }
                    }
                )
            );
            return response.data;
        } catch (error: any) {
            console.error(`❌ Error enviando texto a ${toPhone}:`, error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Envía una plantilla pre-aprobada.
     * OBLIGATORIO para iniciar conversaciones en frío (fuera de la ventana de 24 hrs).
     *
     * Uso (Fase 1):
     *   await MetaClient.sendTemplateMessage(chatId, 'saludo_prospecto', 'es_MX', [prospecto.name]);
     *
     * La plantilla 'saludo_prospecto' debe estar aprobada en Meta Business Manager.
     * Variables: {{1}} = nombre del prospecto
     */
    async sendTemplateMessage(toPhone: string, templateName: string, languageCode: string = 'es_MX', variables: any[] = []) {
        try {
            const templatePayload: any = {
                name: templateName,
                language: { code: languageCode }
            };

            if (variables.length > 0) {
                templatePayload.components = [
                    {
                        type: 'body',
                        parameters: variables.map(v => {
                            if (typeof v === 'object') {
                                return v; // Ya es un objeto { type: 'text', parameter_name: '...', text: '...' }
                            }
                            return { type: 'text', text: v };
                        })
                    }
                ];
            }


            const response = await retryWithBackoff(() =>
                axios.post(
                    `${META_API_URL}/${PHONE_NUMBER_ID}/messages`,
                    {
                        messaging_product: 'whatsapp',
                        to: toPhone,
                        type: 'template',
                        template: templatePayload
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${ACCESS_TOKEN}`,
                            'Content-Type': 'application/json'
                        }
                    }
                )
            );
            return response.data;
        } catch (error: any) {
            if (error.response?.data) {
                console.error(`❌ Error Meta API (404/400):`, JSON.stringify(error.response.data, null, 2));
            } else {
                console.error(`❌ Error enviando plantilla a ${toPhone}:`, error.message);
            }
            throw error;
        }
    },

    /**
     * Sube una imagen local al Media API de Meta y devuelve el media_id.
     *
     * Flujo correcto para imágenes locales:
     *   1. uploadImageAsMediaId(rutaLocal)  → media_id
     *   2. sendImageByMediaId(phone, media_id, caption)
     *
     * Los media IDs de WhatsApp tienen un TTL de ~30 días.
     * Se puede cachear el media_id para no re-subir en cada envío.
     */
    async uploadImageAsMediaId(localFilePath: string): Promise<string> {
        const absolutePath = path.resolve(localFilePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`❌ Archivo de imagen no encontrado: ${absolutePath}`);
        }

        const form = new FormData();
        form.append('messaging_product', 'whatsapp');
        form.append('type', 'image/jpeg');
        form.append('file', fs.createReadStream(absolutePath), {
            filename: path.basename(absolutePath),
            contentType: 'image/jpeg'
        });

        try {
            const response = await axios.post(
                `${META_API_URL}/${PHONE_NUMBER_ID}/media`,
                form,
                {
                    headers: {
                        'Authorization': `Bearer ${ACCESS_TOKEN}`,
                        ...form.getHeaders()
                    }
                }
            );
            const mediaId: string = response.data.id;
            console.log(`📤 Imagen subida exitosamente. Media ID: ${mediaId}`);
            return mediaId;
        } catch (error: any) {
            console.error(`❌ Error subiendo imagen a Meta:`, error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Envía una imagen usando un media_id previamente obtenido con uploadImageAsMediaId().
     * Este es el método correcto para imágenes locales en la API oficial de Meta.
     */
    async sendImageByMediaId(toPhone: string, mediaId: string, caption?: string) {
        try {
            const payload: any = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: toPhone,
                type: 'image',
                image: { id: mediaId }
            };
            if (caption) payload.image.caption = caption;

            const response = await axios.post(
                `${META_API_URL}/${PHONE_NUMBER_ID}/messages`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error: any) {
            console.error(`❌ Error enviando imagen por mediaId a ${toPhone}:`, error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Envía una imagen por URL pública (HTTPS accesible públicamente).
     * NOTA: Para imágenes locales usar uploadImageAsMediaId() + sendImageByMediaId()
     */
    async sendImageByUrl(toPhone: string, imageUrl: string, caption?: string) {
        try {
            const payload: any = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: toPhone,
                type: 'image',
                image: { link: imageUrl }
            };
            if (caption) payload.image.caption = caption;

            const response = await axios.post(
                `${META_API_URL}/${PHONE_NUMBER_ID}/messages`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error: any) {
            console.error(`❌ Error enviando imagen a ${toPhone}:`, error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Obtiene la URL de descarga de un media_id.
     */
    async getMediaUrl(mediaId: string): Promise<string> {
        try {
            const response = await axios.get(`${META_API_URL}/${mediaId}`, {
                headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
            });
            return response.data.url;
        } catch (error: any) {
            console.error(`❌ Error obteniendo URL de media ${mediaId}:`, error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Descarga un archivo multimedia desde Meta y lo guarda localmente.
     */
    async downloadMedia(mediaId: string, localFilePath: string): Promise<void> {
        try {
            const url = await this.getMediaUrl(mediaId);
            const response = await axios({
                method: 'get',
                url: url,
                responseType: 'stream',
                headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
            });

            const writer = fs.createWriteStream(localFilePath);
            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
        } catch (error: any) {
            console.error(`❌ Error descargando media ${mediaId}:`, error.message);
            throw error;
        }
    }
};
