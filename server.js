// =============================================================================
// SERVEUR NODE.JS POUR RAILWAY - VERSION AVEC IA LOCALE INTEGREE
// Sert les fichiers statiques depuis /public
// L'API Python locale est demarree automatiquement avec ce serveur
// =============================================================================

const express = require('express');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, 'public');

// =============================================================================
// DEMARRAGE DE L'API LOCALE PYTHON
// =============================================================================

let pythonProcess = null;
let localAIAvailable = false;

/**
 * Demarre le serveur API Python locale
 */
function startLocalAIServer() {
    console.log('[DPAI Server] Demarrage de l API locale Python...');
    
    // Chemin vers le fichier api_server.py
    const apiServerPath = path.join(__dirname, 'my_local_ai', 'api_server.py');
    
    // Verifier que le fichier existe
    if (!fs.existsSync(apiServerPath)) {
        console.error('[DPAI Server] ERREUR: Fichier api_server.py introuvable a:', apiServerPath);
        console.error('[DPAI Server] Assurez-vous que le dossier my_local_ai existe');
        return false;
    }
    
    console.log('[DPAI Server] Chemin API Python:', apiServerPath);
    
    // Demarrer le processus Python
    pythonProcess = spawn('python3', [apiServerPath], {
        cwd: path.join(__dirname, 'my_local_ai'),
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        env: {
            ...process.env,
            PYTHONUNBUFFERED: '1'
        }
    });
    
    // Capturer les outputs pour le debug
    if (pythonProcess.stdout) {
        pythonProcess.stdout.on('data', (data) => {
            console.log(`[Python] ${data.toString().trim()}`);
        });
    }
    
    if (pythonProcess.stderr) {
        pythonProcess.stderr.on('data', (data) => {
            console.error(`[Python ERROR] ${data.toString().trim()}`);
        });
    }
    
    pythonProcess.on('error', (err) => {
        console.error('[DPAI Server] Erreur Python:', err.message);
    });
    
    pythonProcess.on('exit', (code, signal) => {
        console.error(`[DPAI Server] Python arrete (code: ${code}, signal: ${signal})`);
        localAIAvailable = false;
        // Essayer de redemarrer apres 5 secondes
        setTimeout(startLocalAIServer, 5000);
    });
    
    pythonProcess.on('close', (code) => {
        console.error(`[DPAI Server] Python ferme (code: ${code})`);
        localAIAvailable = false;
    });
    
    // Attendre 3 secondes pour que Python demarre
    setTimeout(() => {
        checkLocalAIHealth();
    }, 3000);
    
    return true;
}

/**
 * Verifie la sante de l'API locale
 */
async function checkLocalAIHealth() {
    try {
        // Utiliser http si on est en production (Railway), sinon localhost
        const testUrl = process.env.NODE_ENV === 'production' 
            ? 'http://localhost:5002/api/health'
            : 'http://localhost:5002/api/health';
        
        const response = await fetch(testUrl, {
            method: 'GET',
            timeout: 5000
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.healthy) {
                localAIAvailable = true;
                console.log('[DPAI Server] IA locale est disponible');
                console.log('[DPAI Server] Model:', data.model);
                console.log('[DPAI Server] Training samples:', data.training_samples);
                return true;
            }
        }
        console.error('[DPAI Server] IA locale non disponible, reessai dans 10s...');
        localAIAvailable = false;
        setTimeout(checkLocalAIHealth, 10000);
        return false;
    } catch (error) {
        console.error('[DPAI Server] Erreur verification IA locale:', error.message);
        localAIAvailable = false;
        setTimeout(checkLocalAIHealth, 10000);
        return false;
    }
}

// Demarrer l'API locale Python au demarrage
startLocalAIServer();

// =============================================================================
// Middleware pour parser le JSON
// =============================================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

console.log('🚀 [DPAI Server] Demarrage du serveur Node.js...');
console.log('📁 [DPAI Server] Repertoire public:', PUBLIC_DIR);
console.log('🌐 [DPAI Server] Port:', PORT);

