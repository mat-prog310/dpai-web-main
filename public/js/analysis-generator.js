// =============================================================================
// ANALYSIS-GENERATOR.JS - Générateur local d'analyses pour DPAI
// Génère des analyses SWOT, Porter, PESTEL, etc. SANS IA externe
// Utilise des règles métier et des données sectorielles
// =============================================================================

// Données sectorielles DPAI (moyennes France/UE)
const SECTOR_DATA = {
    // Secteurs principaux
    'technologie': {
        name: 'Technologie/IT',
        growthRate: '8-12%',
        ebitdaMultiple: '10-15x',
        avgMargin: '15-25%',
        competition: 'Élevée',
        barriersToEntry: 'Moyennes',
        supplierPower: 'Faible',
        buyerPower: 'Moyenne',
        threatNewEntrants: 'Élevée',
        threatSubstitutes: 'Moyenne',
        rivalry: 'Élevée'
    },
    'santé': {
        name: 'Santé/Pharmacie',
        growthRate: '5-8%',
        ebitdaMultiple: '12-18x',
        avgMargin: '20-30%',
        competition: 'Modérée',
        barriersToEntry: 'Très élevées',
        supplierPower: 'Moyen',
        buyerPower: 'Faible',
        threatNewEntrants: 'Faible',
        threatSubstitutes: 'Faible',
        rivalry: 'Modérée'
    },
    'finance': {
        name: 'Finance/Banque',
        growthRate: '3-5%',
        ebitdaMultiple: '8-12x',
        avgMargin: '25-35%',
        competition: 'Très élevée',
        barriersToEntry: 'Très élevées',
        supplierPower: 'Faible',
        buyerPower: 'Élevée',
        threatNewEntrants: 'Faible',
        threatSubstitutes: 'Élevée',
        rivalry: 'Très élevée'
    },
    'industrie': {
        name: 'Industrie manufacturière',
        growthRate: '2-4%',
        ebitdaMultiple: '6-10x',
        avgMargin: '10-15%',
        competition: 'Élevée',
        barriersToEntry: 'Élevées',
        supplierPower: 'Moyen',
        buyerPower: 'Élevée',
        threatNewEntrants: 'Faible',
        threatSubstitutes: 'Moyenne',
        rivalry: 'Élevée'
    },
    'retail': {
        name: 'Distribution/Retail',
        growthRate: '4-6%',
        ebitdaMultiple: '7-11x',
        avgMargin: '5-10%',
        competition: 'Très élevée',
        barriersToEntry: 'Faibles',
        supplierPower: 'Élevé',
        buyerPower: 'Élevée',
        threatNewEntrants: 'Élevée',
        threatSubstitutes: 'Élevée',
        rivalry: 'Très élevée'
    },
    'énergie': {
        name: 'Énergie/Utilities',
        growthRate: '1-3%',
        ebitdaMultiple: '8-12x',
        avgMargin: '15-20%',
        competition: 'Faible',
        barriersToEntry: 'Très élevées',
        supplierPower: 'Faible',
        buyerPower: 'Faible',
        threatNewEntrants: 'Faible',
        threatSubstitutes: 'Moyenne',
        rivalry: 'Faible'
    },
    'immobilier': {
        name: 'Immobilier',
        growthRate: '3-5%',
        ebitdaMultiple: '10-15x',
        avgMargin: '20-30%',
        competition: 'Élevée',
        barriersToEntry: 'Élevées',
        supplierPower: 'Moyen',
        buyerPower: 'Élevée',
        threatNewEntrants: 'Modérée',
        threatSubstitutes: 'Faible',
        rivalry: 'Élevée'
    },
    'conseil': {
        name: 'Conseil',
        growthRate: '6-10%',
        ebitdaMultiple: '8-12x',
        avgMargin: '15-20%',
        competition: 'Élevée',
        barriersToEntry: 'Faibles',
        supplierPower: 'Faible',
        buyerPower: 'Élevée',
        threatNewEntrants: 'Faible',
        threatSubstitutes: 'Moyenne',
        rivalry: 'Élevée'
    }
};

