/**
 * Utilities de sécurité pour le chiffrement côté client
 * Utilise l'API Web Crypto pour le chiffrement AES-GCM
 * 
 * ⚠️ IMPORTANT: Ce chiffrement est pour la protection des données locales dans le navigateur
 * et n'est pas une substitution à la sécurité côté serveur.
 */

class ClientSideEncryption {
    constructor() {
        this.algorithm = { name: 'AES-GCM', length: 256 };
        this.ivLength = 12; // 12 bytes pour AES-GCM
        this.keyCache = new Map(); // Cache des clés dérivées
    }
    
    /**
     * Génère une clé de chiffrement sécurisée
     * @returns {Promise<CryptoKey>} Clé de chiffrement AES-GCM
     */
    async generateKey() {
        try {
            return await window.crypto.subtle.generateKey(
                this.algorithm,
                true, // extractable
                ['encrypt', 'decrypt']
            );
        } catch (error) {
            console.error('%c❌ [Encryption] Erreur génération clé:', 'color: #dc3545; font-weight: bold;', error);
            throw new Error('Impossible de générer la clé de chiffrement');
        }
    }
    
    /**
     * Génère une clé à partir d'un mot de passe
     * @param {string} password - Mot de passe de l'utilisateur
     * @returns {Promise<CryptoKey>} Clé dérivée
     */
    async deriveKeyFromPassword(password) {
        if (this.keyCache.has(password)) {
            return this.keyCache.get(password);
        }
        
        try {
            // Encoder le mot de passe
            const encoder = new TextEncoder();
            const passwordBuffer = encoder.encode(password);
            
            // Importer le mot de passe comme clé brute
            const importKey = await window.crypto.subtle.importKey(
                'raw',
                passwordBuffer,
                { name: 'PBKDF2' },
                false,
                ['deriveKey']
            );
            
            // Dériver la clé avec PBKDF2
            const salt = window.crypto.getRandomValues(new Uint8Array(16));
            const keyMaterial = await window.crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                importKey,
                this.algorithm,
                true,
                ['encrypt', 'decrypt']
            );
            
            // Stocker la clé dans le cache
            this.keyCache.set(password, keyMaterial);
            
            return keyMaterial;
        } catch (error) {
            console.error('%c❌ [Encryption] Erreur dérivation clé:', 'color: #dc3545; font-weight: bold;', error);
            throw new Error('Impossible de dériver la clé à partir du mot de passe');
        }
    }
    
    /**
     * Génère un vecteur d'initialisation (IV) aléatoire
     * @returns {Uint8Array} IV aléatoire
     */
    generateIV() {
        return window.crypto.getRandomValues(new Uint8Array(this.ivLength));
    }
    
    /**
     * Chiffre des données
     * @param {string|object} data - Données à chiffrer (objet ou string)
     * @param {CryptoKey} key - Clé de chiffrement
     * @returns {Promise<{iv: string, ciphertext: string}>} Objet contenant IV et texte chiffré
     */
    async encryptData(data, key) {
        try {
            // Convertir les données en JSON string si nécessaire
            const dataString = typeof data === 'string' ? data : JSON.stringify(data);
            
            // Encoder les données
            const encoder = new TextEncoder();
            const plaintext = encoder.encode(dataString);
            
            // Générer un IV aléatoire
            const iv = this.generateIV();
            
            // Chiffrer les données
            const ciphertext = new Uint8Array(await window.crypto.subtle.encrypt(
                {
                    name: this.algorithm.name,
                    iv: iv
                },
                key,
                plaintext
            ));
            
            // Convertir en base64 pour le stockage
            const ivBase64 = this.arrayBufferToBase64(iv.buffer);
            const ciphertextBase64 = this.arrayBufferToBase64(ciphertext.buffer);
            
            return {
                iv: ivBase64,
                ciphertext: ciphertextBase64,
                algorithm: this.algorithm.name,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('%c❌ [Encryption] Erreur chiffrement:', 'color: #dc3545; font-weight: bold;', error);
            throw new Error('Impossible de chiffrer les données');
        }
    }
    
    /**
     * Déchiffre des données
     * @param {{iv: string, ciphertext: string}} encryptedData - Données chiffrées
     * @param {CryptoKey} key - Clé de déchiffrement
     * @returns {Promise<string|object>} Données déchiffrées
     */
    async decryptData(encryptedData, key) {
        try {
            // Convertir les données depuis base64
            const iv = this.base64ToArrayBuffer(encryptedData.iv);
            const ciphertext = this.base64ToArrayBuffer(encryptedData.ciphertext);
            
            // Déchiffrer les données
            const plaintext = await window.crypto.subtle.decrypt(
                {
                    name: this.algorithm.name,
                    iv: new Uint8Array(iv)
                },
                key,
                new Uint8Array(ciphertext)
            );
            
            // Décoder le texte
            const decoder = new TextDecoder();
            const dataString = decoder.decode(plaintext);
            
            // Essayer de parser comme JSON
            try {
                return JSON.parse(dataString);
            } catch (e) {
                return dataString;
            }
        } catch (error) {
            console.error('%c❌ [Encryption] Erreur déchiffrement:', 'color: #dc3545; font-weight: bold;', error);
            throw new Error('Impossible de déchiffrer les données. Clé incorrecte ou données corrompues.');
        }
    }
    
    /**
     * Chiffre des données avec un mot de passe
     * @param {string|object} data - Données à chiffrer
     * @param {string} password - Mot de passe pour la dérivation de clé
     * @returns {Promise<{iv: string, ciphertext: string, salt: string}>} Données chiffrées avec salt
     */
    async encryptWithPassword(data, password) {
        const key = await this.deriveKeyFromPassword(password);
        return this.encryptData(data, key);
    }
    
    /**
     * Déchiffre des données avec un mot de passe
     * @param {{iv: string, ciphertext: string}} encryptedData - Données chiffrées
     * @param {string} password - Mot de passe pour la dérivation de clé
     * @returns {Promise<string|object>} Données déchiffrées
     */
    async decryptWithPassword(encryptedData, password) {
        const key = await this.deriveKeyFromPassword(password);
        return this.decryptData(encryptedData, key);
    }
    
    /**
     * Hache une valeur avec SHA-256
     * @param {string} value - Valeur à hacher
     * @returns {Promise<string>} Hash en hexadécimal
     */
    async hashValue(value) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(value);
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        } catch (error) {
            console.error('%c❌ [Encryption] Erreur hachage:', 'color: #dc3545; font-weight: bold;', error);
            throw new Error('Impossible de hacher la valeur');
        }
    }
    
    /**
     * Génère un identifiant unique sécurisé
     * @returns {string} UUID v4
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
    
    /**
     * Génère un token sécurisé aléatoire
     * @param {number} length - Longueur du token
     * @returns {string} Token en hexadécimal
     */
    generateSecureToken(length = 32) {
        const bytes = window.crypto.getRandomValues(new Uint8Array(length));
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // =============================================================================
    // UTILITAIRES DE CONVERSION
    // =============================================================================
    
    /**
     * Convertit ArrayBuffer en Base64
     * @param {ArrayBuffer} buffer - Buffer à convertir
     * @returns {string} String Base64
     */
    arrayBufferToBase64(buffer) {
        return btoa(
            new Uint8Array(buffer).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                ''
            )
        );
    }
    
    /**
     * Convertit Base64 en ArrayBuffer
     * @param {string} base64 - String Base64
     * @returns {ArrayBuffer} Buffer converti
     */
    base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