// =============================================================================
// CONFIGURATION DE SECURITE
// =============================================================================

// Limiter le taux de requetes pour eviter les attaques par force brute
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limite chaque IP a 1000 requetes par fenetre
    standardHeaders: true,
    legacyHeaders: false,
    message: { 
        error: 'Trop de requetes, veuillez reessayer plus tard.',
        retryAfter: '15 minutes'
    }
});

// Limiteur plus strict pour les routes sensibles (API)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limite chaque IP a 100 requetes API par fenetre
    standardHeaders: true,
    legacyHeaders: false,
    message: { 
        error: 'Trop de requetes API, veuillez reessayer plus tard.',
        retryAfter: '15 minutes'
    }
});

// Configuration CORS securisee
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
// MIDDLEWARES DE SECURITE
// =============================================================================

// Appliquer Helmet avec CSP personnalise
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
            "wss:",
            "http://localhost:5002"  // Autoriser l'API locale
        ],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
    }
});

app.use(cspConfig);

// Preventer les attaques MIME sniffing
app.use(helmet.noSniff());

// Preventer le clickjacking
app.use(helmet.frameguard({ action: 'deny' }));

// Desactiver X-Powered-By
app.disable('x-powered-by');

// CORS securise
app.use(cors(corsOptions));

// Limiteur de taux global
app.use(limiter);

// Middleware pour logger les requetes (seulement en developpement)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
        next();
    });
}

// =============================================================================
// MIDDLEWARE POUR PROXY VERS IA LOCALE
// =============================================================================

// Middleware pour proxy les requetes vers l'API locale Python
const proxyToLocalAI = async (req, res) => {
    try {
        if (!localAIAvailable) {
            return res.status(503).json({
                success: false,
                error: 'IA locale DPAI non disponible',
                message: 'L API Python est en cours de demarrage...'
            });
        }
        
        const localAIUrl = 'http://localhost:5002';
        const targetUrl = `${localAIUrl}${req.path.replace('/api/local-ai', '')}`;
        
        // Preparer les options pour la requete vers Python
        const options = {
            method: req.method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (req.body) {
            options.body = JSON.stringify(req.body);
        }
        
        // Faire la requete vers l'API locale
        const response = await fetch(targetUrl, options);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return res.status(response.status).json({
                success: false,
                error: 'Erreur IA locale DPAI',
                details: errorData
            });
        }
        
        const data = await response.json();
        res.json(data);
        
    } catch (error) {
        console.error('[Proxy] Erreur:', error.message);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la communication avec l IA locale',
            details: error.message
        });
    }
};

// =============================================================================
// ROUTES API POUR IA LOCALE
// =============================================================================

// Route pour verifier la sante de l'IA locale
app.get('/api/local-ai/health', apiLimiter, async (req, res) => {
    try {
        const response = await fetch('http://localhost:5002/api/health', {
            method: 'GET',
            timeout: 5000
        });
        
        if (!response.ok) {
            return res.status(503).json({
                success: false,
                error: 'IA locale DPAI non disponible',
                localAIAvailable: false
            });
        }
        
        const data = await response.json();
        res.json({
            success: true,
            localAI: data,
            localAIAvailable: true
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            error: 'Impossible de contacter l IA locale',
            localAIAvailable: false,
            details: error.message
        });
    }
});

// Route proxy pour chat
app.post('/api/local-ai/chat', apiLimiter, proxyToLocalAI);
app.post('/api/local-ai/analyze', apiLimiter, proxyToLocalAI);
app.post('/api/local-ai/train', apiLimiter, proxyToLocalAI);
app.get('/api/local-ai/stats', apiLimiter, proxyToLocalAI);

// =============================================================================
// ROUTES API SECURISEES (compatibilite)
// =============================================================================

