// server.js - Servidor Express para Render (versión estable y segura)
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ========== MIDDLEWARES ==========
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos SÓLO desde la raíz, pero excluyendo archivos sensibles
// Esto mantiene tu estructura actual y evita que se descarguen server.js, netlify.toml, etc.
app.use((req, res, next) => {
    // Bloquear acceso directo a archivos de configuración y código fuente
    const blockedFiles = ['server.js', 'netlify.toml', 'package.json', 'package-lock.json', '.env'];
    const requestedFile = path.basename(req.path);
    if (blockedFiles.includes(requestedFile)) {
        return res.status(404).send('Not found');
    }
    next();
});
app.use(express.static(__dirname, {
    index: 'index.html', // Asegura que index.html sea el archivo por defecto
    extensions: ['html', 'htm']
}));

// ========== CONFIGURACIÓN TWILIO ==========
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);
const TWILIO_SENDER_ID = process.env.TWILIO_SENDER_ID || 'OIM';

// Cache simple en memoria (se perderá al reiniciar)
const messageStatusCache = {};

// ========== RUTAS API ==========

/**
 * POST /api/send-sms
 * Envía un SMS a través de Twilio con el mensaje personalizado
 */
app.post('/api/send-sms', async (req, res) => {
    try {
        const { number, user, message } = req.body;
        const cleanedNumber = number.replace(/\s+/g, '');

        // Validaciones
        if (!cleanedNumber) {
            return res.status(400).json({ success: false, error: 'Número requerido' });
        }
        if (!cleanedNumber.startsWith('+502')) {
            return res.status(400).json({ success: false, error: 'El número debe ser +502' });
        }

        const smsBody = message || `OIM: ¡Bienvenido a casa! Escríbenos a https://wa.me/50239359960`;

        const twilioMessage = await twilioClient.messages.create({
            body: smsBody,
            from: TWILIO_SENDER_ID,
            to: cleanedNumber,
            statusCallback: `${req.protocol}://${req.get('host')}/api/sms-status`
        });

        // Guardar en caché
        messageStatusCache[twilioMessage.sid] = {
            status: twilioMessage.status,
            number: cleanedNumber,
            user,
            timestamp: new Date().toISOString(),
            message: smsBody.substring(0, 50) // Solo un preview
        };

        console.log(`✅ SMS enviado a ${cleanedNumber}, SID: ${twilioMessage.sid}, estado: ${twilioMessage.status}`);

        res.json({
            success: true,
            messageSid: twilioMessage.sid,
            initialStatus: twilioMessage.status,
            number: cleanedNumber,
            user
        });

    } catch (error) {
        console.error('❌ Error enviando SMS:', error);
        let errorMessage = 'Error interno del servidor';
        let statusCode = 500;

        if (error.code === 21212) errorMessage = 'Sender ID "OIM" no válido o no aprobado';
        else if (error.code === 21211) errorMessage = 'Número inválido';
        else if (error.code === 21612) errorMessage = 'No se puede enviar a números fijos';

        res.status(statusCode).json({ success: false, error: errorMessage, code: error.code });
    }
});

/**
 * GET /api/message-status
 * Consulta el estado actual de un mensaje en Twilio
 */
app.get('/api/message-status', async (req, res) => {
    const { messageSid } = req.query;

    if (!messageSid) {
        return res.status(400).json({ success: false, error: 'messageSid es requerido' });
    }

    try {
        const message = await twilioClient.messages(messageSid).fetch();
        // Actualizar caché
        messageStatusCache[messageSid] = {
            ...messageStatusCache[messageSid],
            status: message.status,
            lastChecked: new Date().toISOString()
        };

        res.json({
            success: true,
            status: message.status,
            messageSid,
            number: message.to,
            errorCode: message.errorCode,
            errorMessage: message.errorMessage
        });
    } catch (error) {
        console.error('Error consultando Twilio:', error);
        // Fallback a caché
        if (messageStatusCache[messageSid]) {
            return res.json({
                success: true,
                status: messageStatusCache[messageSid].status,
                messageSid,
                number: messageStatusCache[messageSid].number,
                source: 'cache'
            });
        }
        res.status(404).json({ success: false, error: 'Mensaje no encontrado' });
    }
});

/**
 * POST /api/sms-status
 * Webhook para recibir actualizaciones de estado de Twilio
 */
app.post('/api/sms-status', (req, res) => {
    const { MessageSid, MessageStatus, To, ErrorCode, ErrorMessage } = req.body;

    console.log(`📱 Webhook recibido: ${To} -> ${MessageStatus} (${ErrorCode || 'sin error'})`);

    if (MessageSid) {
        messageStatusCache[MessageSid] = {
            ...messageStatusCache[MessageSid],
            status: MessageStatus,
            errorCode: ErrorCode,
            errorMessage: ErrorMessage,
            updatedAt: new Date().toISOString()
        };
    }

    // Twilio espera TwiML vacío
    res.type('text/xml').send('<Response></Response>');
});

/**
 * GET /api/sms-status
 * Solo para evitar errores 404 cuando alguien hace GET a esta URL
 */
app.get('/api/sms-status', (req, res) => {
    res.status(200).json({ 
        success: false, 
        error: 'Este endpoint solo acepta POST. Usa GET /api/message-status para consultar estados.' 
    });
});

/**
 * GET /favicon.ico
 * Evita errores 404 en el navegador
 */
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ========== INICIAR SERVIDOR ==========
app.listen(PORT, () => {
    console.log(`🚀 Servidor de OIM Guatemala corriendo en http://localhost:${PORT}`);
    console.log(`📱 Sender ID configurado: ${TWILIO_SENDER_ID}`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📁 Sirviendo archivos estáticos desde: ${__dirname}`);
});
