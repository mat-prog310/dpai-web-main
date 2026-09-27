// =============================================================================
// SERVEUR NODE.JS POUR RAILWAY
// Sert les fichiers statiques depuis /public
// =============================================================================

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, 'public');

console.log('🚀 [Server] Démarrage du serveur...');
console.log('📁 [Server] Répertoire public:', PUBLIC_DIR);
console.log('🌐 [Server] Port:', PORT);

// Middleware pour logger les requêtes
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Servir les fichiers statiques depuis /public
app.use(express.static(PUBLIC_DIR, {
    maxAge: '1d',
    extensions: ['html'],
    index: ['index.html']
}));

// Gérer les routes qui n'ont pas d'extension
// Par exemple: /dashboard -> /dashboard.html
app.get('/:page', (req, res) => {
    const pageName = req.params.page;
    const filePath = path.join(PUBLIC_DIR, `${pageName}.html`);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        // Essayer sans .html
        const filePathNoExt = path.join(PUBLIC_DIR, pageName);
        if (fs.existsSync(filePathNoExt)) {
            res.sendFile(filePathNoExt);
        } else {
            // Retourner index.html pour les routes SPA (Single Page Application)
            res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
        }
    }
});

// Pour toutes les autres routes, servir index.html (SPA mode)
// Cela permet le routing côté client
app.get('*', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`✅ [Server] Serveur démarré sur http://localhost:${PORT}`);
    console.log(`✅ [Server] Servant les fichiers depuis: ${PUBLIC_DIR}`);
    
    // Lister les fichiers dans /public pour vérification
    try {
        const files = fs.readdirSync(PUBLIC_DIR);
        console.log('📋 [Server] Fichiers dans /public:', files.slice(0, 10).join(', '));
    } catch (err) {
        console.error('❌ [Server] Erreur lecture /public:', err.message);
    }
});

module.exports = app;