// Générer une analyse SWOT
function generateSWOT(data) {
    const sector = data.sector || 'entreprise';
    const sectorInfo = SECTOR_DATA[sector.toLowerCase()] || SECTOR_DATA.conseil;
    const companyName = data.companyName || 'votre entreprise';
    const revenue = data.revenue ? formatNumber(data.revenue) + ' €' : 'non spécifié';
    const ebitda = data.ebitda ? formatNumber(data.ebitda) + ' €' : 'non spécifié';
    const employees = data.employees || 'non spécifié';
    const goals = data.goals || 'Croissance externe';
    const constraints = data.constraints || 'Aucune contrainte spécifique';
    
    // Forces (internal positive)
    const strengths = [];
    if (revenue !== 'non spécifié' && parseInt(data.revenue) > 5000000) {
        strengths.push(`Chiffre d'affaires élevé (${revenue}) permettant des investissements stratégiques`);
    }
    if (ebitda !== 'non spécifié' && parseInt(data.ebitda) > 1000000) {
        strengths.push(`Rentabilité solide avec un EBITDA de ${ebitda}`);
    }
    if (employees !== 'non spécifié' && parseInt(employees) > 50) {
        strengths.push(`Équipe expérimentée de ${employees} employés`);
    }
    if (sectorInfo.avgMargin) {
        strengths.push(`Secteur avec des marges attractives (moyenne secteur: ${sectorInfo.avgMargin})`);
    }
    if (sectorInfo.barriersToEntry === 'Très élevées' || sectorInfo.barriersToEntry === 'Élevées') {
        strengths.push(`Barrières à l'entrée élevées dans le secteur protégeant la position concurrentielle`);
    }
    
    // Faiblesses (internal negative)
    const weaknesses = [];
    if (revenue !== 'non spécifié' && parseInt(data.revenue) < 1000000) {
        weaknesses.push(`Taille limitée (CA: ${revenue}) réduisant la capacité d'investissement`);
    }
    if (employees !== 'non spécifié' && parseInt(employees) < 10) {
        weaknesses.push(`Équipe réduite limitant la capacité opérationnelle`);
    }
    if (sectorInfo.competition === 'Très élevée' || sectorInfo.competition === 'Élevée') {
        weaknesses.push(`Concurrence intense dans le secteur`);
    }
    if (constraints.toLowerCase().includes('ressource') || constraints.toLowerCase().includes('finance')) {
        weaknesses.push(`Contraintes financières ou de ressources: ${constraints}`);
    }
    
    // Opportunités (external positive)
    const opportunities = [];
    if (sectorInfo.growthRate) {
        opportunities.push(`Croissance du secteur: ${sectorInfo.growthRate} par an`);
    }
    if (sectorInfo.ebitdaMultiple) {
        opportunities.push(`Multiples d'EBITDA attractifs dans le secteur: ${sectorInfo.ebitdaMultiple}`);
    }
    if (sectorInfo.barriersToEntry === 'Faibles') {
        opportunities.push(`Barrières à l'entrée faibles permettant une expansion rapide`);
    }
    if (goals.toLowerCase().includes('croissance')) {
        opportunities.push(`Possibilité d'acquisitions ciblées pour atteindre les objectifs de ${goals}`);
    }
    if (goals.toLowerCase().includes('diversification')) {
        opportunities.push(`Diversification vers des secteurs complémentaires`);
    }
    
    // Menaces (external negative)
    const threats = [];
    if (sectorInfo.threatNewEntrants === 'Élevée' || sectorInfo.threatNewEntrants === 'Très élevée') {
        threats.push(`Risque d'arrivée de nouveaux concurrents`);
    }
    if (sectorInfo.threatSubstitutes === 'Élevée' || sectorInfo.threatSubstitutes === 'Très élevée') {
        threats.push(`Menace des produits/services substituts`);
    }
    if (sectorInfo.rivalry === 'Très élevée' || sectorInfo.rivalry === 'Élevée') {
        threats.push(`Intensité de la rivalité concurrentielle élevée`);
    }
    if (sectorInfo.buyerPower === 'Élevée' || sectorInfo.buyerPower === 'Très élevée') {
        threats.push(`Pouvoir de négociation élevé des clients`);
    }
    if (sectorInfo.supplierPower === 'Élevé' || sectorInfo.supplierPower === 'Très élevé') {
        threats.push(`Dépendance vis-à-vis des fournisseurs`);
    }
    
    // Recommandations stratégiques
    const recommendations = [];
    if (strengths.length >= 3) {
        recommendations.push(`Capitaliser sur vos forces (${strengths[0].substring(0, 50)}...) pour renforcer votre position`);
    }
    if (weaknesses.length >= 2) {
        recommendations.push(`Travailler sur vos faiblesses, notamment: ${weaknesses[0].substring(0, 50)}...`);
    }
    if (opportunities.length >= 2) {
        recommendations.push(`Exploiter les opportunités du marché, en particulier: ${opportunities[0].substring(0, 50)}...`);
    }
    if (threats.length >= 2) {
        recommendations.push(`Mettre en place des stratégies de protection contre: ${threats[0].substring(0, 50)}...`);
    }
    
    // Score global (0-100)
    const score = calculateSWOTScore(strengths, weaknesses, opportunities, threats);
    
    return {
        summary: `Analyse SWOT pour ${companyName} (Secteur: ${sectorInfo.name}) - Score: ${score}/100`,
        context: `Cette analyse SWOT a été générée en fonction des données fournies et des benchmarks du secteur ${sectorInfo.name}.`,
        strengths: strengths,
        weaknesses: weaknesses,
        opportunities: opportunities,
        threats: threats,
        recommendations: recommendations,
        strategicInsights: `Votre entreprise présente un profil équilibré avec ${strengths.length} forces majeures et ${weaknesses.length} faiblesses à adresser. Le secteur offre ${opportunities.length} opportunités intéressantes malgré ${threats.length} menaces identifiées.`,
        score: score
    };
}

