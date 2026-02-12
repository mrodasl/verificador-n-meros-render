// ========== SISTEMA MEJORADO DE USUARIOS ==========

// Configuración
const APP_CONFIG = {
    maxNumbersPerBatch: 50,
    delayBetweenRequests: 500,
    sessionTimeout: 30, // minutos
    maxMessageLength: 160, // caracteres por segmento
    statusCheckConfig: {
        initialDelay: 5000,
        checkInterval: 10000,
        maxAttempts: 30,
        finalStates: ['delivered', 'undelivered', 'failed', 'canceled']
    }
};

// Estado de la aplicación
let appState = {
    currentUser: null,
    results: [],
    isProcessing: false,
    inactivityTimer: null,
    currentMessage: ''
};

// Usuario SUPER ADMIN por defecto
const SUPER_ADMIN = {
    email: 'admin@oim.org.gt',
    password: 'admin123',
    name: 'Administrador OIM',
    role: 'superadmin',
    department: 'TI',
    createdAt: new Date().toISOString()
};

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM cargado, inicializando aplicación...');
    initializeApp();
});

function initializeApp() {
    console.log('🔧 Inicializando aplicación...');
    
    initializeUsers();
    
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            appState.currentUser = JSON.parse(savedUser);
            console.log('👤 Usuario en sesión:', appState.currentUser.email);
            startInactivityTimer();
            showApp();
        } catch (error) {
            console.error('Error parseando usuario guardado:', error);
            localStorage.removeItem('currentUser');
            showLogin();
        }
    } else {
        console.log('🔐 No hay sesión activa');
        showLogin();
    }
    
    setupEventListeners();
}

function initializeUsers() {
    const storedUsers = localStorage.getItem('platformUsers');
    if (!storedUsers) {
        console.log('👥 Creando usuario super admin por primera vez');
        const initialUsers = [SUPER_ADMIN];
        localStorage.setItem('platformUsers', JSON.stringify(initialUsers));
    } else {
        console.log('✅ Usuarios ya existen en localStorage');
    }
}

function getUsers() {
    const storedUsers = localStorage.getItem('platformUsers');
    if (!storedUsers) return [SUPER_ADMIN];
    try {
        return JSON.parse(storedUsers);
    } catch {
        return [SUPER_ADMIN];
    }
}

function saveUsers(users) {
    try {
        localStorage.setItem('platformUsers', JSON.stringify(users));
    } catch (error) {
        console.error('❌ Error guardando usuarios:', error);
    }
}

function setupEventListeners() {
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    if (emailInput && passwordInput) {
        emailInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') login(); });
        passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') login(); });
    }
    
    const numbersInput = document.getElementById('numbersInput');
    if (numbersInput) {
        numbersInput.addEventListener('input', updateNumberCount);
    }
    
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('input', updateMessageCounter);
    }
}

// ========== SISTEMA DE MENSAJERÍA ==========

function updateMessageCounter() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) return;
    
    const message = messageInput.value;
    const charCount = message.length;
    const maxChars = APP_CONFIG.maxMessageLength;
    const segments = Math.ceil(charCount / maxChars);
    
    const charCountElement = document.getElementById('charCount');
    const segmentCountElement = document.getElementById('segmentCount');
    
    if (charCountElement) {
        charCountElement.textContent = charCount;
        charCountElement.style.color = charCount > maxChars ? '#e53e3e' : charCount > maxChars * 0.8 ? '#dd6b20' : '#38a169';
    }
    
    if (segmentCountElement) {
        segmentCountElement.textContent = segments;
        segmentCountElement.style.color = segments > 3 ? '#e53e3e' : segments > 1 ? '#dd6b20' : '#38a169';
    }
    
    appState.currentMessage = message;
}

// ========== AUTENTICACIÓN ==========

function login() {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;

    if (!email || !password) {
        showError('Por favor completa todos los campos');
        return;
    }

    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        appState.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        startInactivityTimer();
        showApp();
        clearError();
    } else {
        showError('Credenciales incorrectas. Por favor verifica tu correo y contraseña.');
    }
}

