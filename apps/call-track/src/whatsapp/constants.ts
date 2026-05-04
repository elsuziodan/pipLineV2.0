/**
 * Guion de ventas para CallTrack Pro
 * IDENTIDAD DEL AGENTE: Sebastian (nunca Daniel)
 *
 * REGLAS DE ESTILO — obligatorias en todos los mensajes:
 *   - sin emojis nunca
 *   - sin mayusculas al inicio de oracion o parrafo
 *   - sin comas → usar ".." (2 puntos) en su lugar
 *   - preguntas: solo cerrar con "?" .. nunca abrir con "¿"
 *   - no responder despues de despedirse (el estado REJECTED/HANDOVER lo garantiza)
 *
 * ─── FLUJO COMPLETO ───────────────────────────────────────────────────────────
 *
 * FASE 1 — Plantilla aprobada por Meta (inicio en frio.. fuera de ventana 24h)
 *   → MetaClient.sendTemplateMessage(chatId, 'saludo_prospecto', 'es_MX', [nombre])
 *   La plantilla pregunta si es el numero del negocio y saluda por nombre.
 *   El bot ESPERA respuesta. Si responde → abre ventana de 24h → Fase 2.
 *
 * FASE 2 — Despues de que el cliente responde (dentro de ventana 24h)
 *   Paso A: Imagen del collage con caption-gancho (evalua interes visual)
 *           Caption: "con esta pagina podrias mostrar mejor tu negocio?"
 *   Paso B: msg1 → quien es Sebastian
 *   Paso C: msg2 → la propuesta (trabajo gratis por resena)
 *   → ESPERAR respuesta. Si muestra interes → Fase 3. Si rechaza → Salida negativa.
 *   NUNCA enviar enlaces en Fase 2. El interes se evalua aqui primero.
 *
 * FASE 3 — Climax (el cliente mostro interes en Fase 2)
 *   → Ofrecer solo llamada (no correo.. en Mexico "mandame por correo" = no educado)
 *   → Si el cliente acepta llamada: bridge + Telegram notify → silencio del bot
 *   → Si el cliente pide correo: tratar como EXIT educado
 *
 * NUNCA INVENTAR — si el cliente pregunta algo fuera del script:
 *   → Enviar HANDOVER_CONFUSED + Telegram notify → bot se calla
 * ──────────────────────────────────────────────────────────────────────────────
 */

export const COLLAGE_IMAGE_PATH = 'src/Public/mecanicos.png';

export const SCRIPT_VARIANTS = {

  // Fase 1: nombre de la plantilla registrada en Meta Business Manager
  // Variables de la plantilla: {{1}} = nombre del prospecto
  STEP_1_TEMPLATE_NAME: 'saludo_prospecto',

  // Fase 2: imagen + 2 mensajes de texto
  // SIN enlaces.. SIN emojis.. todo minusculas.. puntitos en lugar de comas
  STEP_2_PROPOSAL: {
    // Caption pegado a la imagen del collage — pregunta gancho
    img_caption: "con esta pagina podrias mostrar mejor tu negocio..",

    // Mensaje 1: presentacion de Sebastian
    msg1: "mi nombre es sebastian.. estoy empezando con un estudio de diseño",

    // Mensaje 2: la propuesta (intercambio de valor sin costo)
    msg2: "quisiera obsequiarte mi trabajo a cambio de una pequeña reseña positiva en mi pagina de facebook"
  },

  // Fase 3: climax — el cliente ya mostro interes.. solo ofrecemos llamada
  // NUNCA mencionar correo aqui
  STEP_3_CLIMAX: [
    "si gustas te marco y te explico brevemente como quedaria tu página..",
    "con gusto te puedo marcar cuando tengas un momento y te explico todo en 5 minutos.."
  ],

  // Bridge cuando el cliente acepta la llamada o muestra interes en el climax
  // Se envia ANTES de silenciar el bot y notificar a Telegram
  HANDOVER_CLIMAX_BRIDGE: [
    "perfecto.. en un momento mi jefe te marca para que personalmente te explique",
    "con mucho gusto.. en un momento mi jefe se comunica contigo para explicarte personalmente",
    "de acuerdo.. mi jefe te marca en un momento para explicarte todo personalmente"
  ],

  // Bridge cuando el cliente pregunta algo fuera del script o confuso
  // Sebastian no inventa — pasa al humano
  HANDOVER_CONFUSED: [
    "permíteme un momento.. mi jefe se comunicará contigo en breve para explicarte mejor",
    "con gusto.. mi jefe te contactará en un momento para resolver esa duda personalmente",
    "claro.. mi jefe se pone en contacto contigo en un momento para que te explique mejor"
  ],

  // Respuesta puente: el cliente confirmó implícitamente (pregunta de cortesía)
  // Se envía ANTES de avanzar automáticamente a Step 2
  // Estilo: sin emojis.. sin mayúsculas.. puntitos en lugar de comas
  RESPOND_BRIDGE: [
    "le tenemos una propuesta para su negocio.. permítame le platico brevemente",
    "claro.. le comento.. tenemos una propuesta que podría interesarle",
    "con gusto.. le tenemos una propuesta que creo le va a interesar.. le platico"
  ],

  // Salida negativa: sin insistir.. sin emojis.. dejar la puerta abierta
  NEGATIVE_RESPONSE: [
    // Rechazo directo
    "sin problema.. muchas gracias por tu tiempo.. quedamos a tus ordenes por si se te ofrece algo",
    "entendido.. muchas gracias.. cualquier cosa que se te ofrezca aqui estamos",
    // Rechazo educado tipo "por correo" (en Mexico = no gracias)
    "con mucho gusto.. en cuanto podamos le hacemos llegar la informacion.. muchas gracias por tu tiempo",
    // Rechazo tras seguimiento
    "claro.. no hay problema.. quedo a tus ordenes por si te surge algo mas adelante"
  ]
};

// Ruta local al collage (3 capturas de pantalla de pagina de muestra generica)
export const IMAGES = [
  COLLAGE_IMAGE_PATH
];