// =============================================================================
// UTILITAIRES DE SÉCURITÉ SUPPLÉMENTAIRES
// =============================================================================

/**
 * Valide un email
 * @param {string} email - Email à valider
 * @returns {boolean} True si l'email est valide
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Valide un mot de passe (au moins 8 caractères, majuscule, minuscule, chiffre)
 * @param {string} password - Mot de passe à valider
 * @returns {boolean} True si le mot de passe est valide
 */
function isValidPassword(password) {
    if (!password || password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    return true;
}

/**
 * Nettoie les données utilisateur pour éviter XSS
 * @param {string} input - Données à nettoyer
 * @returns {string} Données nettoyées
 */
function sanitizeInput(input) {
    if (!input || typeof input !== 'string') return input;
    
    // Remplacer les caractères HTML par leurs entités
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Vérifie si l'utilisateur est authentifié
 * @returns {boolean} True si authentifié
 */
function isAuthenticated() {
    try {
        const auth = window.firebaseAuth || (window.firebase && window.firebase.auth());
        if (!auth) return false;
        
        const user = auth.currentUser;
        return !!user;
    } catch (error) {
        console.warn('%c⚠️ [Security] Impossible de vérifier l\'authentification:', 'color: #FF9800;', error);
        return false;
    }
}

/**
 * Vérifie si l'utilisateur a un rôle admin (via custom claims)
 * @returns {Promise<boolean>} True si admin
 */
async function isAdmin() {
    try {
        const auth = window.firebaseAuth || (window.firebase && window.firebase.auth());
        if (!auth) return false;
        
        const user = auth.currentUser;
        if (!user) return false;
        
        // Récupérer les custom claims
        await user.getIdTokenResult();
        const claims = user.getIdTokenResult().claims || {};
        
        return claims.admin === true;
    } catch (error) {
        console.warn('%c⚠️ [Security] Impossible de vérifier les droits admin:', 'color: #FF9800;', error);
        return false;
    }
}

// =============================================================================
// EXPORT GLOBAL
// =============================================================================

// Créer une instance globale
window.securityUtils = {
    encryption: new ClientSideEncryption(),
    isValidEmail,
    isValidPassword,
    sanitizeInput,
    isAuthenticated,
    isAdmin,
    // Alias pour compatibilité
    encrypt: (data, password) => new ClientSideEncryption().encryptWithPassword(data, password),
    decrypt: (encryptedData, password) => new ClientSideEncryption().decryptWithPassword(encryptedData, password),
    hash: (value) => new ClientSideEncryption().hashValue(value),
    generateUUID: () => new ClientSideEncryption().generateUUID(),
    generateToken: (length) => new ClientSideEncryption().generateSecureToken(length)
};

console.log('%c✅ [Security-Utils] Chargé avec succès', 'color: #28a745; font-weight: bold;');