function logout() {
    clearInactivityTimer();
    appState.currentUser = null;
    localStorage.removeItem('currentUser');
    showNotification('Sesión cerrada correctamente', 'success');
    setTimeout(() => showLogin(), 1000);
}

function showLogin() {
    document.getElementById('loginContainer').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
    
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    clearError();
}

// ========== SISTEMA DE INACTIVIDAD ==========

function startInactivityTimer() {
    clearInactivityTimer();
    const timeoutMinutes = parseInt(localStorage.getItem('sessionTimeout') || APP_CONFIG.sessionTimeout);
    const timeoutMs = timeoutMinutes * 60 * 1000;
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetInactivityTimer, true));
    
    appState.inactivityTimer = setTimeout(() => {
        showNotification(`Sesión cerrada por inactividad (${timeoutMinutes} minutos)`, 'warning');
        logout();
    }, timeoutMs);
}

function resetInactivityTimer() {
    if (appState.currentUser) startInactivityTimer();
}

function clearInactivityTimer() {
    if (appState.inactivityTimer) {
        clearTimeout(appState.inactivityTimer);
        appState.inactivityTimer = null;
    }
}

function updateSessionTimeout() {
    const timeoutInput = document.getElementById('sessionTimeout');
    const newTimeout = parseInt(timeoutInput.value);
    if (newTimeout >= 5 && newTimeout <= 120) {
        localStorage.setItem('sessionTimeout', newTimeout.toString());
        startInactivityTimer();
        showNotification(`Timeout de sesión actualizado a ${newTimeout} minutos`, 'success');
    } else {
        showError('El tiempo debe estar entre 5 y 120 minutos');
    }
}

// ========== PANEL DE ADMINISTRACIÓN ==========

function showAdminPanel() {
    document.getElementById('appContainer').classList.add('hidden');
    document.getElementById('adminPanel').classList.remove('hidden');
    document.getElementById('adminCurrentUser').textContent = appState.currentUser.name;
    loadUsersList();
    document.getElementById('sessionTimeout').value = localStorage.getItem('sessionTimeout') || APP_CONFIG.sessionTimeout;
}

function hideAdminPanel() {
    document.getElementById('adminPanel').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
}

function loadUsersList() {
    const users = getUsers();
    const usersList = document.getElementById('usersList');
    if (!usersList) return;
    
    usersList.innerHTML = users.map(user => `
        <div class="user-item ${user.role === 'superadmin' ? 'superadmin' : ''}">
            <div class="user-info">
                <strong>${user.name}</strong>
                <span class="user-email">${user.email}</span>
                <span class="user-role">${getRoleBadge(user.role)}</span>
                <span class="user-created">Creado: ${new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            <div class="user-actions">
                ${user.role !== 'superadmin' ? `<button onclick="deleteUser('${user.email}')" class="btn-danger">Eliminar</button>` : '<em>Super Admin</em>'}
            </div>
        </div>
    `).join('');
}

function getRoleBadge(role) {
    const badges = {
        'superadmin': '<span class="badge superadmin-badge">Super Admin</span>',
        'admin': '<span class="badge admin-badge">Admin</span>',
        'user': '<span class="badge user-badge">Usuario</span>'
    };
    return badges[role] || badges.user;
}

function addNewUser() {
    const email = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const name = document.getElementById('newUserName').value.trim();
    const role = document.getElementById('newUserRole').value;

    if (!email || !password || !name) {
        showError('Todos los campos son requeridos');
        return;
    }
    if (!email.includes('@')) {
        showError('Por favor ingresa un correo válido');
        return;
    }

    const users = getUsers();
    if (users.find(u => u.email === email)) {
        showError('Este correo ya está registrado');
        return;
    }

    const newUser = {
        email, password, name, role,
        department: 'OIM Guatemala',
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);
    
    document.getElementById('newUserEmail').value = '';
    document.getElementById('newUserPassword').value = '';
    document.getElementById('newUserName').value = '';
    
    showNotification('Usuario agregado correctamente', 'success');
    loadUsersList();
}

