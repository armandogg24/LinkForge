// profile.js - Renderizado Público del Perfil (Sanitizado)
const Profile = {
    fetchByUsername: async (username) => {
        try {
            const query = await db.collection('users').where('username', '==', username).get();
            if (query.empty) return null;
            return query.docs[0].data();
        } catch (err) {
            console.error('Error cargando perfil:', err);
            return null;
        }
    },

    render: (data) => {
        const appContainer = document.getElementById('app-container');
        document.body.className = `theme-${escapeHTML(data.theme) || 'default'}`;

        appContainer.innerHTML = `
            <div class="profile-card glass">
                <div class="profile-img-container" style="text-align: center;">
                    ${data.photoURL 
                        ? `<img src="${safeURL(data.photoURL)}" alt="${escapeHTML(data.name)}" class="profile-img">` 
                        : `<div class="profile-placeholder"><i data-lucide="user" style="width: 60px; height: 60px;"></i></div>`
                    }
                </div>
                <h1 class="profile-title">${escapeHTML(data.name) || 'Sin nombre'}</h1>
                <p class="profile-bio">${escapeHTML(data.bio) || ''}</p>
                
                <div class="profile-links">
                    ${(data.links || []).map(link => {
                        const safeUrl = safeURL(link.url);

                        // Detectar YouTube (solo URLs verificadas de YouTube)
                        const ytMatch = safeUrl.match(/^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
                        if (ytMatch) {
                            return `
                                <div class="video-container">
                                    <iframe src="https://www.youtube.com/embed/${ytMatch[1]}" 
                                        allowfullscreen 
                                        sandbox="allow-scripts allow-same-origin allow-presentation"
                                        loading="lazy"></iframe>
                                </div>
                            `;
                        }
                        
                        // Enlace estándar con icono sanitizado
                        const cleanIcon = safeIcon(link.icon);
                        const iconHtml = (cleanIcon && cleanIcon.startsWith('http')) 
                            ? `<img src="${safeURL(cleanIcon)}" style="width: 20px; height: 20px; border-radius: 4px; object-fit: cover; display: inline-block; vertical-align: middle; margin-right: 8px;">`
                            : `<i data-lucide="${cleanIcon}" style="display: inline-block; vertical-align: middle; margin-right: 8px;"></i>`;

                        return `
                            <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="link-btn" style="display: flex; align-items: center; justify-content: center;">
                                ${iconHtml}
                                <span>${escapeHTML(link.title)}</span>
                            </a>
                        `;
                    }).join('')}
                </div>

                ${data.gallery && data.gallery.length > 0 ? `
                    <div class="gallery-section">
                        <h3>Galería</h3>
                        <div class="gallery-grid">
                            ${data.gallery.map(img => `<img src="${safeURL(img)}" class="gallery-item" loading="lazy">`).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        if (window.lucide) {
            lucide.createIcons();
        } else {
            setTimeout(() => {
                if (window.lucide) lucide.createIcons();
            }, 500);
        }
    }
};
