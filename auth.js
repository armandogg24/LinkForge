// auth.js - Gestión de Autenticación y Modales
const modalContainer = document.getElementById('modal-container');
const authForms = document.getElementById('auth-forms');

const Auth = {
    showModal: (type) => {
        modalContainer.classList.remove('hidden');
        Auth.renderForm(type);
    },

    closeModal: () => {
        modalContainer.classList.add('hidden');
    },

    // Verifica si un nombre de usuario ya existe (colección atómica 'usernames')
    isUsernameTaken: async (username) => {
        const doc = await db.collection('usernames').doc(username.toLowerCase()).get();
        return doc.exists;
    },

    renderForm: (type) => {
        const isLogin = type === 'login';
        
        // Calcular el dominio base amigable (sin https://) para mostrar en la pre-visualización
        const friendlyBaseUrl = window.location.host + window.location.pathname.replace(/index\.html$/, '').replace(/\/$/, '') + '/';

        authForms.innerHTML = `
            <div style="text-align: center; margin-bottom: 2rem;">
                <h2 style="font-size: 1.8rem; margin-bottom: 0.5rem;">${isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}</h2>
                <p style="color: var(--text-dim); font-size: 0.95rem;">${isLogin ? 'Ingresa tus credenciales para continuar' : 'Únete a la nueva era de los enlaces'}</p>
            </div>
            
            <form id="form-auth" style="display: flex; flex-direction: column; gap: 1rem;">
                ${!isLogin ? `
                    <div class="username-field" style="position: relative;">
                        <input type="text" id="username" placeholder="Usuario (ej: tu_nombre)" required
                            class="input-field" style="margin-bottom: 0;"
                            pattern="[a-zA-Z0-9_.]+" title="Solo letras, números, puntos y guiones bajos">
                        <span id="username-status" style="position: absolute; right: 14px; top: 50%; transform: translateY(-50%); font-size: 1.2rem;"></span>
                    </div>
                    <p style="font-size: 0.85rem; color: var(--primary-light); text-align: center; margin-top: -0.5rem; margin-bottom: 0.5rem;">
                        Tu URL: <strong>${friendlyBaseUrl}?u=<span id="username-preview" style="color: white;">usuario</span></strong>
                    </p>
                ` : ''}
                
                <input type="email" id="email" placeholder="Correo electrónico" required class="input-field" style="margin-bottom: 0;">
                <input type="password" id="password" placeholder="Contraseña" required class="input-field" style="margin-bottom: 0;">
                
                <button type="submit" id="btn-submit-auth" class="btn-primary w-full" style="padding: 1rem; font-size: 1.05rem; margin-top: 0.5rem;">
                    ${isLogin ? 'Entrar a mi Panel' : 'Crear mi perfil'}
                </button>
            </form>
            
            <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--glass-border); text-align: center;">
                <p class="auth-switch" style="color: var(--text-dim); font-size: 0.95rem;">
                    ${isLogin ? '¿Aún no tienes tu LinkStack?' : '¿Ya tienes una cuenta?'} 
                    <br>
                    <a href="#" id="switch-auth" style="color: var(--primary-light); font-weight: 600; display: inline-block; margin-top: 0.5rem;">
                        ${isLogin ? 'Regístrate gratis' : 'Inicia sesión aquí'}
                    </a>
                </p>
            </div>
        `;

        document.getElementById('switch-auth').addEventListener('click', (e) => {
            e.preventDefault();
            Auth.renderForm(isLogin ? 'register' : 'login');
        });

        // Validación en tiempo real del nombre de usuario
        if (!isLogin) {
            let debounceTimer;
            const usernameInput = document.getElementById('username');
            const usernameStatus = document.getElementById('username-status');
            const usernamePreview = document.getElementById('username-preview');
            const btnSubmit = document.getElementById('btn-submit-auth');

            usernameInput.addEventListener('input', (e) => {
                const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
                usernameInput.value = val;
                usernamePreview.textContent = val || 'pepito';

                usernameStatus.textContent = '⏳';
                btnSubmit.disabled = true;

                clearTimeout(debounceTimer);
                if (val.length < 3) {
                    usernameStatus.textContent = '❌';
                    return;
                }

                debounceTimer = setTimeout(async () => {
                    const taken = await Auth.isUsernameTaken(val);
                    if (taken) {
                        usernameStatus.textContent = '❌';
                        usernameStatus.title = 'Este usuario ya está ocupado';
                        btnSubmit.disabled = true;
                    } else {
                        usernameStatus.textContent = '✅';
                        usernameStatus.title = '¡Usuario disponible!';
                        btnSubmit.disabled = false;
                    }
                }, 600); // Espera 600ms para no saturar Firebase con cada tecla
            });
        }

        document.getElementById('form-auth').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (isLogin) {
                auth.signInWithEmailAndPassword(email, password)
                    .then(() => Auth.closeModal())
                    .catch(err => alert('Error al iniciar sesión: ' + err.message));
            } else {
                const username = document.getElementById('username').value.toLowerCase();

                if (username.length < 3) {
                    return alert('El nombre de usuario debe tener al menos 3 caracteres.');
                }

                // Verificación visual previa (la definitiva es la transacción)
                const taken = await Auth.isUsernameTaken(username);
                if (taken) {
                    return alert('Ese nombre de usuario ya está ocupado. Por favor elige otro.');
                }

                try {
                    const cred = await auth.createUserWithEmailAndPassword(email, password);

                    // Reserva ATÓMICA del username via transacción Firestore
                    const usernameRef = db.collection('usernames').doc(username);
                    const userRef = db.collection('users').doc(cred.user.uid);
                    try {
                        await db.runTransaction(async (transaction) => {
                            const usernameDoc = await transaction.get(usernameRef);
                            if (usernameDoc.exists) throw new Error('NOMBRE_OCUPADO');
                            transaction.set(usernameRef, { uid: cred.user.uid });
                            transaction.set(userRef, {
                                name: username,
                                username: username,
                                bio: '¡Hola! Soy nuevo en Link Stack.',
                                links: [],
                                gallery: [],
                                theme: 'default',
                                photoURL: '',
                                createdAt: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        });
                    } catch (txErr) {
                        await cred.user.delete();
                        if (txErr.message === 'NOMBRE_OCUPADO') {
                            return alert('Ese nombre fue tomado en este preciso instante. Intenta con otro.');
                        }
                        throw txErr;
                    }

                    await cred.user.sendEmailVerification();
                    alert(`¡Cuenta creada! Hemos enviado un enlace de verificación a ${email}.`);
                    Auth.closeModal();
                } catch (err) {
                    alert('Error al registrarse: ' + err.message);
                }
            }
        });
    }
};

// Cerrar modal al hacer clic en X
document.querySelector('.close-modal').addEventListener('click', () => Auth.closeModal());
// Cerrar al hacer clic fuera del modal
modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) Auth.closeModal();
});
