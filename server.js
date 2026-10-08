// =============================================================================
// SERVEUR NODE.JS POUR RAILWAY - VERSION SÉCURISÉE
// Sert les fichiers statiques depuis /public
// Tous les services sont gratuits avec 500 tokens
// =============================================================================

const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Middleware pour parser le JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

console.log('🚀 [DPAI Server] Démarrage du serveur...');
console.log('📁 [DPAI Server] Répertoire public:', PUBLIC_DIR);
console.log('🌐 [DPAI Server] Port:', PORT);

// =============================================================================
// CONFIGURATION DE SÉCURITÉ
// =============================================================================

// Limiter le taux de requêtes pour éviter les attaques par force brute
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limite chaque IP à 1000 requêtes par fenêtre
    standardHeaders: true,
    legacyHeaders: false,
    message: { 
        error: 'Trop de requêtes, veuillez réessayer plus tard.',
        retryAfter: '15 minutes'
    }
});

// Limiteur plus strict pour les routes sensibles (API)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limite chaque IP à 100 requêtes API par fenêtre
    standardHeaders: true,
    legacyHeaders: false,
    message: { 
        error: 'Trop de requêtes API, veuillez réessayer plus tard.',
        retryAfter: '15 minutes'
    }
});

// Configuration CORS sécurisée
const corsOptions = {
    origin: [
        'https://dpai-strategy.com',
        'https://www.dpai-strategy.com',
        'http://localhost:8080',
        'http://localhost:3000',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:3000'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

// =============================================================================
// MIDDLEWARES DE SÉCURITÉ
// =============================================================================

// Appliquer Helmet avec CSP personnalisé
app.use(helmet());

// Content Security Policy (CSP)
const cspConfig = helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://www.gstatic.com",
            "https://cdnjs.cloudflare.com",
            "https://cdn.jsdelivr.net"
        ],
        styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
            "https://cdnjs.cloudflare.com",
            "https://cdn.jsdelivr.net"
        ],
        fontSrc: [
            "'self'",
            "https://fonts.gstatic.com",
            "https://cdnjs.cloudflare.com"
        ],
        imgSrc: [
            "'self'",
            "data:",
            "https:",
            "http://localhost:*",
            "http://127.0.0.1:*"
        ],
        connectSrc: [
            "'self'",
            "https://dpai-8be62.firebaseio.com",
            "https://dpai-8be62.firebasestorage.app",
            "https://*.firebaseapp.com",
            "https://*.googleapis.com",
            "https://www.gstatic.com",
            "ws:",
            "wss:"
        ],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
    }
});

app.use(cspConfig);

// Prévenir les attaques MIME sniffing
app.use(helmet.noSniff());

// Prévenir le clickjacking
app.use(helmet.frameguard({ action: 'deny' }));

// Désactiver X-Powered-By
app.disable('x-powered-by');

// CORS sécurisé
app.use(cors(corsOptions));

// Limiteur de taux global
app.use(limiter);

// Middleware pour logger les requêtes (seulement en développement)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
        next();
    });
}

// Servir les fichiers statiques depuis /public
app.use(express.static(PUBLIC_DIR, {
    maxAge: '1d',
    extensions: ['html', 'htm'],
    index: ['index.html'],
    setHeaders: function(res, path) {
        // Cache plus long pour les assets statiques
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
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
        if (fs.existsSync(filePathNoExt) && fs.statSync(filePathNoExt).isFile()) {
            res.sendFile(filePathNoExt);
        } else {
            // Retourner index.html pour les routes SPA (Single Page Application)
            res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
        }
    }
});

// =============================================================================
// ROUTES API SÉCURISÉES
// =============================================================================

// Route pour obtenir la clé Mistral API (nécessite authentification)
// ⚠️  Cette route retourne la clé API pour les requêtes légales
// MAIS il est préférable d'utiliser une route proxy pour éviter d'exposer la clé
app.get('/api/mistral-key', apiLimiter, (req, res) => {
    try {
        // Vérifier l'authentification (pour Railway, cela pourrait être géré par Firebase Auth)
        // Pour une sécurité maximale, cette route devrait vérifier un token valide
        
        const mistralKey = process.env.MISTRAL_API_KEY;
        
        if (!mistralKey) {
            return res.status(500).json({
                success: false,
                error: 'Clé Mistral API non configurée côté serveur'
            });
        }
        
        // ⚠️  ATTENTION: Retourner la clé API au client est risqué
        // Une meilleure approche est d'utiliser une route proxy
        res.json({
            success: true,
            key: mistralKey,
            warning: 'Cette clé doit être utilisée avec précaution'
        });
        
    } catch (error) {
        console.error('❌ [Mistral Key API] Erreur:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur serveur lors de la récupération de la clé Mistral'
        });
    }
});

// Route proxy pour appeler l'API Mistral de manière sécurisée
// Cette route évite d'exposer la clé API au client
app.post('/api/mistral-proxy', apiLimiter, async (req, res) => {
    try {
        // Vérifier que l'utilisateur est authentifié
        // (Dans un environnement réel, vérifier le token Firebase de l'utilisateur)
        const mistralKey = process.env.MISTRAL_API_KEY;
        
        if (!mistralKey) {
            return res.status(500).json({
                success: false,
                error: 'Clé Mistral API non configurée côté serveur'
            });
        }
        
        const { prompt, model = 'mistral-large' } = req.body;
        
        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: 'Le paramètre "prompt" est requis'
            });
        }
        
        // Appeler l'API Mistral depuis le serveur
        const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mistralKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 2000
            })
        });
        
        if (!mistralResponse.ok) {
            const errorData = await mistralResponse.json();
            return res.status(mistralResponse.status).json({
                success: false,
                error: 'Erreur de l\'API Mistral',
                details: errorData
            });
        }
        
        const data = await mistralResponse.json();
        res.json({
            success: true,
            data: data
        });
        
    } catch (error) {
        console.error('❌ [Mistral Proxy] Erreur:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'appel à l\'API Mistral',
            details: error.message
        });
    }
});

