# 📱 Sistema de Mensajería - OIM Guatemala

Sistema web para envío y verificación de mensajes SMS, diseñado específicamente para OIM Guatemala.

## 🚀 Características

- ✅ Envío de mensajes SMS personalizados
- 🔐 Sistema de autenticación con gestión de usuarios
- 👥 Panel de administración para gestionar usuarios
- 💬 Composición de mensajes con contador de caracteres
- 📊 Cálculo automático de segmentos (160 caracteres/segmento)
- ⏰ Timeout automático de sesión por inactividad
- 📊 Panel de resultados en tiempo real
- 📈 Exportación de resultados a CSV
- ☁️ Despliegue completamente en la nube
- 📱 Diseño responsive con tema OIM

## 🎨 Tema OIM Guatemala

- **Colores:** Azul institucional (#3182ce), con gradientes profesionales
- **Tipografía:** Inter (moderna, legible)
- **Espaciado:** Generoso para mejor usabilidad
- **Logo:** OIM Guatemala con gradiente azul

## 🛠️ Tecnologías Utilizadas

- **Frontend:** HTML5, CSS3, JavaScript vanilla
- **Backend:** Netlify Functions (Serverless)
- **SMS Service:** Twilio API con Sender ID "OIM"
- **Hosting:** Netlify
- **Almacenamiento:** localStorage para usuarios
- **Tipografía:** Google Fonts (Inter)

## 📋 Estructura de Archivos


## 🚀 Instalación y Despliegue

### 1. Configuración en GitHub
- Sube todos los archivos a tu repositorio
- Asegúrate de que la estructura de carpetas sea correcta

### 2. Configuración en Netlify
- Conecta tu repositorio de GitHub
- Configura las variables de entorno:
  - `TWILIO_ACCOUNT_SID` = tu_account_sid_de_twilio
  - `TWILIO_AUTH_TOKEN` = tu_auth_token_de_twilio  
  - `TWILIO_SENDER_ID` = OIM (Sender ID alfanumérico)

### 3. Configuración en Twilio
- Compra un número telefónico de Guatemala
- Solicita aprobación del Sender ID alfanumérico "OIM"
- Configura el webhook para estados de SMS

## 💬 Sistema de Mensajería

### Composición de Mensajes
- **Editor de texto:** Campo para escribir mensajes personalizados
- **Contador de caracteres:** Muestra 0/160 caracteres
- **Cálculo de segmentos:** Cada 160 caracteres = 1 segmento SMS
- **Validación:** Previene envío de mensajes vacíos

### Características del Mensaje
- **Longitud máxima:** 160 caracteres por segmento
- **Segmentos múltiples:** Soporte para mensajes largos
- **Caracteres especiales:** Soporta tildes, comas, símbolos
- **Espacios:** Incluidos en el conteo

## 👥 Gestión de Usuarios

### Roles Disponibles:
- **Super Admin:** Acceso completo, no se puede eliminar
- **Admin:** Puede gestionar usuarios y usar la aplicación
- **Usuario:** Solo puede usar la aplicación principal

### Usuario Super Admin por Defecto
- **Email:** admin@oim.org.gt
- **Contraseña:** admin123
- **Rol:** Super Administrador

### Agregar Nuevos Usuarios:
1. Inicia sesión como Super Admin o Admin
2. Haz clic en "👥 Admin"
3. Completa el formulario de nuevo usuario
4. Los usuarios nuevos podrán iniciar sesión inmediatamente

## ⏰ Configuración de Sesión

- **Timeout por defecto:** 30 minutos
- **Configurable:** 5-120 minutos
- **Se resetea con:** Cualquier interacción del usuario

## 📊 Resultados y Exportación

### Estados de Entrega:
- ✅ **Entregado:** Mensaje recibido en el dispositivo
- ⏳ **En proceso:** En cola/enviando al operador
- ❌ **No entregado:** Número inactivo/apagado
- 🚫 **Fallado:** Error de red/operador
- ⏰ **Timeout:** No se pudo verificar estado final

### Exportación de Resultados:
- Formato CSV compatible con Excel
- Incluye: número, estado, SID, mensaje, segmentos, timestamp, usuario
- Descarga automática al hacer clic en "Exportar resultados"

## 🐛 Solución de Problemas

### Si los estilos no cargan:
- Verifica que `assets/css/styles.css` exista
- Revisa las rutas en el HTML
- Verifica conexión a Google Fonts

### Si los SMS no se envían:
- Verifica las variables de entorno en Netlify
- Confirma que tu cuenta Twilio tenga crédito
- Verifica que el Sender ID "OIM" esté aprobado
- Revisa los logs en Netlify Functions

### Si el login falla:
- Usuario por defecto: admin@oim.org.gt / admin123
- Verifica que el usuario exista en localStorage
- Revisa la consola del navegador para errores

### Si el mensaje no se envía:
- Verifica que el mensaje no esté vacío
- Verifica que los números sean válidos (+502 XXXXXXXX)
- Verifica que no excedas el límite de caracteres

## 🔒 Seguridad

- Las contraseñas se almacenan en localStorage
- Sesiones automáticas con timeout
- Control de acceso por roles
- Protección contra inyección de datos

## 📞 Soporte

Para problemas técnicos, contactar al administrador del sistema de OIM Guatemala.

