// dashboard.js - Gestión del Perfil de Usuario

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
    if (!res.ok) throw new Error("Error de Seguridad: Solo usuarios de LinkForge pueden usar este servicio.");

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
            appContainer.innerHTML = `
                <div class="dashboard-container">
                    <nav class="sidebar-nav">
                        <button onclick="Dashboard.changeTab('links')" id="tab-links" class="tab-btn active"><i data-lucide="link"></i> <span>Enlaces</span></button>
                        <button onclick="Dashboard.changeTab('profile')" id="tab-profile" class="tab-btn"><i data-lucide="user"></i> <span>Perfil</span></button>
                        <button onclick="Dashboard.changeTab('vip')" id="tab-vip" class="tab-btn"><i data-lucide="zap"></i> <span>VIP</span></button>
                        <button onclick="Dashboard.changeTab('settings')" id="tab-settings" class="tab-btn"><i data-lucide="shield-check"></i> <span>Ajustes</span></button>
                    </nav>
                    <main class="dashboard-content" id="tab-content" style="position:relative;">
                        <div class="skeleton-loader" style="padding: 0.5rem;">
                            <div class="skeleton" style="width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 0.75rem;"></div>
                            <div class="skeleton" style="height: 16px; width: 50%; margin: 0 auto 0.5rem;"></div>
                            <div class="skeleton" style="height: 12px; width: 70%; margin: 0.5rem auto;"></div>
                        </div>
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
            
            content.classList.remove('tab-content-enter');
            void content.offsetWidth;
            content.classList.add('tab-content-enter');
            
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
            <h3>Mi LinkForge</h3>
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
            if(!phone) { showToast('Por favor, ingresa un número de teléfono válido.', 'error'); return; }
            const link = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
            try {
                await navigator.clipboard.writeText(link);
                showToast('¡Enlace copiado al portapapeles!', 'success');
            } catch {
                showToast('Copia este enlace: ' + link, 'info');
            }
        };

        document.getElementById('btn-add-gallery').onclick = () => document.getElementById('gallery-input').click();
        document.getElementById('gallery-input').onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const user = auth.currentUser;
            const doc = await db.collection('users').doc(user.uid).get();
            const gallery = doc.exists ? doc.data().gallery || [] : [];
            if (gallery.length >= 30) { showToast('Has alcanzado el límite de 30 imágenes en tu galería.', 'error'); return; }
            const username = Dashboard.data.username;
            
            showToast('Enviando imagen a la nube...', 'info');
            try {
                const imgName = `LinkForge_Galeria_${username}_${Date.now()}`;
                const externalUrl = await uploadImageToExternal(file, imgName);
                gallery.push(externalUrl);
                await db.collection('users').doc(user.uid).update({ gallery });
                showToast('¡Imagen enviada a tu galería correctamente!', 'success');
            } catch (err) {
                showToast('Error al subir la fotografía: ' + err.message, 'error');
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
            showToast('¡El diseño externo de tu página ha cambiado!', 'success');
        };
    },

    /* ----------------------------------------------------
       LÓGICA HEREDADA DEL DASHBOARD
       ---------------------------------------------------- */

    uploadPhotoExternal: async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const user = auth.currentUser;
        if (!user) return;
        
        try {
            showToast('Enviando y encriptando imagen vía Cloudflare...', 'info');
            const imgName = `LinkForge_Perfil_${Dashboard.data.username}`;
            const externalUrl = await uploadImageToExternal(file, imgName);
            
            await db.collection('users').doc(user.uid).update({ photoURL: externalUrl });
            document.getElementById('profile-preview-container').innerHTML = `<img src="${externalUrl}" id="profile-preview" class="profile-img-small">`;
            Dashboard.renderTabProfile(document.getElementById('tab-content'));
            showToast('¡Foto de perfil actualizada!', 'success');
        } catch (err) {
            showToast('Error al subir avatar: ' + err.message, 'error');
        }
    },

    deletePhoto: async () => {
        if (!confirm('¿Estás seguro de que quieres eliminar tu foto de perfil?')) return;
        const user = auth.currentUser;
        try {
            await db.collection('users').doc(user.uid).update({ photoURL: '' });
            Dashboard.data.photoURL = '';
            Dashboard.renderTabProfile(document.getElementById('tab-content'));
            showToast('Foto de perfil eliminada.', 'success');
        } catch (err) {
            showToast('Error al eliminar foto: ' + err.message, 'error');
        }
    },

    saveProfile: async () => {
        const user = auth.currentUser;
        const name = document.getElementById('edit-name').value.trim();
        const newUsername = document.getElementById('edit-username').value.toLowerCase().trim().replace(/[^a-z0-9_.]/g, '');
        const bio = document.getElementById('edit-bio').value.trim();

        if (newUsername.length < 3) return showToast('El nombre público debe tener al menos 3 caracteres.', 'error');

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
                if (txErr.message === 'NOMBRE_OCUPADO') return showToast(`El nombre /?u=${newUsername} ya está reservado.`, 'error');
                return showToast('Error al cambiar nombre: ' + txErr.message, 'error');
            }
        } else {
            await db.collection('users').doc(user.uid).set({
                name, username: newUsername, bio
            }, { merge: true });
        }

        Dashboard.data.name = name;
        Dashboard.data.username = newUsername;
        Dashboard.data.bio = bio;

        showToast('¡Cambios guardados correctamente!', 'success');
    },

    addLink: async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        const title = document.getElementById('link-title').value.trim();
        let url = document.getElementById('link-url').value.trim();
        const iconSelect = document.getElementById('link-icon').value;
        let icon = iconSelect;

        if (Dashboard.data.links.length >= 20) return showToast('Máximo 20 enlaces permitidos.', 'error');

        if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;

        if (safeURL(url) === '#') return showToast('URL no válida. Solo se permiten enlaces http/https.', 'error');

        if (iconSelect === 'custom') {
            const fileInput = document.getElementById('custom-icon-file').files[0];
            if (!fileInput) return showToast('Debes elegir un ícono de tu PC', 'error');
            
            const btnSubmit = e.target.querySelector('button[type="submit"]');
            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Subiendo icono...';
            
            try {
                const imgName = `LinkForge_Icono_${Dashboard.data.username}_${Date.now()}`;
                icon = await uploadImageToExternal(fileInput, imgName);
            } catch (err) {
                btnSubmit.disabled = false;
                btnSubmit.textContent = '+ Añadir al panel';
                return showToast('Error al subir icono: ' + err.message, 'error');
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
        if (!newPassword || newPassword.length < 6) return showToast("Contraseña cancelada o insuficiente.", 'error');
        try {
            await auth.currentUser.updatePassword(newPassword);
            showToast("¡Tu contraseña ha sido actualizada!", 'success');
        } catch (error) {
            if (error.code === 'auth/requires-recent-login') {
                showToast("⚠️ Debes iniciar sesión recientemente para cambiar contraseña.", 'error');
            } else {
                showToast("Error: " + error.message, 'error');
            }
        }
    },
    changeEmail: async () => {
        const newEmail = prompt(`Correo actual: ${auth.currentUser.email}\n\nIngresa el nuevo correo:`);
        if (!newEmail || !newEmail.includes('@')) return showToast("Migración cancelada.", 'info');
        try {
            await auth.currentUser.verifyBeforeUpdateEmail(newEmail);
            showToast(`¡Verifica tu nuevo correo: ${newEmail}`, 'success');
        } catch (error) {
            if (error.code === 'auth/requires-recent-login') {
                showToast("⚠️ Debes iniciar sesión recientemente.", 'error');
            } else {
                showToast("Error: " + error.message, 'error');
            }
        }
    },
    verifyEmail: async () => {
        try {
            await auth.currentUser.sendEmailVerification();
            showToast("Correo de verificación enviado. Revisa tu inbox (y spam).", 'success');
        } catch (error) {
            if (error.code === 'auth/too-many-requests') {
                showToast("Demasiadas solicitudes. Espera 20 minutos.", 'error');
            } else {
                showToast("Error: " + error.message, 'error');
            }
        }
    },
    deleteAccount: async () => {
        const confirmDelete = prompt("🚨 PELIGRO: Escribe 'ELIMINAR' para borrar tu cuenta permanentemente:");
        
        if (confirmDelete !== "ELIMINAR") return showToast("Eliminación cancelada.", 'info');

        try {
            const user = auth.currentUser;
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().username) {
                await db.collection('usernames').doc(userDoc.data().username).delete();
            }
            await db.collection('users').doc(user.uid).delete();
            await user.delete();
            showToast("Cuenta eliminada. Adiós.", 'success');
        } catch (error) {
            if (error.code === 'auth/requires-recent-login') {
                showToast("⚠️ Debes iniciar sesión recientemente para eliminar cuenta.", 'error');
            } else {
                showToast("Error: " + error.message, 'error');
            }
        }
    }
};
