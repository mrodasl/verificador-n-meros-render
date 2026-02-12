// server.js - Servidor Express para Render (estructura plana)
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos DESDE LA RAÍZ (¡esto mantiene tu estructura!)
app.use(express.static(__dirname)); // 👈 Clave: sirve index.html, assets, etc.

// Configuración Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const TWILIO_SENDER_ID = process.env.TWILIO_SENDER_ID || 'OIM';

// Cache simple
const messageStatusCache = {};

// ---------- RUTAS API ----------
app.post('/api/send-sms', async (req, res) => {
  try {
    const { number, user, message } = req.body;
    const cleanedNumber = number.replace(/\s+/g, '');

    // Validaciones
    if (!cleanedNumber) return res.status(400).json({ success: false, error: 'Número requerido' });
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

    messageStatusCache[twilioMessage.sid] = {
      status: twilioMessage.status,
      number: cleanedNumber,
      user,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      messageSid: twilioMessage.sid,
      initialStatus: twilioMessage.status,
      number: cleanedNumber,
      user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/message-status', async (req, res) => {
  const { messageSid } = req.query;
  try {
    const message = await twilioClient.messages(messageSid).fetch();
    res.json({ success: true, status: message.status, messageSid });
  } catch {
    res.status(404).json({ success: false, error: 'No encontrado' });
  }
});

app.post('/api/sms-status', (req, res) => {
  const { MessageSid, MessageStatus } = req.body;
  if (MessageSid) {
    messageStatusCache[MessageSid] = { ...messageStatusCache[MessageSid], status: MessageStatus };
  }
  res.type('text/xml').send('<Response></Response>');
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