// Route pour obtenir la configuration Firebase (sans les cles sensibles)
app.get('/api/firebase-config', apiLimiter, (req, res) => {
    try {
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
                error: 'Origine non autorisee',
                message: 'La requete doit provenir d un domaine autorise.'
            });
        }
        
        const firebaseConfig = {
            authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'dpai-8be62.firebaseapp.com',
            projectId: process.env.FIREBASE_PROJECT_ID || 'dpai-8be62',
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'dpai-8be62.firebasestorage.app',
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '829160806332',
            appId: process.env.FIREBASE_APP_ID || '1:829160806332:web:125fd1c706ca97a0fcbdb9',
            measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-R3QVVF35GB'
        };
        
        res.json({
            success: true,
            config: firebaseConfig,
            timestamp: new Date().toISOString(),
            localAIEnabled: localAIAvailable,
            localAIUrl: 'http://localhost:5002'
        });
        
    } catch (error) {
        console.error('[Firebase Config API] Erreur:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur serveur'
        });
    }
});

// Route sante pour verifier que le serveur fonctionne
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        localAIAvailable: localAIAvailable,
        pythonProcessRunning: pythonProcess && !pythonProcess.killed
    });
});

// =============================================================================
// SERVIR LES FICHIERS STATIQUES
// =============================================================================

app.use(express.static(PUBLIC_DIR, {
    maxAge: '1d',
    extensions: ['html', 'htm'],
    index: ['index.html'],
    setHeaders: function(res, filePath) {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('X-Frame-Options', 'DENY');
        } else {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
}));

// Gerer les routes qui n'ont pas d'extension
app.get('/:page', (req, res) => {
    const pageName = req.params.page;
    const filePath = path.join(PUBLIC_DIR, `${pageName}.html`);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        const filePathNoExt = path.join(PUBLIC_DIR, pageName);
        if (fs.existsSync(filePathNoExt) && fs.statSync(filePathNoExt).isFile()) {
            res.sendFile(filePathNoExt);
        } else {
            res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
        }
    }
});

// Pour toutes les autres routes, servir index.html (SPA mode)
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
        message: 'La ressource demandee n existe pas.'
    });
});

// Middleware de gestion des erreurs globales
app.use((err, req, res, next) => {
    console.error('[Server Error]:', err);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
        message: process.env.NODE_ENV === 'production' ? 'Une erreur est survenue.' : err.stack
    });
});

// =============================================================================
// DEMARRAGE DU SERVEUR
// =============================================================================

// Demarrer le serveur
const server = app.listen(PORT, () => {
    console.log(`[DPAI Server] Serveur Node.js demarre sur http://localhost:${PORT}`);
    console.log('[DPAI Server] Servant les fichiers depuis:', PUBLIC_DIR);
    console.log('[DPAI Server] IA locale Python: demarrage en cours...');
    console.log('[DPAI Server] Endpoints IA locale:');
    console.log('  - GET  /api/local-ai/health');
    console.log('  - POST /api/local-ai/chat');
    console.log('  - POST /api/local-ai/analyze');
    console.log('  - POST /api/local-ai/train');
    console.log('  - GET  /api/local-ai/stats');
    console.log('[DPAI Server] Tous les services sont GRATUITS avec 500 tokens');
    console.log('[DPAI Server] Pour plus de tokens: duprey.conseil@gmail.com');
    
    // Lister les fichiers dans /public pour verification
    try {
        const files = fs.readdirSync(PUBLIC_DIR);
        console.log('[DPAI Server] Fichiers dans /public:', files.slice(0, 10).join(', '));
    } catch (err) {
        console.error('[DPAI Server] Erreur lecture /public:', err.message);
    }
});

// Gestion du sigterm pour arreter proprement
process.on('SIGTERM', () => {
    console.log('[DPAI Server] Reception SIGTERM, arret en cours...');
    if (pythonProcess) {
        pythonProcess.kill('SIGTERM');
    }
    server.close(() => {
        console.log('[DPAI Server] Serveur arrete proprement');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('[DPAI Server] Reception SIGINT, arret en cours...');
    if (pythonProcess) {
        pythonProcess.kill('SIGINT');
    }
    server.close(() => {
        console.log('[DPAI Server] Serveur arrete proprement');
        process.exit(0);
    });
});

module.exports = app;