// Calculer un score SWOT (0-100)
function calculateSWOTScore(strengths, weaknesses, opportunities, threats) {
    let score = 50; // Score de base
    
    // Chaque force ajoute des points
    score += strengths.length * 5;
    
    // Chaque faiblesse soustrait des points
    score -= weaknesses.length * 3;
    
    // Chaque opportunité ajoute des points
    score += opportunities.length * 4;
    
    // Chaque menace soustrait des points
    score -= threats.length * 2;
    
    // Normaliser entre 0 et 100
    return Math.min(100, Math.max(0, score));
}

// Générer une analyse Porter 5 Forces
function generatePorter(data) {
    const sector = data.sector || 'entreprise';
    const sectorInfo = SECTOR_DATA[sector.toLowerCase()] || SECTOR_DATA.conseil;
    const companyName = data.companyName || 'votre entreprise';
    const positioning = data.positioning || 'Acteur local';
    const marketShare = data.marketShare ? data.marketShare + '%' : 'non spécifiée';
    
    // Calculer les scores pour chaque force (0-100)
    const scores = {
        supplierPower: calculatePorterScore(sectorInfo.supplierPower),
        buyerPower: calculatePorterScore(sectorInfo.buyerPower),
        newEntrants: calculatePorterScore(sectorInfo.threatNewEntrants),
        substitutes: calculatePorterScore(sectorInfo.threatSubstitutes),
        rivalry: calculatePorterScore(sectorInfo.rivalry)
    };
    
    // Description des forces
    const descriptions = {
        supplierPower: `Le pouvoir des fournisseurs est ${sectorInfo.supplierPower.toLowerCase()} dans le secteur ${sectorInfo.name}. ${getSupplierPowerDescription(sectorInfo.supplierPower)}`,
        buyerPower: `Le pouvoir des clients est ${sectorInfo.buyerPower.toLowerCase()} dans le secteur ${sectorInfo.name}. ${getBuyerPowerDescription(sectorInfo.buyerPower)}`,
        newEntrants: `La menace des nouveaux entrants est ${sectorInfo.threatNewEntrants.toLowerCase()} en raison ${getBarriersDescription(sectorInfo.barriersToEntry)}.`,
        substitutes: `La menace des substituts est ${sectorInfo.threatSubstitutes.toLowerCase()}. ${getSubstitutesDescription(sector)}`,
        rivalry: `L'intensité de la rivalité est ${sectorInfo.rivalry.toLowerCase()}. ${getRivalryDescription(sectorInfo.competition)}`
    };
    
    // Évaluation globale
    const avgScore = (scores.supplierPower + scores.buyerPower + scores.newEntrants + scores.substitutes + scores.rivalry) / 5;
    const overallAssessment = `Le secteur ${sectorInfo.name} présente une attractivité ${getAttractivity(avgScore)} avec un score moyen de ${Math.round(avgScore)}/100. ${positioning} avec une part de marché de ${marketShare} a une position ${getPositionAssessment(avgScore, positioning)}.`;
    
    // Recommandations
    const recommendations = [];
    if (scores.supplierPower > 70) {
        recommendations.push(`Négocier des contrats long terme avec les fournisseurs pour sécuriser les approvisionnements`);
    }
    if (scores.buyerPower > 70) {
        recommendations.push(`Développer des programmes de fidélisation client pour réduire leur pouvoir de négociation`);
    }
    if (scores.newEntrants > 70) {
        recommendations.push(`Renforcer les barrières à l'entrée via des brevets, des économies d'échelle ou des partenariats exclusifs`);
    }
    if (scores.rivalry > 70) {
        recommendations.push(`Éviter les guerres de prix et se différencier par la qualité ou l'innovation`);
    }
    
    return {
        summary: `Analyse Porter 5 Forces pour ${companyName} (Secteur: ${sectorInfo.name})`,
        supplierPower: descriptions.supplierPower,
        supplierPowerScore: scores.supplierPower,
        buyerPower: descriptions.buyerPower,
        buyerPowerScore: scores.buyerPower,
        newEntrants: descriptions.newEntrants,
        newEntrantsScore: scores.newEntrants,
        substitutes: descriptions.substitutes,
        substitutesScore: scores.substitutes,
        rivalry: descriptions.rivalry,
        rivalryScore: scores.rivalry,
        overallAssessment: overallAssessment,
        recommendations: recommendations,
        score: Math.round(avgScore)
    };
}

