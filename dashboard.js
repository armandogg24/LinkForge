// dashboard.js - Gestión del Perfil de Usuario

const WORKER_URL = "https://linkstack.armandogonzalez-dev.workers.dev/";

async function uploadImageToExternal(file, customName = "") {
    const user = auth.currentUser;
    if (!user) throw new Error("Acceso denegado: Primero debes iniciar sesión.");

    // 🔑 Generar Token de Identidad Dinámico (Dura 1 hora y es único del usuario)
    const idToken = await user.getIdToken(true);

    validateImageFile(file);

    const formData = new FormData();
    formData.append("image", file);
    if (customName) formData.append("name", customName);
    
    const res = await fetch(WORKER_URL, { 
        method: "POST", 
        body: formData,
        headers: {
            "Authorization": `Bearer ${idToken}` // 👈 Token seguro e invisible para hackers
        }
    });
    if (!res.ok) throw new Error("Error de Seguridad: Solo usuarios de LinkStack pueden usar este servicio.");

    const data = await res.json();
    if (data.success) return data.data.url;
    throw new Error(data.error.message || "Fallo al subir archivo");
}

const Dashboard = {
    data: null,

    render: async () => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            // Fetch data from DB
            const doc = await db.collection('users').doc(user.uid).get();
            
            if (doc.exists) {
                const remoteData = doc.data();
                // Aseguramos que existan todos los campos necesarios para evitar crashes
                Dashboard.data = {
                    name: remoteData.name || "Usuario",
                    bio: remoteData.bio || "",
                    links: remoteData.links || [],
                    gallery: remoteData.gallery || [],
                    theme: remoteData.theme || "default",
                    username: remoteData.username || user.email.split('@')[0],
                    photoURL: remoteData.photoURL || ''
                };
            } else {
                // Si el documento por alguna razón no existe, creamos un estado inicial seguro
                Dashboard.data = { 
                    name: "Nuevo Usuario", 
                    bio: "¡Hola! Soy nuevo aquí.", 
                    links: [], 
                    gallery: [],
                    theme: "default", 
                    username: user.email ? user.email.split('@')[0] : 'user',
                    photoURL: ''
                };
            }

            const appContainer = document.getElementById('app-container');
            // ... resto del renderizado igual ...
            appContainer.innerHTML = `
                <div class="dashboard-container">
                    <aside class="dashboard-sidebar glass">
                        <h3>Dashboard</h3>
                        <nav class="sidebar-nav">
                            <button onclick="Dashboard.changeTab('links')" id="tab-links" class="tab-btn active"><i data-lucide="link"></i> Mis Enlaces</button>
                            <button onclick="Dashboard.changeTab('profile')" id="tab-profile" class="tab-btn"><i data-lucide="user"></i> Mi Perfil</button>
                            <button onclick="Dashboard.changeTab('vip')" id="tab-vip" class="tab-btn"><i data-lucide="zap"></i> Herramientas VIP</button>
                            <button onclick="Dashboard.changeTab('settings')" id="tab-settings" class="tab-btn"><i data-lucide="shield-check"></i> Ajustes de Cuenta</button>
                        </nav>
                    </aside>
                    <main class="dashboard-content" id="tab-content" style="position:relative;">
                        <div class="loader" style="text-align:center; padding: 2rem;">Cargando interfaz...</div>
                    </main>
                </div>
            `;
            
            Dashboard.changeTab('links');
        } catch (err) {
            console.error('CRITICAL ERROR LOADING DASHBOARD:', err);
            document.getElementById('app-container').innerHTML = `
                <div style="text-align:center; padding:3rem; color:var(--text-dim);">
                    <p>Error al cargar el panel.</p>
                    <small style="display:block; margin-top:1rem; opacity:0.7;">Detalle técnico: ${err.message}</small>
                    <button onclick="location.reload()" class="btn-secondary" style="margin-top:1rem;">Reintentar</button>
                </div>
            `;
        }
    },

    changeTab: (tabName) => {
        try {
            // Actualizar estados .active visuales
            const tabs = document.querySelectorAll('.tab-btn');
            if (tabs.length > 0) {
                tabs.forEach(btn => btn.classList.remove('active'));
                const targetTab = document.getElementById('tab-' + tabName);
                if (targetTab) targetTab.classList.add('active');
            }

            const content = document.getElementById('tab-content');
            if (!content) return;
            
            // Ruteros internos
            switch(tabName) {
                case 'links': Dashboard.renderTabLinks(content); break;
                case 'profile': Dashboard.renderTabProfile(content); break;
                case 'vip': Dashboard.renderTabVIP(content); break;
                case 'settings': Dashboard.renderTabSettings(content); break;
            }

            // Refrescar íconos con sistema de reintento
            if (window.lucide) {
                lucide.createIcons();
            } else {
                console.warn('Lucide no cargó a tiempo, reintentando en 1s...');
                setTimeout(() => {
                    if (window.lucide) lucide.createIcons();
                }, 1000);
            }
        } catch (err) {
            console.error('Error al cambiar de pestaña:', err);
        }
    },

    /* ----------------------------------------------------
       VISTAS DE PESTAÑAS (TABS RENDERING)
       ---------------------------------------------------- */

    renderTabLinks: (container) => {
        const data = Dashboard.data;
        // Calcular la URL base dinámicamente sin importar dónde esté alojado
        const baseUrl = window.location.origin + window.location.pathname.replace(/index\.html$/, '').replace(/\/$/, '') + '/';
        const shareUrl = baseUrl + '?u=' + data.username;

        container.innerHTML = `
            <h3>Mis Enlaces</h3>
            <div class="share-url" style="margin-bottom: 2rem;">
                <span>Tu link:</span><br>
                <a href="${shareUrl}" target="_blank" style="word-break: break-all; color: var(--primary-light); font-weight: 600;">${shareUrl}</a>
            </div>

            <div id="links-list" style="margin-bottom: 2rem;">
                ${data.links.length === 0 ? '<p style="color:var(--text-dim); text-align:center; padding: 2rem 0; border: 1px dashed var(--glass-border); border-radius: 12px;">Aún no tienes enlaces creados. ¡Añade el primero abajo!</p>' : ''}
                ${data.links.map((link, index) => {
                    const cleanIcon = safeIcon(link.icon);
                    return `
                    <div class="link-item glass">
                        <div class="link-info">
                            ${cleanIcon.startsWith('http') 
                                ? `<img src="${safeURL(cleanIcon)}" class="link-icon" style="border-radius: 4px; object-fit: cover;">` 
                                : `<i data-lucide="${cleanIcon}" class="link-icon"></i>`
                            }
                            <span>${escapeHTML(link.title)}</span>
                        </div>
                        <button onclick="Dashboard.removeLink(${index})" class="btn-text" style="color: #ef4444;">Borrar</button>
                    </div>
                `;}).join('')}
            </div>
            
            <form id="add-link-form" class="add-link" style="border-top: none; padding-top: 0; margin-top:0;">
                <p style="margin-bottom: 1rem; color: var(--text-dim); font-weight:600;">Agregar Nuevo Enlace</p>
                <select id="link-icon" class="input-field">
                    <option value="link">Enlace Genérico</option>
                    <option value="instagram">Instagram</option>
                    <option value="twitter">Twitter</option>
                    <option value="youtube">YouTube</option>
                    <option value="facebook">Facebook</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="github">GitHub</option>
                    <option value="message-circle">WhatsApp / Msg</option>
                    <option value="custom">🔥 Personalizado (Subir Imagen)</option>
                </select>
                <div id="custom-icon-container" class="hidden" style="margin-bottom: 1.5rem;">
                    <label for="custom-icon-file" class="btn-secondary w-full" style="cursor:pointer; display:flex; justify-content:center;">📁 Seleccionar y Subir Ícono (PC)</label>
                    <input type="file" id="custom-icon-file" class="hidden" accept="image/*">
                    <span id="custom-icon-status" style="display:block; text-align:center; font-size:0.85rem; margin-top:8px; color:var(--primary-light)"></span>
                </div>
                <input type="text" id="link-title" placeholder="Título (ej: Mi Instagram)" required class="input-field">
                <input type="text" id="link-url" placeholder="URL (ej: instagram.com/tu-usuario)" required class="input-field">
                <button type="submit" class="btn-secondary w-full">+ Añadir al panel</button>
            </form>
        `;

        document.getElementById('link-icon').onchange = (e) => {
            const isCustom = e.target.value === 'custom';
            const container = document.getElementById('custom-icon-container');
            const fileInput = document.getElementById('custom-icon-file');
            if(isCustom) {
                container.classList.remove('hidden'); fileInput.required = true;
            } else {
                container.classList.add('hidden'); fileInput.required = false;
            }
        };

        document.getElementById('custom-icon-file').onchange = (e) => {
            const status = document.getElementById('custom-icon-status');
            status.textContent = e.target.files.length > 0 ? '✅ Archivo seleccionado: ' + e.target.files[0].name : '';
        };

        document.getElementById('add-link-form').onsubmit = (e) => Dashboard.addLink(e);
    },

    renderTabProfile: (container) => {
        const data = Dashboard.data;
        container.innerHTML = `
            <h3>Mi LinkStack</h3>
            <div class="profile-upload-container" style="border:none; padding-bottom: 0; display: flex; align-items: center; gap: 1.5rem;">
                <div id="profile-preview-container">
                    ${data.photoURL 
                        ? `<img src="${safeURL(data.photoURL)}" id="profile-preview" class="profile-img-small">` 
                        : `<div class="profile-placeholder-small" id="profile-preview"><i data-lucide="user" style="width: 40px; height: 40px;"></i></div>`
                    }
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button id="btn-change-photo" class="btn-secondary btn-sm">Cambiar Foto</button>
                    ${data.photoURL ? `<button id="btn-delete-photo" class="btn-secondary btn-sm" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.2);">Eliminar Foto</button>` : ''}
                </div>
                <input type="file" id="file-input" class="hidden" accept="image/*">
            </div>

            <div style="margin-top: 2rem;">
                <label style="color:var(--text-dim); font-size:0.85rem; margin-left: 0.5rem;">Nombre a mostrar</label>
                <input type="text" id="edit-name" value="${escapeHTML(data.name)}" placeholder="Ej: Armando Gonzalez" class="input-field">
                
                <label style="color:var(--text-dim); font-size:0.85rem; margin-left: 0.5rem;">Nombre de usuario</label>
                <input type="text" id="edit-username" value="${escapeHTML(data.username)}" placeholder="Tu arroba" class="input-field">
                
                <label style="color:var(--text-dim); font-size:0.85rem; margin-left: 0.5rem;">Biografía u ocupación</label>
                <textarea id="edit-bio" placeholder="Cuenta un poco sobre ti" class="input-field" style="min-height: 120px;">${escapeHTML(data.bio)}</textarea>
                
                <button id="save-profile" class="btn-primary w-full">Guardar</button>
            </div>
        `;

        document.getElementById('btn-change-photo').onclick = () => document.getElementById('file-input').click();
        if (document.getElementById('btn-delete-photo')) {
            document.getElementById('btn-delete-photo').onclick = () => Dashboard.deletePhoto();
        }
        document.getElementById('file-input').onchange = (e) => Dashboard.uploadPhotoExternal(e);
        document.getElementById('save-profile').onclick = () => Dashboard.saveProfile();
    },

    renderTabVIP: (container) => {
        container.innerHTML = `
            <h3>Herramientas VIP 🚀</h3>
            <p style="color:var(--text-dim); margin-bottom:2rem; font-size:0.95rem;">
                Integra complementos avanzados directamente en tu página pública. Las operaciones como subida de fotos impactan inmediatamente en tu muro.
            </p>
            
            <div class="vip-tools-grid">
                <div class="whatsapp-tool vip-card">
                    <p class="vip-card-title"><i data-lucide="message-circle" style="width:18px;"></i> WhatsApp Linker</p>
                    <input type="text" id="wa-phone" placeholder="Número global (ej: 54911...)" class="input-field sm">
                    <input type="text" id="wa-text" placeholder="Mensaje inicial predefinido" class="input-field sm">
                    <button id="btn-copy-wa" class="btn-secondary btn-sm w-full">Copiar Enlace Activo</button>
                </div>

                <div class="gallery-tool vip-card">
                    <p class="vip-card-title"><i data-lucide="image" style="width:18px;"></i> Subir a Galería</p>
                    <button id="btn-add-gallery" class="btn-secondary btn-sm w-full" style="margin-top: auto; padding: 1.2rem;">+ Seleccionar Archivo Fotográfico</button>
                    <input type="file" id="gallery-input" class="hidden" accept="image/*">
                </div>
            </div>
        `;

        document.getElementById('btn-copy-wa').onclick = async () => {
            const phone = document.getElementById('wa-phone').value.replace(/[^0-9]/g, '');
            const text = document.getElementById('wa-text').value;
            if(!phone) { alert('Por favor, ingresa un número de teléfono válido.'); return; }
            const link = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
            try {
                await navigator.clipboard.writeText(link);
                alert('¡Enlace copiado al portapapeles!');
            } catch {
                prompt('No se pudo copiar automáticamente. Copia este enlace:', link);
            }
        };

        document.getElementById('btn-add-gallery').onclick = () => document.getElementById('gallery-input').click();
        document.getElementById('gallery-input').onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const user = auth.currentUser;
            const doc = await db.collection('users').doc(user.uid).get();
            const gallery = doc.exists ? doc.data().gallery || [] : [];
            if (gallery.length >= 30) { alert('Has alcanzado el límite de 30 imágenes en tu galería.'); return; }
            const username = Dashboard.data.username;
            
            alert('Enviando capa fotográfica a la nube secreta...');
            try {
                const imgName = `LinkStack_Galeria_${username}_${Date.now()}`;
                const externalUrl = await uploadImageToExternal(file, imgName);
                gallery.push(externalUrl);
                await db.collection('users').doc(user.uid).update({ gallery });
                alert('¡Imagen procesada y enviada a tu galería pública correctamente!');
            } catch (err) {
                alert('Error al subir la fotografía: ' + err.message);
            }
        };
    },

    renderTabSettings: (container) => {
        const data = Dashboard.data;
        container.innerHTML = `
            <h3>Configuración Visual</h3>
            <div style="background: rgba(255,255,255,0.02); padding: 1.5rem; border-radius: 16px; border: 1px solid var(--glass-border); margin-bottom: 2.5rem;">
                <p style="margin-bottom: 12px; font-weight: 600; color: var(--text-dim); font-size:0.9rem;">Paleta de Colores (Tema del Muro Público)</p>
                <select id="edit-theme" class="input-field" style="margin-bottom:1rem;">
                    <option value="default" ${data.theme === 'default' ? 'selected' : ''}>Oscuro Estándar (Basalto)</option>
                    <option value="nebula" ${data.theme === 'nebula' ? 'selected' : ''}>Nebula Vacio (Gamer/Premium)</option>
                    <option value="midnight" ${data.theme === 'midnight' ? 'selected' : ''}>Midnight Ejecutivo (Premium)</option>
                </select>
                <button id="save-theme" class="btn-primary w-full">Guardar Estilo Público</button>
            </div>

            <h3>Seguridad de la Cuenta</h3>
            <div style="background: rgba(255,255,255,0.02); padding: 1.5rem; border-radius: 16px; border: 1px solid var(--glass-border); display: flex; flex-direction: column; gap: 0.8rem;">
                <p style="font-size: 0.9rem; color: var(--text-dim); margin-bottom: 0.5rem; line-height: 1.5;">
                    Cualquier intento de alteración de credenciales requerirá validación de inicio de sesión reciente para evitar secuestros (Hijacking). Firebase lo auditará por debajo de la mesa.
                </p>
                <button onclick="Settings.changePassword()" class="btn-secondary w-full">🔑 Cambiar Contraseña</button>
                <button onclick="Settings.changeEmail()" class="btn-secondary w-full">✉️ Solicitar Migración de Correo</button>
                <button onclick="Settings.verifyEmail()" class="btn-secondary w-full">✅ Re-enviar Solicitud de Verificación de Email Inicial</button>
                
                <hr style="border: none; border-top: 1px solid var(--glass-border); margin: 1rem 0;">
                
                <button onclick="Settings.deleteAccount()" class="btn-secondary w-full" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.4);">
                    🗑️ Borrar Todo Permanentemente (ZONA ROJA)
                </button>
            </div>
        `;

        document.getElementById('save-theme').onclick = async () => {
            const theme = document.getElementById('edit-theme').value;
            await db.collection('users').doc(auth.currentUser.uid).set({ theme }, { merge: true });
            Dashboard.data.theme = theme; // Actualizar cache local
            alert('¡El diseño externo de tu página ha cambiado!');
        };
    },

    /* ----------------------------------------------------
       LÓGICA HEREDADA DEL DASHBOARD
       ---------------------------------------------------- */

    uploadPhotoExternal: async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const user = auth.currentUser;
        try {
            alert('Enviando y encriptando imagen vía Cloudflare...');
            const imgName = `LinkStack_Perfil_${Dashboard.data.username}`;
            const externalUrl = await uploadImageToExternal(file, imgName);
            
            await db.collection('users').doc(user.uid).update({ photoURL: externalUrl });
            document.getElementById('profile-preview-container').innerHTML = `<img src="${externalUrl}" id="profile-preview" class="profile-img-small">`;
            Dashboard.renderTabProfile(document.getElementById('tab-content')); // Re-render to show delete button
            alert('¡Foto de rostro procesada con brillantez!');
        } catch (err) {
            alert('Error al subir avatar: ' + err.message);
        }
    },

    deletePhoto: async () => {
        if (!confirm('¿Estás seguro de que quieres eliminar tu foto de perfil?')) return;
        const user = auth.currentUser;
        try {
            await db.collection('users').doc(user.uid).update({ photoURL: '' });
            Dashboard.data.photoURL = '';
            Dashboard.renderTabProfile(document.getElementById('tab-content'));
            alert('Foto de perfil eliminada.');
        } catch (err) {
            alert('Error al eliminar foto: ' + err.message);
        }
    },

    saveProfile: async () => {
        const user = auth.currentUser;
        const name = document.getElementById('edit-name').value.trim();
        const newUsername = document.getElementById('edit-username').value.toLowerCase().trim().replace(/[^a-z0-9_.]/g, '');
        const bio = document.getElementById('edit-bio').value.trim();

        if (newUsername.length < 3) return alert('El sistema exige que tu nombre público tenga al menos 3 caracteres.');

        const currentUsername = Dashboard.data.username;
        if (newUsername !== currentUsername) {
            const newRef = db.collection('usernames').doc(newUsername);
            const oldRef = db.collection('usernames').doc(currentUsername);
            try {
                await db.runTransaction(async (transaction) => {
                    const existing = await transaction.get(newRef);
                    if (existing.exists) throw new Error('NOMBRE_OCUPADO');
                    transaction.delete(oldRef);
                    transaction.set(newRef, { uid: user.uid });
                    transaction.set(db.collection('users').doc(user.uid), {
                        name, username: newUsername, bio
                    }, { merge: true });
                });
            } catch (txErr) {
                if (txErr.message === 'NOMBRE_OCUPADO') return alert(`El nombre /?u=${newUsername} ya está reservado.`);
                return alert('Error al cambiar nombre: ' + txErr.message);
            }
        } else {
            await db.collection('users').doc(user.uid).set({
                name, username: newUsername, bio
            }, { merge: true });
        }

        Dashboard.data.name = name;
        Dashboard.data.username = newUsername;
        Dashboard.data.bio = bio;

        alert('¡Cambios aplicados correctamente. Estás listo!');
    },

    addLink: async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        const title = document.getElementById('link-title').value.trim();
        let url = document.getElementById('link-url').value.trim();
        const iconSelect = document.getElementById('link-icon').value;
        let icon = iconSelect;

        if (Dashboard.data.links.length >= 20) return alert('Máximo 20 enlaces permitidos.');

        if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;

        // Validar que la URL sea segura
        if (safeURL(url) === '#') return alert('URL no válida. Solo se permiten enlaces http/https.');

        if (iconSelect === 'custom') {
            const fileInput = document.getElementById('custom-icon-file').files[0];
            if (!fileInput) return alert('Debes elegir qué gráfico/logo de la PC vas usar para ese enlace');
            
            const btnSubmit = e.target.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Tratando icono remoto...';
            
            try {
                const imgName = `LinkStack_Icono_${Dashboard.data.username}_${Date.now()}`;
                icon = await uploadImageToExternal(fileInput, imgName);
            } catch (err) {
                btnSubmit.disabled = false;
                btnSubmit.textContent = '+ Añadir al panel';
                return alert('Hubo una falta de red al emitir la foto: ' + err.message);
            }
        }
        
        Dashboard.data.links.push({ title, url, icon });
        await db.collection('users').doc(user.uid).update({ links: Dashboard.data.links });
        
        Dashboard.changeTab('links'); // Recargar el HTML del tab enlaces
    },

    removeLink: async (index) => {
        const user = auth.currentUser;
        Dashboard.data.links.splice(index, 1);
        await db.collection('users').doc(user.uid).update({ links: Dashboard.data.links });
        Dashboard.changeTab('links');
    }
};

// -----------------------------------------------------------------------------
// SISTEMA CRÍTICO NATIVO (Configuraciones Severas)
// -----------------------------------------------------------------------------
window.Settings = {
    changePassword: async () => {
        const newPassword = prompt("Digita tu nuevo pase seguro (mínimo 6 caracteres alfanuméricos):");
        if (!newPassword || newPassword.length < 6) return alert("Cancelado o insuficiente seguridad.");
        try {
            await auth.currentUser.updatePassword(newPassword);
            alert("¡Tu contraseña ha sido reprogramada con éxito en los servidores centrales!");
        } catch (error) {
            if (error.code === 'auth/requires-recent-login') {
                alert("⚠️ PROTECCIÓN FIREBASE: Hace mucho abriste tu sesión. Ciérrala y devuélvete mediante acceso normal para auditar que eres el humano propietario.");
            } else {
                alert("Violación/Error: " + error.message);
            }
        }
    },
    changeEmail: async () => {
        const newEmail = prompt(`Credencial en uso actual: ${auth.currentUser.email}\n\nIngresa hacia qué buzón electrónico quieres migrar todo el dominio:`);
        if (!newEmail || !newEmail.includes('@')) return alert("Cancelaste el intento de migración.");
        try {
            await auth.currentUser.verifyBeforeUpdateEmail(newEmail);
            alert(`¡Expediente transferido!\n\nHemos despachado un paquete de transición al nuevo buzón (${newEmail}). Tus redes no van a mudarse realmente ni se perderá registro loggeado de nada... hasta que tú u otra persona entre allí y pulse el botón maestro "VERIFICAR CARTA".`);
        } catch (error) {
            if (error.code === 'auth/requires-recent-login') {
                alert("⚠️ LOG GEO-EXPIRED: Ya pasó demasiado tiempo en línea. Renueva la sesión saliendo y entrando para este permiso crucial.");
            } else {
                alert("Firebase Exception: " + error.message);
            }
        }
    },
    verifyEmail: async () => {
        try {
            await auth.currentUser.sendEmailVerification();
            alert("Se ha inyectado un correo blanco al servidor SMTP rumbo a " + auth.currentUser.email + ".\n\nAsegúrate fervientemente de monitorear correos 'Spam' hoy.");
        } catch (error) {
            if (error.code === 'auth/too-many-requests') {
                alert("La inteligencia artificial antispam de Google bloqueó tu red temporalmente por pedir demasiados emails seguidos. Tranquilízate 20 minutos.");
            } else {
                alert("Caída: " + error.message);
            }
        }
    },
    deleteAccount: async () => {
        const confirmDelete = prompt("🚨 NIVEL DE ALERTA 5 ROJO 🚨\nTe encuentras al borde de purgar toda tu base de dominios vinculados. La matriz web no perdonará este paso al vacio.\n\nEscribe el código maestro para continuar erradicando: ELIMINAR");
        
        if (confirmDelete !== "ELIMINAR") return alert("Secuencia Letal: ABORTADA AL INSTANTE.");

        try {
            const user = auth.currentUser;
            // Limpiar reserva de username
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().username) {
                await db.collection('usernames').doc(userDoc.data().username).delete();
            }
            await db.collection('users').doc(user.uid).delete();
            await user.delete();
            alert("Has dejado de existir dentro del ecosistema LinkStack. \nFuerza y Honor.");
        } catch (error) {
            if (error.code === 'auth/requires-recent-login') {
                alert("⚠️ CÓDIGO BARRERA: Tus cookies pasaron su umbral. Sal de la web enteramente, loggéate y detona la carga una vez adentro limpiamente.");
            } else {
                alert("Sobreviviste a medias. El motor devolvió: " + error.message);
            }
        }
    }
};