// Route pour obtenir la configuration Firebase (sans les clés sensibles)
// Cette route est sécurisée et ne retourne que ce dont le client a besoin
app.get('/api/firebase-config', apiLimiter, (req, res) => {
    try {
        // Valider que la requête vient du même domaine ou d'une origine autorisée
        const origin = req.headers.origin;
        const allowedOrigins = [
            'https://dpai-strategy.com',
            'https://www.dpai-strategy.com',
            'http://localhost:8080',
            'http://localhost:3000',
            'http://127.0.0.1:8080',
            'http://127.0.0.1:3000'
        ];
        
        if (origin && !allowedOrigins.includes(origin)) {
            return res.status(403).json({ 
                error: 'Origine non autorisée',
                message: 'La requête doit provenir d\'un domaine autorisé.'
            });
        }
        
        // Configuration Firebase publique (sans clés API)
        // Les clés API sont injectées côté serveur via variables d'environnement
        const firebaseConfig = {
            authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'dpai-8be62.firebaseapp.com',
            projectId: process.env.FIREBASE_PROJECT_ID || 'dpai-8be62',
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'dpai-8be62.firebasestorage.app',
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '829160806332',
            appId: process.env.FIREBASE_APP_ID || '1:829160806332:web:125fd1c706ca97a0fcbdb9',
            measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-R3QVVF35GB'
        };
        
        // ⚠️ ATTENTION: Les clés API ne doivent JAMAIS être envoyées au client
        // Elles sont utilisées uniquement côté serveur ou via variables d'environnement
        
        res.json({
            success: true,
            config: firebaseConfig,
            timestamp: new Date().toISOString(),
            warning: 'Les clés API Firebase sont protégées. Utilisez les variables d\'environnement côté serveur.'
        });
        
    } catch (error) {
        console.error('❌ [Firebase Config API] Erreur:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur serveur lors de la récupération de la configuration Firebase'
        });
    }
});

// Route santé pour vérifier que le serveur fonctionne
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// =============================================================================
// ROUTES STATIQUES
// =============================================================================

// Servir les fichiers statiques depuis /public
app.use(express.static(PUBLIC_DIR, {
    maxAge: '1d',
    extensions: ['html', 'htm'],
    index: ['index.html'],
    setHeaders: function(res, path) {
        // Cache plus long pour les assets statiques
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            // Sécurité : Empêcher le rendu dans un iframe
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://dpai-8be62.firebaseio.com wss://*.firebaseio.com;");
        } else {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
}));

// Gérer les routes qui n'ont pas d'extension
app.get('/:page', (req, res) => {
    const pageName = req.params.page;
    const filePath = path.join(PUBLIC_DIR, `${pageName}.html`);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        // Essayer sans .html
        const filePathNoExt = path.join(PUBLIC_DIR, pageName);
        if (fs.existsSync(filePathNoExt) && fs.statSync(filePathNoExt).isFile()) {
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

// =============================================================================
// GESTION DES ERREURS
// =============================================================================

// Middleware de gestion des erreurs 404
app.use((req, res, next) => {
    res.status(404).json({ 
        error: 'Not Found',
        message: 'La ressource demandée n\'existe pas.'
    });
});

// Middleware de gestion des erreurs globales
app.use((err, req, res, next) => {
    console.error('❌ [Server Error]:', err);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
        message: process.env.NODE_ENV === 'production' ? 'Une erreur est survenue.' : err.stack
    });
});

// =============================================================================
// DÉMARRAGE DU SERVEUR
// =============================================================================

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`✅ [DPAI Server] Serveur démarré sur http://localhost:${PORT}`);
    console.log(`✅ [DPAI Server] Servant les fichiers depuis: ${PUBLIC_DIR}`);
    console.log(`✅ [DPAI Server] Tous les services sont GRATUITS avec 500 tokens`);
    console.log(`ℹ️  [DPAI Server] Pour plus de tokens: duprey.conseil@gmail.com`);
    console.log(`🔒 [DPAI Server] Sécurité: Helmet, CSP, Rate Limiting, CORS activés`);
    
    // Lister les fichiers dans /public pour vérification
    try {
        const files = fs.readdirSync(PUBLIC_DIR);
        console.log('📋 [DPAI Server] Fichiers dans /public:', files.slice(0, 10).join(', '));
    } catch (err) {
        console.error('❌ [DPAI Server] Erreur lecture /public:', err.message);
    }
    
    // Vérifier les variables d'environnement Firebase
    console.log('\n🔑 [Firebase Environment] Vérification:');
    console.log('  - FIREBASE_AUTH_DOMAIN:', process.env.FIREBASE_AUTH_DOMAIN ? '✅ Configuré' : '⚠️  Utilisation valeur par défaut');
    console.log('  - FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅ Configuré' : '⚠️  Utilisation valeur par défaut');
    console.log('  - Note: Les clés API doivent être configurées via les variables d\'environnement de Railway');
});

module.exports = app;