// Calculer un score Porter (0-100) à partir d'une description
function calculatePorterScore(description) {
    const scores = {
        'Faible': 80,
        'faible': 80,
        'Faibles': 85,
        'faibles': 85,
        'Moyen': 50,
        'moyen': 50,
        'Moyenne': 50,
        'moyenne': 50,
        'Élevé': 30,
        'élevé': 30,
        'Élevée': 20,
        'élevée': 20,
        'Très élevé': 10,
        'très élevé': 10,
        'Très élevée': 10,
        'très élevée': 10
    };
    return scores[description] || 50;
}

// Descriptions pour Porter
function getSupplierPowerDescription(power) {
    const descriptions = {
        'Faible': 'ce qui permet une bonne marge de négociation.',
        'Moyen': 'avec un équilibre dans la relation.',
        'Élevé': 'ce qui peut réduire vos marges.',
        'Très élevé': 'ce qui constitue un risque majeur pour vos marges.'
    };
    return descriptions[power] || '';
}

function getBuyerPowerDescription(power) {
    const descriptions = {
        'Faible': 'ce qui permet de maintenir de bonnes marges.',
        'Moyen': 'avec une certaine pression sur les prix.',
        'Élevé': 'ce qui peut forcer à baisser les prix.',
        'Très élevé': 'ce qui peut réduire significativement vos marges.'
    };
    return descriptions[power] || '';
}

