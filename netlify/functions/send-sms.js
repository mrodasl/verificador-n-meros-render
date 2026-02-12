const Twilio = require('twilio');

// Cache global compartido entre funciones
if (typeof global.messageStatusCache === 'undefined') {
    global.messageStatusCache = {};
}

exports.handler = async function(event, context) {
    // CONFIGURACIÓN CON SENDER ID ALFANUMÉRICO "OIM" PARA GUATEMALA
    const TWILIO_CONFIG = {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        senderId: process.env.TWILIO_SENDER_ID || 'OIM' // Sender ID alfanumérico para Guatemala
    };

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
        'Content-Type': 'application/json'
    };

    // Manejar preflight OPTIONS
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Endpoint para verificar estado de mensajes - CONSULTA DIRECTA A TWILIO
    if (event.httpMethod === 'GET' && event.queryStringParameters) {
        const { messageSid } = event.queryStringParameters;
        console.log('🔍 Consultando estado directo de Twilio para SID:', messageSid);
        
        try {
            // Consultar directamente a Twilio API para obtener el estado más reciente
            const client = new Twilio(TWILIO_CONFIG.accountSid, TWILIO_CONFIG.authToken);
            const message = await client.messages(messageSid).fetch();
            
            console.log(`📊 Estado directo de Twilio para ${messageSid}: ${message.status}`);
            
            // ACTUALIZAR CACHE CON ESTADO REAL DE TWILIO
            global.messageStatusCache[messageSid] = {
                status: message.status,
                number: message.to,
                timestamp: new Date().toISOString(),
                errorCode: message.errorCode,
                errorMessage: message.errorMessage,
                from: message.from,
                lastUpdated: new Date().toISOString(),
                source: 'twilio-api-direct'
            };
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    status: message.status,
                    messageSid: messageSid,
                    number: message.to,
                    timestamp: message.dateCreated,
                    errorCode: message.errorCode,
                    errorMessage: message.errorMessage,
                    source: 'twilio-api-direct'
                })
            };
            
        } catch (error) {
            console.error('❌ Error consultando Twilio API:', error);
            
            // Fallback al cache si Twilio API falla
            if (messageSid && global.messageStatusCache[messageSid]) {
                const cachedData = global.messageStatusCache[messageSid];
                console.log(`🔄 Usando cache como fallback para ${messageSid}: ${cachedData.status}`);
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        status: cachedData.status,
                        messageSid: messageSid,
                        number: cachedData.number,
                        timestamp: cachedData.timestamp,
                        errorCode: cachedData.errorCode,
                        errorMessage: cachedData.errorMessage,
                        source: 'cache-fallback'
                    })
                };
            }
            
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Message not found in Twilio API or cache'
                })
            };
        }
    }

    // Envío de SMS (POST original) con mensaje personalizado
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, error: 'Método no permitido' })
        };
    }

    try {
        const { number, user, message } = JSON.parse(event.body);
        const cleanedNumber = number.replace(/\s+/g, '');
        
        console.log(`📤 Enviando SMS via Sender ID: ${TWILIO_CONFIG.senderId}`);
        console.log(`👤 Destino: ${cleanedNumber} | Usuario: ${user}`);
        console.log(`📝 Mensaje (${message.length} caracteres): ${message}`);

        // Validaciones
        if (!cleanedNumber) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: 'Número requerido' })
            };
        }

        if (!message || message.trim() === '') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: 'Mensaje requerido' })
            };
        }

        // Validar formato de número guatemalteco
        if (!cleanedNumber.startsWith('+502')) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'El número debe ser de Guatemala (formato: +502 XXXXXXXX)' 
                })
            };
        }

        // Validar longitud del número
        if (cleanedNumber.length < 12 || cleanedNumber.length > 13) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Número inválido. Formato esperado: +502 XXXXXXXX' 
                })
            };
        }

        // Inicializar Twilio
        const client = new Twilio(TWILIO_CONFIG.accountSid, TWILIO_CONFIG.authToken);

        // Construir URL del webhook dinámicamente
        const webhookUrl = process.env.URL 
            ? `${process.env.URL}/.netlify/functions/sms-status`
            : 'https://your-app.netlify.app/.netlify/functions/sms-status';

        console.log('🔄 Webhook URL configurada:', webhookUrl);

        // ENVIAR SMS CON SENDER ID ALFANUMÉRICO "OIM" Y MENSAJE PERSONALIZADO
        const twilioMessage = await client.messages.create({
            body: message, // ← MENSAJE PERSONALIZADO DEL USUARIO
            from: TWILIO_CONFIG.senderId,  // ← SENDER ID ALFANUMÉRICO "OIM"
            to: cleanedNumber,
            statusCallback: webhookUrl,
            validityPeriod: 120, // 2 minutos máximo de intento
            // Parámetros específicos para Guatemala
            smartEncoded: true, // Mejor encoding para caracteres especiales
            forceDelivery: true // Forzar entrega
        });

        // Guardar en cache GLOBAL (compartido)
        global.messageStatusCache[twilioMessage.sid] = {
            status: twilioMessage.status, // Estado inicial: 'queued', 'sent', etc.
            number: cleanedNumber,
            user: user,
            message: message.substring(0, 100), // Guardar parte del mensaje
            timestamp: new Date().toISOString(),
            initialStatus: twilioMessage.status,
            from: TWILIO_CONFIG.senderId, // Guardar que se usó Sender ID
            senderId: TWILIO_CONFIG.senderId // Referencia adicional
        };

        // Limpiar cache antiguo
        cleanupOldCache();

        console.log(`✅ SMS enviado via ${TWILIO_CONFIG.senderId} a ${cleanedNumber}`);
        console.log(`📝 SID: ${twilioMessage.sid}, Estado inicial: ${twilioMessage.status}`);
        console.log(`📊 Tamaño del cache: ${Object.keys(global.messageStatusCache).length}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                messageSid: twilioMessage.sid,
                initialStatus: twilioMessage.status,
                senderId: TWILIO_CONFIG.senderId, // Informar qué Sender ID se usó
                number: cleanedNumber,
                user: user,
                messageLength: message.length,
                segments: Math.ceil(message.length / 160), // Calcular segmentos
                timestamp: new Date().toISOString(),
                note: 'Mensaje enviado con Sender ID alfanumérico OIM'
            })
        };

    } catch (error) {
        console.error('❌ Error enviando SMS con Sender ID:', error);
        
        let errorMessage = 'Error interno del servidor';
        let statusCode = 500;

        // ERRORES ESPECÍFICOS DE SENDER ID
        if (error.code === 21212) {
            errorMessage = 'Sender ID "OIM" no válido o no aprobado para Guatemala';
            statusCode = 400;
        } else if (error.code === 21214) {
            errorMessage = 'Sender ID demasiado largo (máx 11 caracteres)';
            statusCode = 400;
        } else if (error.code === 21611) {
            errorMessage = 'Sender ID no soportado por el operador del destinatario';
            statusCode = 400;
        } else if (error.code === 21211) {
            errorMessage = 'Número telefónico inválido';
            statusCode = 400;
        } else if (error.code === 21408) {
            errorMessage = 'No tienes permisos para enviar SMS a este número';
            statusCode = 403;
        } else if (error.code === 21610) {
            errorMessage = 'El número ha bloqueado los mensajes SMS';
            statusCode = 400;
        } else if (error.code === 21612) {
            errorMessage = 'No se puede enviar SMS a números landline (fijos)';
            statusCode = 400;
        } else if (error.message.includes('Authentication Error')) {
            errorMessage = 'Error de autenticación con Twilio';
            statusCode = 500;
        } else if (error.message.includes('Alpha Sender')) {
            errorMessage = 'Problema con el Sender ID alfanumérico. Verifica que "OIM" esté aprobado.';
            statusCode = 400;
        } else if (error.code === 21614) {
            errorMessage = 'Mensaje muy largo. El SMS debe tener máximo 160 caracteres por segmento.';
            statusCode = 400;
        }

        return {
            statusCode: statusCode,
            headers,
            body: JSON.stringify({
                success: false,
                error: errorMessage,
                twilioErrorCode: error.code,
                twilioErrorMessage: error.message,
                suggestion: 'Verifica que el Sender ID "OIM" esté aprobado para Guatemala en Twilio Console'
            })
        };
    }
};

// Limpiar cache cada 24 horas
function cleanupOldCache() {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    Object.keys(global.messageStatusCache).forEach(sid => {
        const messageTime = new Date(global.messageStatusCache[sid].timestamp).getTime();
        if (now - messageTime > twentyFourHours) {
            console.log(`🧹 Limpiando cache antiguo: ${sid}`);
            delete global.messageStatusCache[sid];
        }
    });
}