function deleteUser(email) {
    if (email === 'admin@oim.org.gt') {
        showError('No se puede eliminar al Super Administrador');
        return;
    }
    if (confirm(`¿Estás seguro de que quieres eliminar al usuario ${email}?`)) {
        const users = getUsers().filter(u => u.email !== email);
        saveUsers(users);
        showNotification('Usuario eliminado correctamente', 'success');
        loadUsersList();
    }
}

// ========== INTERFAZ ==========

function showApp() {
    document.getElementById('loginContainer').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
    
    document.getElementById('currentUser').textContent = appState.currentUser.name;
    
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn && ['admin', 'superadmin'].includes(appState.currentUser.role)) {
        adminBtn.classList.remove('hidden');
    }
    
    document.getElementById('emailInput').value = '';
    document.getElementById('passwordInput').value = '';
    updateMessageCounter();
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

function showError(message) {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function clearError() {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
    }
}

// ========== PROCESAMIENTO DE NÚMEROS ==========

function updateNumberCount() {
    const input = document.getElementById('numbersInput').value;
    const numbers = parsePhoneNumbers(input);
    const count = numbers.length;
    document.getElementById('numberCount').textContent = `${count} números listos`;
    document.getElementById('numberCount').style.color = count > APP_CONFIG.maxNumbersPerBatch ? '#e53e3e' : '#38a169';
    if (count > APP_CONFIG.maxNumbersPerBatch) {
        document.getElementById('numberCount').textContent += ` (Máximo: ${APP_CONFIG.maxNumbersPerBatch})`;
    }
}

function parsePhoneNumbers(input) {
    return input.split('\n')
        .map(num => num.trim())
        .filter(num => num.length > 0 && num.replace(/\s+/g, '').startsWith('+502'))
        .slice(0, APP_CONFIG.maxNumbersPerBatch);
}

async function processNumbers() {
    if (appState.isProcessing) {
        alert('Ya hay un proceso en ejecución. Por favor espera.');
        return;
    }
    
    const numbers = parsePhoneNumbers(document.getElementById('numbersInput').value);
    const message = document.getElementById('messageInput').value.trim();
    
    if (numbers.length === 0) {
        alert('Por favor ingresa al menos un número telefónico válido de Guatemala (+502).');
        return;
    }
    if (!message) {
        alert('Por favor escribe un mensaje para enviar.');
        return;
    }
    if (numbers.length > APP_CONFIG.maxNumbersPerBatch) {
        alert(`Máximo ${APP_CONFIG.maxNumbersPerBatch} números por lote.`);
        return;
    }
    
    const segments = Math.ceil(message.length / APP_CONFIG.maxMessageLength);
    if (segments > 3 && !confirm(`El mensaje usa ${segments} segmentos (costo elevado). ¿Continuar?`)) {
        return;
    }
    
    appState.isProcessing = true;
    appState.results = [];
    
    const processBtn = document.getElementById('processBtn');
    processBtn.disabled = true;
    processBtn.textContent = `Enviando a ${numbers.length} contactos...`;
    
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';
    
    updateResultsCount(0, 0, numbers.length);
    
    for (let i = 0; i < numbers.length; i++) {
        const number = numbers[i];
        const progress = Math.round(((i + 1) / numbers.length) * 100);
        processBtn.textContent = `Enviando... ${progress}% (${i + 1}/${numbers.length})`;
        
        const resultItem = createResultItem(number, 'processing', 'Preparando envío...');
        resultsList.appendChild(resultItem);
        
        try {
            const result = await sendVerificationRequest(number, message);
            
            if (result.success && result.messageSid) {
                monitorMessageStatus(result.messageSid, number, resultItem);
                appState.results.push({
                    number,
                    success: null,
                    messageSid: result.messageSid,
                    initialStatus: result.initialStatus,
                    timestamp: new Date().toISOString(),
                    user: appState.currentUser.email,
                    message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
                    segments
                });
            } else {
                resultItem.className = 'result-item error';
                resultItem.innerHTML = `<div class="result-content"><strong>❌ ${number}</strong><span class="result-detail">Error: ${result.error}</span></div>`;
                appState.results.push({
                    number,
                    success: false,
                    error: result.error,
                    timestamp: new Date().toISOString(),
                    user: appState.currentUser.email,
                    message: message.substring(0, 50) + (message.length > 50 ? '...' : '')
                });
                updateLiveCounters();
            }
        } catch (error) {
            resultItem.className = 'result-item error';
            resultItem.innerHTML = `<div class="result-content"><strong>❌ ${number}</strong><span class="result-detail">Error de conexión: ${error.message}</span></div>`;
            appState.results.push({
                number,
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
                user: appState.currentUser.email,
                message: message.substring(0, 50) + (message.length > 50 ? '...' : '')
            });
            updateLiveCounters();
        }
        
        if (i < numbers.length - 1) await new Promise(resolve => setTimeout(resolve, APP_CONFIG.delayBetweenRequests));
    }
    
    processBtn.disabled = false;
    processBtn.textContent = '📤 Enviar Mensajes';
    appState.isProcessing = false;
    
    setTimeout(() => showFinalSummary(), 5000);
}