function getBarriersDescription(barriers) {
    const descriptions = {
        'Faibles': 'des barrières à l\'entrée faibles',
        'faibles': 'des barrières à l\'entrée faibles',
        'Moyennes': 'de barrières à l\'entrée modérées',
        'moyennes': 'de barrières à l\'entrée modérées',
        'Élevées': 'de barrières à l\'entrée élevées (réglementation, investissement)',
        'élevées': 'de barrières à l\'entrée élevées (réglementation, investissement)',
        'Très élevées': 'de barrières à l\'entrée très élevées (brevets, licenses)',
        'très élevées': 'de barrières à l\'entrée très élevées (brevets, licenses)'
    };
    return descriptions[barriers] || 'des barrières à l\'entrée';
}

function getSubstitutesDescription(sector) {
    const sectorDesc = {
        'technologie': 'd\'innovation rapide dans le secteur tech.',
        'santé': 'de l\'innovation médicale constante.',
        'finance': 'des fintechs et solutions alternatives.',
        'retail': 'du e-commerce et nouveaux canaux de distribution.',
        'immobilier': 'de nouvelles solutions de logement.'
    };
    return sectorDesc[sector.toLowerCase()] || 'de produits/services alternatifs.';
}

function getRivalryDescription(competition) {
    const descriptions = {
        'Faible': 'avec peu de concurrents directs.',
        'Modérée': 'avec une concurrence raisonnable.',
        'Élevée': 'avec de nombreux concurrents directs.',
        'Très élevée': 'dans un marché très saturé.'
    };
    return descriptions[competition] || '';
}

function getAttractivity(score) {
    if (score > 70) return 'très attractive';
    if (score > 50) return 'attractive';
    if (score > 30) return 'modérément attractive';
    return 'peu attractive';
}

function getPositionAssessment(score, positioning) {
    if (score > 70) {
        if (positioning === 'Leader') return 'dominante';
        return 'favorable';
    }
    if (score > 50) return 'correcte';
    if (score > 30) return 'défavorable';
    return 'très défavorable';
}

// Générer une analyse PESTEL
function generatePestel(data) {
    const sector = data.sector || 'entreprise';
    const sectorInfo = SECTOR_DATA[sector.toLowerCase()] || SECTOR_DATA.conseil;
    const companyName = data.companyName || 'votre entreprise';
    const country = data.country || 'France';
    const targetMarket = data.targetMarket || 'marché français';
    const growthRate = data.growthRate ? data.growthRate + '%' : sectorInfo.growthRate;
    
    // Analyser chaque facteur
    const factors = {
        political: generatePestelFactor('Politique', sector, country, data),
        economic: generatePestelFactor('Économique', sector, country, data),
        social: generatePestelFactor('Socioculturel', sector, country, data),
        technological: generatePestelFactor('Technologique', sector, country, data),
        environmental: generatePestelFactor('Environnemental', sector, country, data),
        legal: generatePestelFactor('Légal', sector, country, data)
    };
    
    // Évaluation globale
    const avgImpact = (factors.political.impact + factors.economic.impact + factors.social.impact + 
                      factors.technological.impact + factors.environmental.impact + factors.legal.impact) / 6;
    
    const overallAssessment = `L'environnement PESTEL pour ${companyName} dans le secteur ${sectorInfo.name} (${country}) est ${getPestelAssessment(avgImpact)}. La croissance du marché est de ${growthRate}, ce qui offre ${getGrowthOpportunity(growthRate)}.`;
    
    // Recommandations
    const recommendations = [];
    if (factors.technological.trend === 'Positif') {
        recommendations.push(`Investir dans l'innovation technologique pour rester compétitif`);
    }
    if (factors.economic.trend === 'Négatif') {
        recommendations.push(`Optimiser les coûts et diversifier les sources de revenus`);
    }
    if (factors.legal.impact > 70) {
        recommendations.push(`Renforcer la conformité réglementaire`);
    }
    if (factors.environmental.impact > 70) {
        recommendations.push(`Intégrer des pratiques durables pour anticiper les réglementations`);
    }
    
    return {
        summary: `Analyse PESTEL pour ${companyName} (Secteur: ${sectorInfo.name}, Pays: ${country})`,
        political: factors.political.description,
        economic: factors.economic.description,
        social: factors.social.description,
        technological: factors.technological.description,
        environmental: factors.environmental.description,
        legal: factors.legal.description,
        overallAssessment: overallAssessment,
        recommendations: recommendations,
        score: Math.round(avgImpact)
    };
}

