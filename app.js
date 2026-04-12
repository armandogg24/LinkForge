// app.js - Enrutador y Lógica de Vistas
const appContainer = document.getElementById('app-container');
const navAuth = document.getElementById('nav-auth');
const navUser = document.getElementById('nav-user');

// Toast Notification System
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

const Views = {
    // 1. Landing Page (Hero)
    renderLanding: () => {
        appContainer.innerHTML = `
            <section class="hero glass-hero">
                <h1>Crea tu <span class="text-gradient">LinkForge</span> gratis.</h1>
                <p>Muestra todo lo que haces en un solo enlace profesional y personalizado.</p>
                <div class="hero-btns">
                    <button id="hero-start" class="btn-primary">Empieza ahora</button>
                </div>
            </section>
        `;
        document.getElementById('hero-start').addEventListener('click', () => {
            Auth.showModal('register');
        });
    },

    // 2. Cargando...
    renderLoading: () => {
        appContainer.innerHTML = '<div class="loader">Cargando...</div>';
    },

    // 3. Perfil Público
    renderProfile: async (username) => {
        const profileData = await Profile.fetchByUsername(username);
        if (!profileData) {
            appContainer.innerHTML = '<h1>Perfil no encontrado :(</h1>';
            return;
        }
        Profile.render(profileData);
    }
};

// Listener de Autenticación de Firebase
auth.onAuthStateChanged(user => {
    const urlParams = new URLSearchParams(window.location.search);
    const publicUser = urlParams.get('u');

    if (publicUser) {
        Views.renderProfile(publicUser);
        navAuth.classList.add('hidden');
        navUser.classList.add('hidden');
    } else {
        if (user) {
            navAuth.classList.add('hidden');
            navUser.classList.remove('hidden');
            Dashboard.render();
        } else {
            navUser.classList.add('hidden');
            navAuth.classList.remove('hidden');
            Views.renderLanding();
        }
    }
});

// Event Listeners Globales
document.getElementById('btn-login').addEventListener('click', () => Auth.showModal('login'));
document.getElementById('btn-register').addEventListener('click', () => Auth.showModal('register'));
document.getElementById('btn-logout').addEventListener('click', () => auth.signOut());
document.getElementById('btn-dashboard').addEventListener('click', () => Dashboard.render());