// ========== VERIFICACIÓN DE ESTADOS ==========

async function monitorMessageStatus(messageSid, phoneNumber, resultItem) {
    const { initialDelay, checkInterval, maxAttempts } = APP_CONFIG.statusCheckConfig;
    let attempts = 0;
    let lastStatus = '';
    
    const checkStatus = async () => {
        attempts++;
        try {
            const statusResponse = await fetch(`/api/message-status?messageSid=${messageSid}&t=${Date.now()}`);
            if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                if (statusData.success) {
                    lastStatus = statusData.status;
                    updateMessageStatusInUI(phoneNumber, statusData.status, messageSid, resultItem);
                    
                    const resultIndex = appState.results.findIndex(r => r.number === phoneNumber);
                    if (resultIndex !== -1) {
                        appState.results[resultIndex].finalStatus = statusData.status;
                        appState.results[resultIndex].success = (statusData.status === 'delivered');
                        appState.results[resultIndex].lastCheck = new Date().toISOString();
                        updateLiveCounters();
                    }
                    
                    if (isFinalStatus(statusData.status)) return;
                }
            }
        } catch (error) {
            console.error(`Error verificando estado: ${error}`);
        }
        
        if (attempts < maxAttempts && !isFinalStatus(lastStatus)) {
            setTimeout(checkStatus, checkInterval);
        } else {
            let finalStatus = lastStatus;
            let finalSuccess = (lastStatus === 'delivered');
            if (lastStatus === 'sent' && attempts >= maxAttempts) {
                finalStatus = 'sent_timeout';
                finalSuccess = false;
            }
            updateMessageStatusInUI(phoneNumber, finalStatus, messageSid, resultItem);
            const resultIndex = appState.results.findIndex(r => r.number === phoneNumber);
            if (resultIndex !== -1) {
                appState.results[resultIndex].success = finalSuccess;
                appState.results[resultIndex].finalStatus = finalStatus;
            }
            updateLiveCounters();
        }
    };
    
    setTimeout(checkStatus, initialDelay);
}

function isFinalStatus(status) {
    return ['delivered', 'undelivered', 'failed', 'canceled'].includes(status);
}

function updateMessageStatusInUI(phoneNumber, status, messageSid, resultItem) {
    const statusMap = {
        'queued': { class: 'processing', text: '⏳ En cola de envío...', emoji: '⏳' },
        'sending': { class: 'processing', text: '📤 Enviando a operador...', emoji: '📤' },
        'sent': { class: 'processing', text: '✅ Enviado al operador', emoji: '✅' },
        'delivered': { class: 'success', text: '📱 ENTREGADO al dispositivo', emoji: '📱' },
        'undelivered': { class: 'error', text: '❌ NO ENTREGADO - Número inactivo/apagado', emoji: '❌' },
        'failed': { class: 'error', text: '🚫 FALLADO - Error de red/operador', emoji: '🚫' },
        'timeout': { class: 'error', text: '⏰ Timeout - No se pudo verificar estado final', emoji: '⏰' },
        'sent_timeout': { class: 'error', text: '❌ NO ENTREGADO - Timeout después de múltiples intentos', emoji: '❌' }
    };
    const info = statusMap[status] || { class: 'processing', text: `Estado: ${status}`, emoji: '❓' };
    resultItem.className = `result-item ${info.class}`;
    resultItem.innerHTML = `<div class="result-content"><strong>${info.emoji} ${phoneNumber}</strong><span class="result-detail">${info.text}</span><small>SID: ${messageSid} | Estado: ${status}</small></div>`;
}