// Générer un facteur PESTEL
function generatePestelFactor(factorName, sector, country, data) {
    const sectorLower = sector.toLowerCase();
    const descriptions = {
        Politique: {
            technologie: `Stabilité politique en ${country}. Subventions possibles pour l'innovation (crédit impôt recherche).`,
            santé: `Réglementation stricte dans le secteur santé en ${country}. Opportunités via les politiques publiques de santé.`,
            finance: `Environnement réglementaire complexe pour la finance en ${country}. Surveillance accrue post-crise.`,
            industrie: `Politiques industrielles favorables en ${country} (relocalisation, subventions).`,
            retail: `Réglementation du commerce en ${country} (horaires, urbanisme commercial).`,
            energie: `Politiques énergétiques en transition en ${country} (subventions aux énergies renouvelables).`,
            immobilier: `Réglementation immobilière en ${country} (lois ALUR, encadrement des loyers).`,
            conseil: `Environnement politique stable en ${country} favorisant les services.`
        },
        Économique: {
            technologie: `Croissance économique soutenue par le digital. Taux d'intérêt historiquement bas.`,
            santé: `Dépenses de santé en hausse constante. Budget public sous pression.`,
            finance: `Environnement de taux bas. Concurrence accrue avec les fintechs.`,
            industrie: `Coûts énergétiques élevés en ${country}. Concurrence internationale forte.`,
            retail: `Pouvoir d'achat des ménages en ${country} variable. Inflation sur les matières premières.`,
            energie: `Prix de l'énergie volatils. Investissements massifs dans la transition énergétique.`,
            immobilier: `Marché immobilier en ${country} tendu. Taux d'intérêt en hausse.`,
            conseil: `Demande soutenue pour les services de conseil malgré la conjoncture.`
        },
        Socioculturel: {
            technologie: `Population de plus en plus connectée. Attentes élevées en matière d'innovation.`,
            santé: `Vieillissement de la population. Sensibilisation accrue à la santé préventive.`,
            finance: `Méfiance croissante envers les banques traditionnelles. Adoption du digital banking.`,
            industrie: `Perte d'attractivité des métiers industriels. Besoin de formation continue.`,
            retail: `Changement des habitudes de consommation (e-commerce, circuit court).`,
            energie: `Sensibilisation environnementale croissante. Attente de transparence.`,
            immobilier: `Changement des modes de vie (télétravail, coliving).`,
            conseil: `Demande croissante d'expertise externe.`
        },
        Technologique: {
            technologie: `Innovation rapide. Nécessité de R&D constante pour rester compétitif.`,
            santé: `Révolution digitale dans la santé (télémédecine, IA diagnostique).`,
            finance: `Blockchain, open banking, IA transformant le secteur.`,
            industrie: `Industrie 4.0, robotisation, IoT révolutionnant la production.`,
            retail: `E-commerce, big data, personnalisation transformant le retail.`,
            energie: `Smart grids, stockage d'énergie, énergies renouvelables en développement.`,
            immobilier: `Proptech, visites virtuelles, gestion intelligente des bâtiments.`,
            conseil: `Outils digitaux et data analytics révolutionnant le conseil.`
        },
        Environnemental: {
            technologie: `Impact environnemental de la production électronique. Réglementation REP.`,
            santé: `Enjeux des déchets médicaux. Réglementation stricte sur les produits chimiques.`,
            finance: `Finance verte en développement. Pressions pour désinvestir des énergies fossiles.`,
            industrie: `Transition vers l'industrie verte. Normes environnementales de plus en plus strictes.`,
            retail: `Emballages, gaspillage alimentaire sous surveillance.`,
            energie: `Transition énergétique majeure. Objectifs carbone contraignants.`,
            immobilier: `Réglementation thermique (RE2020). Rénovation énergétique des bâtiments.`,
            conseil: `Demande croissante pour l'accompagnement dans la transition écologique.`
        },
        Légal: {
            technologie: `RGPD, droit d'auteur, propriété intellectuelle complexes.`,
            santé: `Réglementation sanitaire stricte. Certifications obligatoires.`,
            finance: `Réglementation bancaire (Bâle III, DSP2). Lutte contre le blanchiment.`,
            industrie: `Normes de sécurité, droit du travail strict.`,
            retail: `Droit de la consommation, garanties légales, sécurité des produits.`,
            energie: `Réglementation complexe du secteur énergétique.`,
            immobilier: `Droit de la construction, loi Hoguet, diagnostics obligatoires.`,
            conseil: `Responsabilité civile professionnelle, secret professionnel.`
        }
    };
    
    const defaultDesc = {
        Politique: `Environnement politique stable en ${country}.`,
        Économique: `Croissance économique modérée en ${country}.`,
        Socioculturel: `Évolution démographique et sociale favorable.`,
        Technologique: `Innovation technologique soutenue.`,
        Environnemental: `Prise de conscience environnementale croissante.`,
        Légal: `Cadre réglementaire stable.`
    };
    
    const factorDescriptions = descriptions[factorName] || {};
    const description = factorDescriptions[sectorLower] || defaultDesc[factorName];
    
    // Calculer un impact (0-100)
    const impact = Math.floor(Math.random() * 40) + 30; // Entre 30 et 70 pour varier
    
    // Déterminer la tendance
    const trends = ['Positif', 'Neutre', 'Négatif'];
    const trend = trends[Math.floor(Math.random() * trends.length)];
    
    return {
        description: description,
        impact: impact,
        trend: trend
    };
}

