// =============================================================================
// OLLAMA-TEST.JS - Tests locaux avec Ollama (sans clé Mistral)
// Utilise vos prompts DPAI avec un modèle Mistral local
// =============================================================================

const { exec } = require('child_process');
const path = require('path');

// Charger vos prompts DPAI
// Remontez de deux niveaux pour atteindre le dossier functions/src/prompt
const promptsPath = path.join(__dirname, '..', 'functions', 'src', 'prompt', 'dpai-prompts.js');
let prompts;

try {
    prompts = require(promptsPath);
    console.log('✅ Prompts DPAI chargés avec succès');
} catch (error) {
    console.error('❌ Impossible de charger dpai-prompts.js:', error.message);
    console.log('Assurez-vous que le fichier existe à:', promptsPath);
    process.exit(1);
}

// =============================================================================
// FONCTIONS
// =============================================================================

/**
 * Appelle Ollama avec un prompt
 * @param {string} prompt - Le prompt à envoyer
 * @param {string} model - Le modèle à utiliser (default: mistral)
 * @returns {Promise<string>} La réponse d'Ollama
 */
async function callOllama(prompt, model = 'mistral') {
    return new Promise((resolve, reject) => {
        // Échapper les caractères spéciaux pour la commande shell
        const escapedPrompt = prompt
            .replace(/\$/g, '\\\$')
            .replace(/"/g, '\\"')
            .replace(/'/g, "\\'")
            .replace(/`/g, '\\`')
            .replace(/\n/g, '\\n');
        
        const command = `ollama run ${model} "${escapedPrompt}"`;

        console.log('🔹 Exécution:', command.substring(0, 100) + '...');

        exec(command, {
            maxBuffer: 1024 * 1024 * 10, // 10Mo buffer
            timeout: 30000 // 30 secondes timeout
        }, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Erreur Ollama:', stderr || error.message);
                reject(new Error(stderr || error.message));
            } else {
                // Nettoyer la réponse (supprimer les artifacts Ollama)
                const cleanedResponse = stdout
                    .replace(/^\n+/, '')
                    .replace(/\n+$/, '')
                    .trim();
                resolve(cleanedResponse);
            }
        });
    });
}

/**
 * Affiche un extrait d'un texte
 * @param {string} text - Texte à afficher
 * @param {number} length - Longueur maximale (default: 400)
 * @returns {string}
 */
function showExcerpt(text, length = 400) {
    return text.length > length ? text.substring(0, length) + '...' : text;
}

/**
 * Vérifie si Ollama est installé
 * @returns {Promise<boolean>}
 */
async function checkOllama() {
    return new Promise((resolve) => {
        exec('ollama --version', (error) => {
            resolve(!error);
        });
    });
}

/**
 * Vérifie si le modèle est téléchargé
 * @param {string} model - Nom du modèle (default: mistral)
 * @returns {Promise<boolean>}
 */
async function checkModel(model = 'mistral') {
    return new Promise((resolve) => {
        exec(`ollama list | grep -q ${model}`, (error) => {
            resolve(!error);
        });
    });
}

// =============================================================================
// TESTS
// =============================================================================

const tests = [
    {
        name: '📊 SWOT - EdTech (TechCorp, 5M€ CA)',
        type: 'swot',
        data: {
            name: 'TechCorp',
            sector: 'EdTech',
            revenue: '5M€',
            ebitda: '1M€',
            employees: '50',
            targetMarket: 'Écoles primaires en France',
            goals: 'Croissance externe via acquisition',
            constraints: 'Budget limité à 10M€'
        },
        expected: ['TechCorp', 'EdTech', '5M€', 'DPAI', 'Forces', 'Faiblesses', 'Opportunités', 'Menaces']
    },
    {
        name: '🔍 Porter 5 Forces - SaaS (10M€ CA)',
        type: 'porter',
        data: {
            sector: 'SaaS',
            positioning: 'Leader français',
            marketShare: '15%',
            avgPrice: '500€',
            fixedCosts: 'Élevés (cloud, R&D)'
        },
        expected: ['Porter', 'SaaS', 'DPAI', 'niveau', 'Recommandation']
    },
    {
        name: '💡 Conseiller - Valorisation SaaS',
        type: 'advisor',
        data: {
            message: 'Comment valoriser une entreprise de SaaS avec 10M€ de CA et 3M€ d\'EBITDA ?'
        },
        expected: ['DPAI', 'SaaS', '10M€', '3M€', 'multiple', 'Recommandations']
    },
    {
        name: '💡 Conseiller - Pièges en négociation',
        type: 'advisor',
        data: {
            message: 'Quels sont les 5 pièges à éviter dans une négociation de rachat ?'
        },
        expected: ['DPAI', 'négociation', 'pièges', '5', 'Recommandations']
    },
    {
        name: '💡 Conseiller - Due Diligence',
        type: 'advisor',
        data: {
            message: 'Quels sont les points clés à vérifier en Due Diligence financière pour une PME industrielle ?'
        },
        expected: ['DPAI', 'Due Diligence', 'financière', 'PME', 'industrielle', 'points clés']
    },
    {
        name: '❌ Test Générique (à détecter)',
        type: 'advisor',
        data: {
            message: 'Fais-moi une analyse SWOT générique pour une entreprise.'
        },
        expected: [],
        shouldFail: true
    }
];

// =============================================================================
// EXÉCUTION DES TESTS
// =============================================================================

async function runTests(usePromptOnly = false) {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 TEST DE VOTRE IA DPAI (Avec Ollama Local)');
    console.log('='.repeat(80) + '\n');

    // Vérifier Ollama
    const hasOllama = await checkOllama();
    if (!hasOllama && !usePromptOnly) {
        console.log('❌ Ollama n\'est pas installé.');
        console.log('Installez-le avec :');
        console.log('  Mac/Linux: curl -fsSL https://ollama.com/install.sh | sh');
        console.log('  Windows: choco install ollama');
        console.log('\nUne fois installé, téléchargez le modèle avec : ollama pull mistral\n');
        process.exit(1);
    }

    // Vérifier le modèle
    if (!usePromptOnly) {
        const hasModel = await checkModel('mistral');
        if (!hasModel) {
            console.log('⚠️  Modèle "mistral" non trouvé.');
            console.log('Téléchargez-le avec : ollama pull mistral\n');
            process.exit(1);
        }
    }

    if (usePromptOnly) {
        console.log('🔹 Mode : Affichage des prompts uniquement (sans Ollama)\n');
    } else {
        console.log('🔹 Mode : Avec Ollama (modèle : mistral)\n');
    }

    let passCount = 0;
    let failCount = 0;

    for (const test of tests) {
        console.log(`\n🔹 Test: ${test.name}`);
        console.log('-'.repeat(80));

        // Générer le prompt
        let prompt;
        switch (test.type) {
            case 'swot':
                prompt = prompts.SWOT_PROMPT(test.data);
                break;
            case 'porter':
                prompt = prompts.PORTER_PROMPT(test.data);
                break;
            case 'advisor':
                prompt = prompts.ADVISOR_PROMPT(test.data.message, test.data.context);
                break;
            default:
                console.log('❌ Type de test inconnu');
                failCount++;
                continue;
        }

        // Afficher le prompt
        console.log('📝 Prompt généré (extrait) :');
        console.log(showExcerpt(prompt) + '\n');

        if (usePromptOnly) {
            console.log('✅ Prompt généré avec succès !');
            passCount++;
            continue;
        }

        // Appeler Ollama
        try {
            const response = await callOllama(prompt);
            console.log('📝 Réponse Ollama (extrait) :');
            console.log(showExcerpt(response) + '\n');

            // Vérifier les mots-clés
            let allPass = true;
            const missingKeywords = [];

            for (const keyword of test.expected) {
                if (!response.toLowerCase().includes(keyword.toLowerCase())) {
                    allPass = false;
                    missingKeywords.push(keyword);
                }
            }

            // Pour le test générique, on vérifie que les mots INTERDITS ne sont PAS présents
            if (test.shouldFail) {
                const forbiddenKeywords = ['en tant qu\'ia', 'je suis une ia', 'je suis un modèle de langage', 'généralement'];
                let hasForbidden = false;
                for (const keyword of forbiddenKeywords) {
                    if (response.toLowerCase().includes(keyword)) {
                        hasForbidden = true;
                        missingKeywords.push(`❌ Contient "${keyword}"`);
                    }
                }
                allPass = !hasForbidden;
            }

            if (allPass) {
                console.log('✅ SUCCÈS : Tous les critères validés !');
                passCount++;
            } else {
                console.log(`❌ ÉCHEC : ${missingKeywords.join(', ')}`);
                failCount++;
            }
        } catch (error) {
            console.log('❌ ÉCHEC :', error.message);
            failCount++;
        }
    }

    // Résumé
    console.log('\n' + '='.repeat(80));
    console.log('📊 RÉSULTATS');
    console.log('='.repeat(80));
    console.log(`✅ Réussis : ${passCount}/${tests.length}`);
    console.log(`❌ Échecs : ${failCount}/${tests.length}`);
    console.log(`📈 Taux de réussite : ${Math.round((passCount / tests.length) * 100)}%`);
    console.log('='.repeat(80) + '\n');

    return { passCount, failCount };
}

// =============================================================================
// POINT D'ENTRÉE
// =============================================================================

// Vérifier les arguments de la ligne de commande
const args = process.argv.slice(2);
const usePromptOnly = args.includes('--prompt-only') || args.includes('-p');

// Exécuter les tests
runTests(usePromptOnly).catch(console.error);