function createResultItem(number, status, message) {
    const item = document.createElement('div');
    item.className = `result-item ${status}`;
    item.innerHTML = `<div class="result-content"><strong>${status === 'processing' ? '⏳' : ''} ${number}</strong><span class="result-detail">${message}</span></div>`;
    return item;
}

// ========== BACKEND COMMUNICATION ==========

async function sendVerificationRequest(phoneNumber, message) {
    const backendUrl = '/api/send-sms'; // ← CORREGIDO (sin barra extra)
    try {
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                number: phoneNumber,
                user: appState.currentUser.email,
                message: message
            })
        });
        if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error en la solicitud:', error);
        return { success: false, error: 'No se pudo conectar con el servicio de mensajería' };
    }
}

function updateResultsCount(success, error, total) {
    document.getElementById('totalCount').textContent = total;
    document.getElementById('successCount').textContent = success;
    document.getElementById('errorCount').textContent = error;
}

function showFinalSummary() {
    const { success, error, pending } = calculateFinalResults();
    showCompletionMessage(success, error, pending);
}

function calculateFinalResults() {
    const success = appState.results.filter(r => r.success === true).length;
    const error = appState.results.filter(r => r.success === false).length;
    const pending = appState.results.filter(r => r.success === null).length;
    return { success, error, pending };
}

function updateLiveCounters() {
    const results = calculateFinalResults();
    document.getElementById('successCount').textContent = results.success;
    document.getElementById('errorCount').textContent = results.error;
    document.getElementById('totalCount').textContent = appState.results.length;
}

function showCompletionMessage(success, error, pending = 0) {
    const resultsList = document.getElementById('resultsList');
    const existing = document.querySelector('.completion-message');
    if (existing) existing.remove();
    
    const msg = document.createElement('div');
    msg.className = 'result-item success completion-message';
    let text = `Entregados: ${success} | Fallidos: ${error}`;
    if (pending > 0) text += ` | Pendientes: ${pending}`;
    msg.innerHTML = `<div class="result-content"><strong>🎉 Proceso de envío completado</strong><span class="result-detail">${text} | <button onclick="exportResults()" style="background: none; border: none; color: #3182ce; text-decoration: underline; cursor: pointer; font-weight: 500;">Exportar resultados</button></span></div>`;
    resultsList.appendChild(msg);
}

// ========== EXPORTACIÓN ==========

function exportResults() {
    if (appState.results.length === 0) {
        alert('No hay resultados para exportar.');
        return;
    }
    
    let csv = 'Número,Estado Final,MessageSID,Mensaje,Segmentos,Error,Timestamp,Usuario\n';
    appState.results.forEach(r => {
        const estado = r.success === true ? 'ENTREGADO' : r.success === false ? 'FALLADO' : 'PENDIENTE';
        csv += `"${r.number}",${estado},${r.messageSid || 'N/A'},"${(r.message || '').replace(/"/g, '""')}",${r.segments || 1},"${(r.error || '').replace(/"/g, '""')}",${r.timestamp},"${r.user}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `resultados_envio_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

window.addEventListener('error', e => console.error('Error global:', e.error));

// Exponer funciones globales
window.appState = appState;
window.processNumbers = processNumbers;
window.exportResults = exportResults;
window.login = login;
window.logout = logout;
window.showAdminPanel = showAdminPanel;
window.hideAdminPanel = hideAdminPanel;
window.addNewUser = addNewUser;
window.deleteUser = deleteUser;
window.updateSessionTimeout = updateSessionTimeout;
window.updateMessageCounter = updateMessageCounter;