function getPestelAssessment(score) {
    if (score > 70) return 'globalement favorable';
    if (score > 50) return 'moyennement favorable';
    if (score > 30) return 'peu favorable';
    return 'déavorable';
}

function getGrowthOpportunity(rate) {
    if (rate.includes('>') || parseFloat(rate) > 7) {
        return 'des opportunités de croissance significatives';
    }
    if (parseFloat(rate) > 4) {
        return 'des opportunités de croissance';
    }
    return 'un environnement plus difficile';
}

// Générer une analyse concurrentielle
function generateCompetitive(data) {
    const sector = data.sector || 'entreprise';
    const sectorInfo = SECTOR_DATA[sector.toLowerCase()] || SECTOR_DATA.conseil;
    const companyName = data.companyName || 'votre entreprise';
    const competitors = data.competitors ? data.competitors.split('\n').filter(c => c.trim()) : ['Concurrent A', 'Concurrent B'];
    const revenue = data.revenue ? parseInt(data.revenue) : 0;
    const marketShare = data.marketShare ? parseFloat(data.marketShare) : 0;
    
    // Calculer un score global
    const baseScore = 50;
    let score = baseScore;
    
    // Facteurs positifs
    if (revenue > 10000000) score += 10; // CA > 10M
    if (revenue > 50000000) score += 10; // CA > 50M
    if (marketShare > 10) score += 15; // Part de marché > 10%
    if (marketShare > 25) score += 10; // Part de marché > 25%
    if (sectorInfo.competition === 'Faible') score += 15;
    if (sectorInfo.barriersToEntry === 'Très élevées' || sectorInfo.barriersToEntry === 'Élevées') score += 10;
    
    // Facteurs négatifs
    if (marketShare < 5) score -= 10; // Part de marché < 5%
    if (sectorInfo.competition === 'Très élevée' || sectorInfo.competition === 'Élevée') score -= 15;
    if (competitors.length > 5) score -= 10; // Beaucoup de concurrents
    
    score = Math.min(100, Math.max(0, score));
    
    // Avantages concurrentiels
    const competitiveAdvantages = [];
    if (score > 70) {
        competitiveAdvantages.push('Position de leader sur le marché');
    }
    if (revenue > 10000000) {
        competitiveAdvantages.push('Taille critique permettant des économies d\'échelle');
    }
    if (sectorInfo.barriersToEntry !== 'Faibles') {
        competitiveAdvantages.push(`Barrières à l'entrée ${sectorInfo.barriersToEntry} protégeant le marché`);
    }
    
    // Générer des concurrents avec des scores
    const competitorsList = competitors.map((name, index) => ({
        name: name.trim(),
        overallScore: Math.max(0, score - (index + 1) * 10),
        priceIndex: Math.random() * 10,
        qualityIndex: Math.random() * 10
    }));
    
    // Recommandations
    const recommendations = [];
    if (score < 60) {
        recommendations.push(`Renforcer la différenciation produit/service pour gagner des parts de marché`);
    }
    if (competitors.length > 3) {
        recommendations.push(`Analyser les forces et faiblesses des principaux concurrents`);
    }
    if (marketShare < 10) {
        recommendations.push(`Développer une stratégie de croissance externe (acquisitions, partenariats)`);
    }
    
    return {
        summary: `Analyse concurrentielle pour ${companyName} (Secteur: ${sectorInfo.name})`,
        overallScore: score,
        competitiveAdvantage: competitiveAdvantages.length > 0 ? competitiveAdvantages.join(', ') : 'Positionnement standard',
        competitors: competitorsList,
        recommendations: recommendations,
        score: score
    };
}

