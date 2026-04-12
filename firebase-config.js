// CONFIGURACIÓN DE FIREBASE
// IMPORTANTE: Sustituye estos valores con los que obtengas de la consola de Firebase
// https://console.firebase.google.com/

const firebaseConfig = {
  apiKey: "AIzaSyBq7oBBC0AB0wixFzpOyzytPRWsVZwxew8",
  authDomain: "linkstack-3b79c.firebaseapp.com",
  projectId: "linkstack-3b79c",
  storageBucket: "linkstack-3b79c.firebasestorage.app",
  messagingSenderId: "679798323201",
  appId: "1:679798323201:web:9f47bba9ef51b8993ee800"
};

const WORKER_URL = "https://linkstack.armandogonzalez-dev.workers.dev/";

// Inicialización de Firebase
firebase.initializeApp(firebaseConfig);

// Instancias de servicios
const auth = firebase.auth();
const db = firebase.firestore();

// ============================================================
// UTILIDADES DE SEGURIDAD GLOBALES
// ============================================================

/** Escapa caracteres HTML peligrosos para prevenir XSS */
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/** Solo permite URLs con protocolo http/https */
function safeURL(url) {
    if (!url) return '#';
    try {
        const parsed = new URL(url);
        if (['http:', 'https:'].includes(parsed.protocol)) return parsed.href;
        return '#';
    } catch { return '#'; }
}

/** Valida nombre de ícono Lucide (solo letras minúsculas y guiones) */
function safeIcon(icon) {
    if (!icon) return 'link';
    if (icon.startsWith('http')) return icon;
    if (/^[a-z0-9-]+$/.test(icon)) return icon;
    return 'link';
}

/** Valida tipo y tamaño de archivo antes de subir */
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
function validateImageFile(file) {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        throw new Error('Formato no permitido. Solo: JPG, PNG, GIF, WebP.');
    }
    if (file.size > MAX_FILE_SIZE) {
        throw new Error('La imagen supera el límite de 5MB.');
    }
}