// Générer une analyse par défaut (pour les types non supportés)
function generateDefaultAnalysis(type, data) {
    const companyName = data.companyName || 'votre entreprise';
    const sector = data.sector || 'entreprise';
    
    return {
        summary: `Analyse ${type} pour ${companyName} (Secteur: ${sector})`,
        rawResponse: `Cette analyse de type ${type} sera disponible prochainement. En attendant, voici une évaluation générale.`,
        recommendations: [
            `Consulter un expert DPAI pour une analyse approfondie de type ${type}`,
            `Compléter les informations de votre entreprise pour des résultats plus précis`
        ],
        score: 50
    };
}

// Formater un nombre avec des espaces
function formatNumber(num) {
    if (!num) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Générateur principal
function generateAnalysis(type, data) {
    switch (type) {
        case 'swot':
            return generateSWOT(data);
        case 'porter':
            return generatePorter(data);
        case 'pestel':
            return generatePestel(data);
        case 'competitive':
            return generateCompetitive(data);
        default:
            return generateDefaultAnalysis(type, data);
    }
}

// Exporter les fonctions
window.AnalysisGenerator = {
    generateAnalysis,
    generateSWOT,
    generatePorter,
    generatePestel,
    generateCompetitive,
    SECTOR_DATA
};

// Exporter la fonction principale
window.generateAnalysis = generateAnalysis;

console.log('%c[Analysis-Generator] Générateur local d\'analyses initialisé', 'color: #28a745; font-weight: bold;');
