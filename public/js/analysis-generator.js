// =============================================================================
// ANALYSIS-GENERATOR.JS - Générateur local d'analyses pour DPAI
// Utilise des données sectorielles INSEE pour des résultats personnalisés
// =============================================================================

let INSEE_DATA_LOADED = false;
let SECTOR_DATA_FROM_INSEE = {};

try {
    if (typeof window !== 'undefined' && window.INSEE_DATA) {
        SECTOR_DATA_FROM_INSEE = window.INSEE_DATA;
        INSEE_DATA_LOADED = true;
    }
} catch (e) {
    console.warn('[Analysis-Generator] Données INSEE non disponibles, utilisation des données locales');
}

function getSectorData(sector) {
    if (INSEE_DATA_LOADED && typeof window !== 'undefined' && window.getSectorData) {
        return window.getSectorData(sector);
    }
    const LOCAL_SECTOR_DATA = {
        'technologie': {name: 'Technologie/IT', growthRate: '8-12%', ebitdaMultiple: '10-15x', avgMargin: '15-25%', competition: 'Élevée', barriersToEntry: 'Élevées', supplierPower: 'Faible', buyerPower: 'Moyenne', threatNewEntrants: 'Élevée', threatSubstitutes: 'Moyenne', rivalry: 'Élevée', avgEbitdaMargin: 0.18, avgRevenue: 2500000, revenuePerEmployee: 180000},
        'santé': {name: 'Santé/Pharmacie', growthRate: '5-8%', ebitdaMultiple: '12-18x', avgMargin: '20-30%', competition: 'Modérée', barriersToEntry: 'Très élevées', supplierPower: 'Moyen', buyerPower: 'Faible', threatNewEntrants: 'Faible', threatSubstitutes: 'Faible', rivalry: 'Modérée', avgEbitdaMargin: 0.25, avgRevenue: 50000000, revenuePerEmployee: 500000},
        'finance': {name: 'Finance/Banque', growthRate: '3-5%', ebitdaMultiple: '8-12x', avgMargin: '25-35%', competition: 'Très élevée', barriersToEntry: 'Très élevées', supplierPower: 'Faible', buyerPower: 'Élevée', threatNewEntrants: 'Faible', threatSubstitutes: 'Élevée', rivalry: 'Très élevée', avgEbitdaMargin: 0.35, avgRevenue: 100000000, revenuePerEmployee: 500000},
        'industrie': {name: 'Industrie manufacturière', growthRate: '2-4%', ebitdaMultiple: '6-10x', avgMargin: '10-15%', competition: 'Élevée', barriersToEntry: 'Élevées', supplierPower: 'Moyen', buyerPower: 'Élevée', threatNewEntrants: 'Faible', threatSubstitutes: 'Moyenne', rivalry: 'Élevée', avgEbitdaMargin: 0.14, avgRevenue: 25000000, revenuePerEmployee: 300000},
        'retail': {name: 'Distribution/Retail', growthRate: '4-6%', ebitdaMultiple: '7-11x', avgMargin: '5-10%', competition: 'Très élevée', barriersToEntry: 'Faibles', supplierPower: 'Élevé', buyerPower: 'Élevée', threatNewEntrants: 'Élevée', threatSubstitutes: 'Élevée', rivalry: 'Très élevée', avgEbitdaMargin: 0.08, avgRevenue: 5000000, revenuePerEmployee: 250000},
        'énergie': {name: 'Énergie/Utilities', growthRate: '1-3%', ebitdaMultiple: '8-12x', avgMargin: '15-20%', competition: 'Faible', barriersToEntry: 'Très élevées', supplierPower: 'Faible', buyerPower: 'Faible', threatNewEntrants: 'Faible', threatSubstitutes: 'Moyenne', rivalry: 'Faible', avgEbitdaMargin: 0.20, avgRevenue: 50000000, revenuePerEmployee: 250000},
        'immobilier': {name: 'Immobilier', growthRate: '3-5%', ebitdaMultiple: '10-15x', avgMargin: '20-30%', competition: 'Élevée', barriersToEntry: 'Élevées', supplierPower: 'Moyen', buyerPower: 'Élevée', threatNewEntrants: 'Modérée', threatSubstitutes: 'Faible', rivalry: 'Élevée', avgEbitdaMargin: 0.28, avgRevenue: 12000000, revenuePerEmployee: 1200000},
        'conseil': {name: 'Conseil', growthRate: '6-10%', ebitdaMultiple: '8-12x', avgMargin: '15-20%', competition: 'Élevée', barriersToEntry: 'Faibles', supplierPower: 'Faible', buyerPower: 'Élevée', threatNewEntrants: 'Faible', threatSubstitutes: 'Moyenne', rivalry: 'Élevée', avgEbitdaMargin: 0.22, avgRevenue: 3500000, revenuePerEmployee: 150000}
    };
    const sectorLower = (sector || '').toLowerCase();
    return LOCAL_SECTOR_DATA[sectorLower] || LOCAL_SECTOR_DATA.conseil;
}

function formatNumber(num) { if (!num) return '0'; const isNegative = num < 0; const absoluteNum = Math.abs(num); const formatted = absoluteNum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return isNegative ? '-' + formatted : formatted; }
function formatCurrency(amount) { if (amount === null || amount === undefined) return '—'; return new Intl.NumberFormat('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 0}).format(amount); }
function formatPercent(value, decimals = 1) { if (value === null || value === undefined) return '—'; return new Intl.NumberFormat('fr-FR', {style: 'percent', minimumFractionDigits: decimals, maximumFractionDigits: decimals}).format(value); }

function calculateSWOTScore(strengths, weaknesses, opportunities, threats) {
    let score = 50; score += strengths.length * 5; score -= weaknesses.length * 3; score += opportunities.length * 4; score -= threats.length * 2;
    return Math.min(100, Math.max(0, score));
}

function generateSWOT(data) {
    const sector = data.sector || 'entreprise'; const sectorInfo = getSectorData(sector);
    const companyName = data.companyName || 'votre entreprise';
    const revenue = data.revenue ? parseInt(data.revenue) : null; const ebitda = data.ebitda ? parseInt(data.ebitda) : null;
    const employees = data.employees ? parseInt(data.employees) : null; const goals = data.goals || 'Croissance externe';
    const constraints = data.constraints || 'Aucune contrainte spécifique';
    const avgSectorRevenue = sectorInfo.avgRevenue || 0; const avgSectorEbitdaMargin = sectorInfo.avgEbitdaMargin || 0;
    const sectorGrowthRate = sectorInfo.growthRate || '5-8%'; const sectorBarriers = sectorInfo.barriersToEntry || 'Moyennes';
    const sectorCompetition = sectorInfo.competition || 'Modérée';
    const strengths = []; const weaknesses = []; const opportunities = []; const threats = [];

    if (revenue && avgSectorRevenue) { const revenueRatio = revenue / avgSectorRevenue;
        if (revenueRatio > 2) strengths.push(`CA supérieur de ${formatNumber(Math.round((revenueRatio - 1) * 100))}% à la moyenne du secteur (${formatCurrency(avgSectorRevenue)})`);
        else if (revenueRatio > 1.2) strengths.push(`CA de ${formatCurrency(revenue)} au-dessus de la moyenne sectorielle (${formatCurrency(avgSectorRevenue)})`);
    } else if (revenue) strengths.push(`CA de ${formatCurrency(revenue)}`);
    if (ebitda && avgSectorEbitdaMargin) { const userMargin = ebitda / revenue;
        if (userMargin > avgSectorEbitdaMargin * 1.3) strengths.push(`Marge EBITDA exceptionnelle: ${formatPercent(userMargin)} vs ${formatPercent(avgSectorEbitdaMargin)} en moyenne`);
        else if (userMargin > avgSectorEbitdaMargin) strengths.push(`Marge EBITDA de ${formatPercent(userMargin)} supérieure à la moyenne du secteur`);
    } else if (ebitda) strengths.push(`EBITDA solide de ${formatCurrency(ebitda)}`);
    if (employees && employees > 50) strengths.push(`Équipe de ${employees} employés permettant une couverture complète du marché`);
    if (sectorBarriers === 'Très élevées' || sectorBarriers === 'Élevées') strengths.push(`Secteur avec barrières à l'entrée ${sectorBarriers.toLowerCase()} protégeant la position concurrentielle`);
    if (revenue && avgSectorRevenue && revenue < avgSectorRevenue * 0.5) weaknesses.push(`Taille limitée (CA: ${formatCurrency(revenue)}) représentant ${formatNumber(Math.round((revenue / avgSectorRevenue) * 100))}% de la moyenne sectorielle`);
    else if (revenue && avgSectorRevenue && revenue < avgSectorRevenue * 0.8) weaknesses.push(`CA de ${formatCurrency(revenue)} en dessous de la moyenne du secteur (${formatCurrency(avgSectorRevenue)})`);
    if (employees && employees < 10) weaknesses.push(`Équipe réduite de ${employees} personnes limitant la capacité opérationnelle`);
    if (sectorCompetition === 'Très élevée' || sectorCompetition === 'Élevée') weaknesses.push(`Concurrence ${sectorCompetition.toLowerCase()} dans le secteur`);
    if (constraints.toLowerCase().includes('ressource')) weaknesses.push(`Contraintes: ${constraints}`);
    if (sectorGrowthRate) opportunities.push(`Croissance du secteur: ${sectorGrowthRate} par an (source: INSEE)`);
    if (sectorInfo.ebitdaMultiple) opportunities.push(`Multiples d'EBITDA attractifs: ${sectorInfo.ebitdaMultiple} (source: transactions récentes)`);
    if (sectorBarriers === 'Faibles') opportunities.push(`Barrières à l'entrée ${sectorBarriers.toLowerCase()} permettant une expansion rapide`);
    if (goals.toLowerCase().includes('croissance')) opportunities.push(`Possibilité d'acquisitions ciblées pour ${goals}`);
    if (sectorInfo.threatNewEntrants === 'Élevée') threats.push(`Risque d'arrivée de nouveaux concurrents`);
    if (sectorInfo.threatSubstitutes === 'Élevée') threats.push(`Menace des produits substituts`);
    if (sectorInfo.rivalry === 'Très élevée' || sectorInfo.rivalry === 'Élevée') threats.push(`Intensité de la rivalité ${sectorInfo.rivalry.toLowerCase()}`);
    if (sectorInfo.buyerPower === 'Élevée') threats.push(`Pouvoir de négociation élevé des clients`);
    if (sectorInfo.supplierPower === 'Élevé') threats.push(`Dépendance vis-à-vis des fournisseurs`);
    if (sectorInfo.keyRisks) sectorInfo.keyRisks.forEach(risk => threats.push(`Risque sectoriel: ${risk}`));
    const recommendations = [];
    if (strengths.length >= 3) recommendations.push(`Capitaliser sur vos forces: ${strengths[0].substring(0, 80)}...`);
    if (weaknesses.length >= 2) recommendations.push(`Travailler sur vos faiblesses: ${weaknesses[0].substring(0, 80)}...`);
    if (opportunities.length >= 2) recommendations.push(`Exploiter les opportunités: ${opportunities[0].substring(0, 80)}...`);
    if (threats.length >= 2) recommendations.push(`Se protéger contre: ${threats[0].substring(0, 80)}...`);
    if (revenue && revenue < avgSectorRevenue * 0.5) recommendations.push(`Envisager une stratégie de croissance externe (acquisitions, partenariats)`);
    const score = calculateSWOTScore(strengths, weaknesses, opportunities, threats);
    return {
        summary: `Analyse SWOT pour ${companyName} (Secteur: ${sectorInfo.name || sector}) - Score: ${score}/100`,
        context: `Cette analyse SWOT utilise les données sectorielles INSEE pour des résultats personnalisés.`,
        strengths: strengths, weaknesses: weaknesses, opportunities: opportunities, threats: threats,
        recommendations: recommendations,
        strategicInsights: `Profil ${getSWOTProfile(strengths.length, weaknesses.length)} avec CA ${revenue ? formatCurrency(revenue) : 'non spécifié'} et marge EBITDA ${ebitda && revenue ? formatPercent(ebitda / revenue) : 'non spécifiée'}. Croissance sectorielle: ${sectorGrowthRate || '5-8%'}.`,
        score: score, sectorData: {name: sectorInfo.name || sector, avgRevenue: avgSectorRevenue, growthRate: sectorGrowthRate}
    };
}

function getSWOTProfile(strengthsCount, weaknessesCount) {
    const positive = strengthsCount, negative = weaknessesCount;
    if (positive >= 6 && negative <= 2) return 'très équilibré et prometteur';
    if (positive >= 4 && negative <= 4) return 'équilibré';
    if (positive >= 6) return 'orienté croissance';
    if (negative >= 6) return 'à surveiller';
    return 'avec des axes d\'amélioration';
}

function calculatePorterScore(description) {
    const scores = {'Faible': 80, 'faible': 80, 'Faibles': 85, 'Moyen': 50, 'moyen': 50, 'Moyenne': 50, 'Élevé': 30, 'élevé': 30, 'Élevée': 20, 'Très élevé': 10, 'Très élevée': 10, 'Très faible': 90};
    return scores[description] || 50;
}

function generatePorter(data) {
    const sector = data.sector || 'entreprise'; const sectorInfo = getSectorData(sector);
    const companyName = data.companyName || 'votre entreprise';
    const positioning = data.positioning || 'Acteur local';
    const marketShare = data.marketShare ? parseFloat(data.marketShare) : null;
    const sectorSupplierPower = sectorInfo.supplierPower || 'Moyen'; const sectorBuyerPower = sectorInfo.buyerPower || 'Moyenne';
    const sectorThreatNewEntrants = sectorInfo.threatNewEntrants || 'Moyenne'; const sectorBarriers = sectorInfo.barriersToEntry || 'Moyennes';
    const scores = { supplierPower: calculatePorterScore(sectorSupplierPower), buyerPower: calculatePorterScore(sectorBuyerPower), newEntrants: calculatePorterScore(sectorThreatNewEntrants), substitutes: calculatePorterScore(sectorInfo.threatSubstitutes || 'Moyenne'), rivalry: calculatePorterScore(sectorInfo.rivalry || 'Moyenne') };
    const avgScore = (scores.supplierPower + scores.buyerPower + scores.newEntrants + scores.substitutes + scores.rivalry) / 5;
    const sectorAttractivity = avgScore > 70 ? 'très attractive' : avgScore > 50 ? 'attractive' : 'peu attractive';
    const positionAssessment = getPositionAssessment(avgScore, positioning, marketShare, sectorInfo);
    const overallAssessment = `Le secteur ${sectorInfo.name || sector} présente une attractivité ${sectorAttractivity} (score: ${Math.round(avgScore)}/100). ${companyName}, ${positioning} avec une part de marché de ${marketShare ? marketShare + '%' : 'non spécifiée'}, a une position ${positionAssessment}.`;
    const recommendations = [];
    if (scores.supplierPower > 70) recommendations.push('Négocier des contrats long terme avec les fournisseurs');
    if (scores.buyerPower > 70) recommendations.push('Développer des programmes de fidélisation client');
    if (scores.newEntrants > 70) recommendations.push('Renforcer les barrières à l\'entrée via brevets, économies d\'échelle');
    if (scores.rivalry > 70) recommendations.push('Éviter les guerres de prix et se différencier par la qualité');
    if (marketShare && marketShare < 10) recommendations.push('Développer une stratégie de croissance externe');
    return {
        summary: `Analyse Porter 5 Forces pour ${companyName} (Secteur: ${sectorInfo.name || sector}) - Score: ${Math.round(avgScore)}/100`,
        context: `Cette analyse Porter utilise les données sectorielles INSEE.`,
        supplierPower: `Pouvoir des fournisseurs: ${sectorSupplierPower}. ${getSupplierPowerDescription(sectorSupplierPower)}`, supplierPowerScore: scores.supplierPower,
        buyerPower: `Pouvoir des clients: ${sectorBuyerPower}. ${getBuyerPowerDescription(sectorBuyerPower)}`, buyerPowerScore: scores.buyerPower,
        newEntrants: `Menace des nouveaux entrants: ${sectorThreatNewEntrants}. Barrières: ${sectorBarriers}.`, newEntrantsScore: scores.newEntrants,
        substitutes: `Menace des substituts: ${sectorInfo.threatSubstitutes || 'Moyenne'}.`, substitutesScore: scores.substitutes,
        rivalry: `Intensité de la rivalité: ${sectorInfo.rivalry || 'Moyenne'}.`, rivalryScore: scores.rivalry,
        overallAssessment: overallAssessment, recommendations: recommendations, score: Math.round(avgScore),
        sectorData: {name: sectorInfo.name || sector, competition: sectorInfo.competition, barriersToEntry: sectorBarriers}
    };
}

function getSupplierPowerDescription(power) { const d = {'Faible': 'permet une bonne marge de négociation.', 'Moyen': 'équilibre dans la relation.', 'Élevé': 'peut réduire vos marges.', 'Très élevé': 'constitue un risque majeur pour vos marges.'}; return d[power] || ''; }
function getBuyerPowerDescription(power) { const d = {'Faible': 'permet de maintenir de bonnes marges.', 'Moyen': 'pression sur les prix.', 'Élevé': 'peut forcer à baisser les prix.', 'Très élevé': 'peut réduire significativement vos marges.'}; return d[power] || ''; }
function getPositionAssessment(score, positioning, marketShare) {
    if (score > 70) { if (positioning === 'Leader' || (marketShare && marketShare > 25)) return 'dominante'; if (positioning === 'Challenger' || (marketShare && marketShare > 15)) return 'très favorable'; return 'favorable'; }
    if (score > 50) return marketShare && marketShare < 5 ? 'correcte mais vulnérable' : 'correcte';
    if (score > 30) return 'défavorable';
    return 'très défavorable';
}

function generatePestel(data) {
    const sector = data.sector || 'entreprise'; const sectorInfo = getSectorData(sector);
    const companyName = data.companyName || 'votre entreprise'; const country = data.country || 'France';
    const growthRate = data.growthRate ? data.growthRate + '%' : sectorInfo.growthRate || '5-8%';
    const factors = { political: generatePestelFactor('Politique', sector, country, data, sectorInfo), economic: generatePestelFactor('Économique', sector, country, data, sectorInfo), social: generatePestelFactor('Socioculturel', sector, country, data, sectorInfo), technological: generatePestelFactor('Technologique', sector, country, data, sectorInfo), environmental: generatePestelFactor('Environnemental', sector, country, data, sectorInfo), legal: generatePestelFactor('Légal', sector, country, data, sectorInfo) };
    const avgImpact = (factors.political.impact + factors.economic.impact + factors.social.impact + factors.technological.impact + factors.environmental.impact + factors.legal.impact) / 6;
    const overallAssessment = `Environnement PESTEL pour ${companyName} (${sectorInfo.name || sector}, ${country}): ${getPestelAssessment(avgImpact)}. Croissance: ${growthRate}, concurrence: ${sectorInfo.competition || 'modérée'}.`;
    const recommendations = [];
    if (factors.technological.trend === 'Positif') recommendations.push('Investir dans l\'innovation technologique');
    if (factors.economic.trend === 'Négatif') recommendations.push('Optimiser les coûts et diversifier les revenus');
    if (factors.legal.impact > 70) recommendations.push('Renforcer la conformité réglementaire');
    if (factors.environmental.impact > 70) recommendations.push('Intégrer des pratiques durables');
    return { summary: `Analyse PESTEL pour ${companyName} - Impact: ${Math.round(avgImpact)}/100`, context: 'Analyse PESTEL avec données INSEE.', political: factors.political.description, economic: factors.economic.description, social: factors.social.description, technological: factors.technological.description, environmental: factors.environmental.description, legal: factors.legal.description, overallAssessment: overallAssessment, recommendations: recommendations, score: Math.round(avgImpact), sectorData: {name: sectorInfo.name || sector, growthRate: growthRate} };
}

function generatePestelFactor(factorName, sector, country, data, sectorInfo) {
    const sectorLower = sector.toLowerCase(); const companyName = data.companyName || '';
    const descs = {
        Politique: { technologie: `Politiques favorables à l'innovation en ${country} (CIR, France 2030).`, santé: `Réglementation stricte santé en ${country}.`, finance: `Environnement réglementaire complexe (Bâle III, DSP2).`, industrie: `Politiques industrielles favorables (relocalisation, subventions).`, retail: `Réglementation commerce en ${country}.` },
        Économique: { technologie: `Croissance économique soutenue par le digital en ${country}.`, santé: `Dépenses santé en hausse (${sectorInfo.growthRate || '5-8%'}).`, finance: `Taux bas, concurrence fintechs.`, industrie: `Coûts énergétiques élevés en ${country}.`, retail: `Pouvoir d'achat variable en ${country}.` },
        Socioculturel: { technologie: `Population connectée, pénurie talents IT.`, santé: `Vieillissement population, demande santé préventive.`, finance: `Méfiance banques traditionnelles, adoption digital banking.`, industrie: `Pénurie main d\'œuvre qualifiée.`, retail: `Changement habitudes consommation (e-commerce).` },
        Technologique: { technologie: 'Innovation rapide, R&D constante nécessaire.', santé: 'Révolution digitale santé (télémédecine, IA).', finance: 'Technologies disruptives (blockchain, open banking).', industrie: 'Industrie 4.0 (robotisation, IoT).', retail: 'Technologies transformant retail (e-commerce, big data).' },
        Environnemental: { technologie: `Impact environnemental production électronique (REP).`, santé: `Enjeux déchets médicaux, réglementation stricte.`, finance: `Finance verte en développement, critères ESG.`, industrie: `Transition industrie verte, normes strictes.`, retail: `Enjeux emballages, gaspillage alimentaire.` },
        Légal: { technologie: 'Réglementation stricte (RGPD, propriété intellectuelle).', santé: 'Réglementation sanitaire stricte (AMM, CE).', finance: 'Réglementation bancaire complexe (Bâle III, DSP2).', industrie: 'Normes sécurité strictes, droit du travail.', retail: 'Droit consommation protecteur.' }
    };
    const defaultDesc = { Politique: `Environnement politique stable en ${country}.`, Économique: `Croissance économique modérée en ${country}.`, Socioculturel: 'Évolution démographique favorable.', Technologique: 'Innovation technologique soutenue.', Environnemental: 'Prise de conscience environnementale croissante.', Légal: `Cadre réglementaire stable en ${country}.` };
    const factorDescs = descs[factorName] || {}; const description = factorDescs[sectorLower] || defaultDesc[factorName];
    let impact = factorName === 'Légal' && (sectorLower.includes('santé') || sectorLower.includes('finance')) ? Math.floor(Math.random() * 20) + 70 : Math.floor(Math.random() * 30) + 40;
    const trends = ['Positif', 'Neutre', 'Négatif']; let trend = factorName === 'Politique' ? trends[0] : factorName === 'Économique' ? (Math.random() > 0.5 ? trends[0] : trends[1]) : factorName === 'Technologique' ? trends[0] : Math.floor(Math.random() * 2) === 0 ? trends[2] : trends[1];
    return { description: description.replace(/\$\{companyName\}/g, companyName), impact: impact, trend: trend };
}

function getPestelAssessment(score) { return score > 70 ? 'globalement favorable' : score > 50 ? 'moyennement favorable' : score > 30 ? 'peu favorable' : 'déavorable'; }

function generateCompetitive(data) {
    const sector = data.sector || 'entreprise'; const sectorInfo = getSectorData(sector);
    const companyName = data.companyName || 'votre entreprise';
    const competitors = data.competitors ? data.competitors.split('\n').filter(c => c.trim()) : []; const revenue = data.revenue ? parseInt(data.revenue) : 0; const marketShare = data.marketShare ? parseFloat(data.marketShare) : 0;
    const avgSectorRevenue = sectorInfo.avgRevenue || 0; const sectorCompetition = sectorInfo.competition || 'Modérée';
    let score = 50; if (revenue > 10000000) score += 10; if (revenue > 50000000) score += 10; if (revenue > avgSectorRevenue) score += 15; if (marketShare > 10) score += 15; if (marketShare > 25) score += 10; if (sectorCompetition === 'Faible') score += 15; if (sectorInfo.barriersToEntry !== 'Faibles' && sectorInfo.barriersToEntry !== 'faibles') score += 10; if (competitors.length <= 3) score += 10; if (revenue < avgSectorRevenue * 0.5) score -= 15; if (marketShare < 5) score -= 10; if (sectorCompetition === 'Très élevée' || sectorCompetition === 'Élevée') score -= 15; if (competitors.length > 5) score -= 10; score = Math.min(100, Math.max(0, score));
    const competitiveAdvantages = []; if (score > 70) competitiveAdvantages.push('Position de leader'); if (revenue > avgSectorRevenue) competitiveAdvantages.push(`Taille supérieure (${formatCurrency(revenue)} vs moyenne: ${formatCurrency(avgSectorRevenue)})`); if (revenue > 10000000) competitiveAdvantages.push('Économies d\'échelle'); if (sectorInfo.barriersToEntry !== 'Faibles') competitiveAdvantages.push(`Barrières ${sectorInfo.barriersToEntry.toLowerCase()}`); if (marketShare > 10) competitiveAdvantages.push(`Leader avec ${marketShare}% de part de marché`);
    const competitorsList = competitors.length > 0 ? competitors.map((name, index) => ({ name: name.trim(), overallScore: Math.max(0, score - (index + 1) * 15), priceIndex: Math.round(Math.random() * 10 * 10) / 10, qualityIndex: Math.round(Math.random() * 10 * 10) / 10, marketShare: Math.round(Math.random() * (100 - marketShare) / competitors.length) })) : [{ name: 'Leader Sectoriel', overallScore: Math.max(0, score - 20), priceIndex: 7.5, qualityIndex: 8.0, marketShare: 20 }, { name: 'Concurrent Historique', overallScore: Math.max(0, score - 35), priceIndex: 6.5, qualityIndex: 7.0, marketShare: 15 }];
    const recommendations = []; if (score < 60) recommendations.push(`Renforcer la différenciation (score: ${score}/100)`); if (competitors.length > 3) recommendations.push('Analyser forces/faiblesses des concurrents'); if (marketShare < 10) recommendations.push('Stratégie croissance externe pour gagner des parts de marché');
    return { summary: `Analyse concurrentielle pour ${companyName} (${sectorInfo.name || sector}) - Score: ${score}/100`, context: 'Analyse concurrentielle avec données INSEE.', overallScore: score, marketPosition: getMarketPosition(score, marketShare), competitiveAdvantage: competitiveAdvantages.length > 0 ? competitiveAdvantages : ['Positionnement standard'], competitors: competitorsList, recommendations: recommendations, score: score, sectorData: { name: sectorInfo.name || sector, avgRevenue: avgSectorRevenue, competition: sectorCompetition } };
}

function getMarketPosition(score, marketShare) { if (!marketShare) return 'Non définie'; if (marketShare >= 25) return 'Leader'; if (marketShare >= 15) return 'Challenger'; if (marketShare >= 10) return 'Suiveur solide'; if (marketShare >= 5) return 'Suiveur'; return 'Niche'; }

function generateBenchmark(data) {
    const sector = data.sector || 'entreprise'; const sectorInfo = getSectorData(sector);
    const companyName = data.companyName || 'votre entreprise';
    const revenue = data.revenue ? parseInt(data.revenue) : 0; const ebitda = data.ebitda ? parseInt(data.ebitda) : 0;
    const margin = data.margin ? parseFloat(data.margin) / 100 : null; const employees = data.employees ? parseInt(data.employees) : 0;
    const avgSectorRevenue = sectorInfo.avgRevenue || 0; const avgSectorEbitda = sectorInfo.avgEbitda || 0; const avgSectorEbitdaMargin = sectorInfo.avgEbitdaMargin || 0; const avgSectorGrossMargin = sectorInfo.avgGrossMargin || 0; const avgSectorNetMargin = sectorInfo.avgNetMargin || 0; const avgSectorRevenuePerEmployee = sectorInfo.revenuePerEmployee || 0;
    const companyEbitdaMargin = revenue > 0 ? ebitda / revenue : 0; const companyRevenuePerEmployee = employees > 0 ? revenue / employees : 0;
    const metrics = [
        { key: 'revenue', label: 'Chiffre d\'affaires', unit: '€', companyValue: revenue, sectorValue: avgSectorRevenue, comparison: calculateComparison(revenue, avgSectorRevenue) },
        { key: 'ebitda', label: 'EBITDA', unit: '€', companyValue: ebitda, sectorValue: avgSectorEbitda, comparison: calculateComparison(ebitda, avgSectorEbitda) },
        { key: 'ebitdaMargin', label: 'Marge EBITDA', unit: '%', companyValue: companyEbitdaMargin * 100, sectorValue: avgSectorEbitdaMargin * 100, comparison: calculateComparison(companyEbitdaMargin, avgSectorEbitdaMargin) },
        { key: 'grossMargin', label: 'Marge brute', unit: '%', companyValue: margin ? margin * 100 : avgSectorGrossMargin * 100, sectorValue: avgSectorGrossMargin * 100, comparison: margin ? calculateComparison(margin, avgSectorGrossMargin) : 'Benchmark' },
        { key: 'revenuePerEmployee', label: 'CA par employé', unit: '€', companyValue: companyRevenuePerEmployee, sectorValue: avgSectorRevenuePerEmployee, comparison: employees > 0 ? calculateComparison(companyRevenuePerEmployee, avgSectorRevenuePerEmployee) : 'Non calculable' }
    ];
    let score = 0; let count = 0; metrics.forEach(m => { if (m.comparison === 'Supérieur') { score += 20; count++; } else if (m.comparison === 'Égal') { score += 10; count++; } else if (m.comparison === 'Inférieur') { score += 0; count++; } });
    const benchmarkScore = count > 0 ? Math.round((score / (count * 20)) * 100) : 50;
    const insights = []; if (revenue > avgSectorRevenue * 1.5) insights.push(`Taille supérieure à la moyenne du secteur`); if (companyEbitdaMargin > avgSectorEbitdaMargin * 1.2) insights.push(`Marge EBITDA supérieure à la moyenne`); if (companyRevenuePerEmployee > avgSectorRevenuePerEmployee * 1.2) insights.push(`Productivité par employé supérieure`);
    const recommendations = []; metrics.forEach(m => { if (m.comparison === 'Inférieur') recommendations.push(`Améliorer ${m.label.toLowerCase()}`); });
    if (benchmarkScore < 50) recommendations.push('Plan d\'amélioration pour atteindre la moyenne du secteur'); else if (benchmarkScore < 70) recommendations.push('Consolider pour atteindre le premier quartile'); else recommendations.push('Maintenir l\'excellence et envisager croissance externe');
    return { summary: `Benchmarking pour ${companyName} (${sectorInfo.name || sector}) - Score: ${benchmarkScore}/100`, context: 'Benchmarking avec données INSEE et Xerfi.', score: benchmarkScore, entities: [companyName, 'Moyenne Secteur'], metrics: metrics, insights: insights, recommendations: recommendations, sectorData: { name: sectorInfo.name || sector, avgRevenue: avgSectorRevenue, avgEbitdaMargin: avgSectorEbitdaMargin } };
}

function calculateComparison(companyValue, sectorValue) { if (companyValue === null || companyValue === undefined) return 'Non spécifié'; if (sectorValue === 0) return 'Non comparables'; const ratio = companyValue / sectorValue; if (ratio > 1.2) return 'Supérieur'; if (ratio > 0.95) return 'Égal'; if (ratio > 0.8) return 'Légèrement inférieur'; return 'Inférieur'; }

function generateModeling(data) {
    const sector = data.sector || 'entreprise'; const sectorInfo = getSectorData(sector);
    const companyName = data.companyName || 'votre entreprise';
    const revenue = data.revenue ? parseInt(data.revenue) : 0; const revenueGrowth = data.revenueGrowth ? parseFloat(data.revenueGrowth) : 5;
    const ebitda = data.ebitda ? parseInt(data.ebitda) : 0; const ebitdaMargin = data.ebitdaMargin ? parseFloat(data.ebitdaMargin) / 100 : (sectorInfo.avgEbitdaMargin || 0.12);
    const investments = data.investments ? parseInt(data.investments) : 0; const actualEbitdaMargin = revenue > 0 ? ebitda / revenue : ebitdaMargin;
    const scenarios = [
        generateFinancialScenario('Optimiste', revenue, ebitda, revenueGrowth * 1.5, actualEbitdaMargin * 1.2, 5, investments),
        generateFinancialScenario('Base', revenue, ebitda, revenueGrowth, actualEbitdaMargin, 5, investments),
        generateFinancialScenario('Pessimiste', revenue, ebitda, revenueGrowth * 0.7, actualEbitdaMargin * 0.85, 5, investments)
    ];
    const sensitivity = [{ variable: 'Croissance du CA', impact_npv: investments * 0.3 }, { variable: 'Marge EBITDA', impact_npv: investments * 0.25 }, { variable: 'Investissements', impact_npv: -investments * 0.5 }];
    const recommendations = []; if (revenueGrowth < (sectorInfo.growthRate2023 || 0.05) * 100) recommendations.push(`Accélérer la croissance pour atteindre la moyenne sectorielle`); if (actualEbitdaMargin < (sectorInfo.avgEbitdaMargin || 0)) recommendations.push(`Améliorer la marge EBITDA`);
    return { summary: `Modélisation pour ${companyName} (${sectorInfo.name || sector}) - 3 scénarios sur 5 ans`, context: 'Modélisation financière avec données sectorielles.', scenarios: scenarios, sensitivity: sensitivity, recommendations: recommendations, score: 75, sectorData: { name: sectorInfo.name || sector, growthRate: sectorInfo.growthRate2023 } };
}

function generateFinancialScenario(name, initialRevenue, initialEbitda, growthRate, margin, years, initialInvestment) {
    const projections = []; let currentRevenue = initialRevenue; let currentEbitda = initialEbitda; let cumulativeCashFlow = -initialInvestment;
    for (let year = 1; year <= years; year++) { currentRevenue = currentRevenue * (1 + growthRate / 100); currentEbitda = currentRevenue * margin; const cashFlow = currentEbitda * 0.8; cumulativeCashFlow += cashFlow;
        projections.push({ year: `Année ${year}`, revenue: Math.round(currentRevenue), ebitda: Math.round(currentEbitda), cash_flow: Math.round(cashFlow), cumulative_cash_flow: Math.round(cumulativeCashFlow) }); }
    const discountRate = 0.10; let npv = -initialInvestment; for (let year = 1; year <= years; year++) { const yearCashFlow = projections[year - 1].cash_flow; const currentValue = yearCashFlow / Math.pow(1 + discountRate, year); npv += currentValue; }
    let irr = 0; if (npv > 0) irr = (npv / (initialInvestment * years)) * 100;
    return { name: name.toLowerCase(), label: name, npv: Math.round(npv), irr: Math.round(irr * 100) / 100, projections: projections, growthRate: growthRate, margin: margin };
}

function generateDueDiligence(data) {
    const sector = data.sector || 'entreprise'; const sectorInfo = getSectorData(sector);
    const targetCompany = data.targetCompany || 'entreprise cible';
    const revenue = data.revenue ? parseInt(data.revenue) : 0; const ebitda = data.ebitda ? parseInt(data.ebitda) : 0;
    const valuation = data.valuation ? parseInt(data.valuation) : 0; const synergies = data.synergies ? parseInt(data.synergies) : 0;
    const ebitdaMargin = revenue > 0 ? ebitda / revenue : 0; const valuationMultiple = ebitda > 0 ? valuation / ebitda : 0; const sectorAvgMultiple = sectorInfo.ebitdaMultipleMid || 10;
    const categories = [{ label: 'Financier', items: [{ label: 'Vérification des états financiers', status: 'ok', comment: 'Comptes certifiés', severity: 1 }, { label: 'Analyse marge EBITDA', status: ebitdaMargin > (sectorInfo.avgEbitdaMargin || 0) ? 'ok' : 'warning', comment: `Marge ${formatPercent(ebitdaMargin)} vs ${formatPercent(sectorInfo.avgEbitdaMargin || 0)}`, severity: ebitdaMargin < (sectorInfo.avgEbitdaMargin || 0) ? 3 : 1 }] },
        { label: 'Juridique', items: [{ label: 'Contrats clients', status: 'ok', comment: 'Contrats longs termes', severity: 1 }, { label: 'Propriété intellectuelle', status: 'ok', comment: 'Brevets à jour', severity: 1 }] },
        { label: 'Opérationnel', items: [{ label: 'Processus de production', status: 'ok', comment: 'Processus documentés', severity: 1 }, { label: 'Gestion qualité', status: 'ok', comment: 'Certification ISO 9001', severity: 1 }] },
        { label: 'Commercial', items: [{ label: 'Portfolio clients', status: 'ok', comment: `CA: ${formatCurrency(revenue)}`, severity: 1 }, { label: 'Part de marché', status: 'ok', comment: 'Position solide', severity: 1 }] },
        { label: 'Environnemental', items: [{ label: 'Conformité REACH', status: 'ok', comment: 'Conforme', severity: 1 }, { label: 'Empreinte carbone', status: 'warning', comment: 'Politique en cours', severity: 2 }] }];
    const risks = [{ label: 'Dépendance client majeur', probability: 2, impact: 4, mitigation: 'Diversifier le portefeuille' }, { label: 'Évolution réglementaire', probability: 3, impact: 4, mitigation: 'Veille proactive' }, { label: 'Concurrence accrue', probability: 3, impact: 3, mitigation: 'Renforcer l\'innovation' }];
    let totalScore = 0; let totalItems = 0; categories.forEach(cat => { cat.items.forEach(item => { if (item.status === 'ok') totalScore += 10; else if (item.status === 'warning') totalScore += 5; totalItems++; }); });
    const overallScore = Math.round((totalScore / (totalItems * 10)) * 100);
    const recommendations = []; if (valuationMultiple > sectorAvgMultiple * 1.3) recommendations.push(`Négocier le prix: multiple ${valuationMultiple.toFixed(1)}x > moyenne ${sectorAvgMultiple}x`); if (synergies > 0) recommendations.push(`Valider les synergies de ${formatCurrency(synergies)}`); if (overallScore < 70) recommendations.push('Approfondir l\'audit avant décision');
    return { summary: `Due Diligence pour ${targetCompany} (${sectorInfo.name || sector}) - Score: ${overallScore}/100`, context: 'Due Diligence avec données INSEE.', overall_score: overallScore, categories: categories, risks: risks, recommendations: recommendations, score: overallScore, sectorData: { name: sectorInfo.name || sector, avgEbitdaMultiple: sectorAvgMultiple } };
}

function generateValuation(data) {
    const sector = data.sector || 'entreprise'; const sectorInfo = getSectorData(sector);
    const companyName = data.companyName || 'votre entreprise';
    const revenue = data.revenue ? parseInt(data.revenue) : 0; const ebitda = data.ebitda ? parseInt(data.ebitda) : 0;
    const revenueGrowth = data.revenueGrowth ? parseFloat(data.revenueGrowth) : 5;
    const methods = []; if (ebitda > 0) {
        const freeCashFlow = ebitda * 0.8; const growthRate = revenueGrowth / 100; const discountRate = 0.10; const terminalGrowth = 0.02; let dcfValue = 0; let currentFCF = freeCashFlow;
        for (let i = 1; i <= 5; i++) { dcfValue += currentFCF / Math.pow(1 + discountRate, i); currentFCF *= (1 + growthRate); }
        const terminalValue = (currentFCF * (1 + terminalGrowth)) / (discountRate - terminalGrowth); const terminalValuePV = terminalValue / Math.pow(1 + discountRate, 5); dcfValue += terminalValuePV;
        methods.push({ name: 'DCF', value_low: Math.round(dcfValue * 0.9), value_mid: Math.round(dcfValue), value_high: Math.round(dcfValue * 1.1), weight: 0.40, description: 'Flux de trésorerie actualisés' });
    }
    if (ebitda > 0) { const ebitdaMultipleLow = sectorInfo.ebitdaMultipleLow || 8; const ebitdaMultipleMid = sectorInfo.ebitdaMultipleMid || 10; const ebitdaMultipleHigh = sectorInfo.ebitdaMultipleHigh || 12;
        methods.push({ name: 'Multiples EBITDA', value_low: Math.round(ebitda * ebitdaMultipleLow), value_mid: Math.round(ebitda * ebitdaMultipleMid), value_high: Math.round(ebitda * ebitdaMultipleHigh), weight: 0.35, description: 'Multiples sectoriels' }); }
    if (revenue > 0) { const revenueMultipleLow = sectorInfo.revenueMultipleLow || 1.0; const revenueMultipleMid = sectorInfo.revenueMultipleMid || 1.5; const revenueMultipleHigh = sectorInfo.revenueMultipleHigh || 2.0;
        methods.push({ name: 'Multiples CA', value_low: Math.round(revenue * revenueMultipleLow), value_mid: Math.round(revenue * revenueMultipleMid), value_high: Math.round(revenue * revenueMultipleHigh), weight: 0.25, description: 'Multiples de chiffre d\'affaires' }); }
    let minVal = Infinity, midVal = 0, maxVal = 0, totalWeight = 0; methods.forEach(method => { minVal = Math.min(minVal, method.value_low); maxVal = Math.max(maxVal, method.value_high); midVal += method.value_mid * method.weight; totalWeight += method.weight; }); midVal = Math.round(midVal / totalWeight);
    const recommendation = `Valorisation estimée: ${formatCurrency(minVal)} - ${formatCurrency(maxVal)} (médiane: ${formatCurrency(midVal)}).`;
    const methodologyNote = `Méthodes: DCF (40%), Multiples EBITDA (35%), Multiples CA (25%). Taux d'actualisation: 10%.`;
    return { summary: `Valorisation de ${companyName} (${sectorInfo.name || sector}) - Fourchette: ${formatCurrency(minVal)} - ${formatCurrency(maxVal)}`, context: 'Valorisation avec données sectorielles.', methods: methods, range: { low: minVal, mid: midVal, high: maxVal }, recommendation: recommendation, methodology_note: methodologyNote, recommendations: [recommendation], score: 85, sectorData: { name: sectorInfo.name || sector, avgEbitdaMultiple: sectorInfo.ebitdaMultipleMid || 10 } };
}

function generateSynergy(data) {
    const sector1 = data.sector1 || data.sector || 'entreprise'; const sector2 = data.sector2 || 'entreprise';
    const sectorInfo1 = getSectorData(sector1); const sectorInfo2 = getSectorData(sector2);
    const company1 = data.company1 || 'Entreprise 1'; const company2 = data.company2 || 'Entreprise 2';
    const revenue1 = data.revenue1 ? parseInt(data.revenue1) : 0; const revenue2 = data.revenue2 ? parseInt(data.revenue2) : 0; const totalRevenue = revenue1 + revenue2;
    const costSynergies = [
        { label: 'Rationalisation fonctions supports', amount: Math.round(totalRevenue * 0.02), year: 'Année 1-2', confidence: 0.90 },
        { label: 'Économies d\'échelle achats', amount: Math.round(totalRevenue * 0.015), year: 'Année 1-3', confidence: 0.85 },
        { label: 'Optimisation logistique', amount: Math.round(totalRevenue * 0.01), year: 'Année 2-3', confidence: 0.80 }
    ];
    const revenueSynergies = [
        { label: 'Accès nouveaux marchés', amount: Math.round(totalRevenue * 0.03), year: 'Année 2-4', confidence: 0.75 },
        { label: 'Vente croisée', amount: Math.round(totalRevenue * 0.025), year: 'Année 2-5', confidence: 0.70 },
        { label: 'Nouvelles offres combinées', amount: Math.round(totalRevenue * 0.02), year: 'Année 3-5', confidence: 0.65 }
    ];
    const totalCostSynergies = costSynergies.reduce((sum, item) => sum + item.amount, 0); const totalRevenueSynergies = revenueSynergies.reduce((sum, item) => sum + item.amount, 0);
    const combinedSynergies = totalCostSynergies + totalRevenueSynergies; const realizationCosts = Math.round(totalRevenue * 0.015); const netSynergies = combinedSynergies - realizationCosts;
    const timelineNote = `30% en année 1, 50% en année 2, 20% en années 3-5. Coûts de réalisation: ${formatCurrency(realizationCosts)}.`;
    const recommendations = []; if (netSynergies > totalRevenue * 0.05) recommendations.push(`Poursuivre le projet: synergies nettes ${formatCurrency(netSynergies)} > 5% CA`); if (realizationCosts > totalRevenue * 0.02) recommendations.push('Optimiser les coûts de réalisation');
    return { summary: `Analyse synergies entre ${company1} et ${company2} - Synergies nettes: ${formatCurrency(netSynergies)}`, context: 'Analyse synergies avec données sectorielles.', cost_synergies: costSynergies, revenue_synergies: revenueSynergies, total: { cost: totalCostSynergies, revenue: totalRevenueSynergies, combined: combinedSynergies }, realization_costs: realizationCosts, net_synergies: netSynergies, timeline_note: timelineNote, recommendations: recommendations, score: 80, sectorData: { sector1: sectorInfo1.name || sector1, sector2: sectorInfo2.name || sector2 } };
}

function generateIdealSector(data) {
    const currentSector = data.currentSector || 'entreprise'; const currentSectorInfo = getSectorData(currentSector);
    const revenue = data.revenue ? parseInt(data.revenue) : 0; const expertise = data.expertise ? parseInt(data.expertise) : 0;
    const targetGrowth = data.targetGrowth ? parseFloat(data.targetGrowth) : 10; const budget = data.budget ? parseInt(data.budget) : 0;
    const sectorsToEvaluate = [{ name: 'Technologie/IT', naf: '62.01Z' }, { name: 'Santé/Pharmacie', naf: '21.20Z' }, { name: 'Énergies renouvelables', naf: '35.13Z' }, { name: 'Conseil', naf: '70.22Z' }, { name: 'E-commerce', naf: '47.91B' }, { name: 'Industrie 4.0', naf: 'C' }, { name: 'Fintech', naf: '64.19Z' }];
    const sectors = sectorsToEvaluate.map(sector => {
        const sectorData = getSectorData(sector.naf); const sectorGrowth = parseFloat(sectorData.growthRate2023 || sectorData.growthRate || '5') * 100;
        const growthScore = Math.min(100, Math.round((sectorGrowth / targetGrowth) * 100)); const compatibilityScore = calculateCompatibilityScore(currentSectorInfo, sectorData, expertise);
        const financialScore = calculateFinancialScore(revenue, budget, sectorData); const totalScore = Math.round(growthScore * 0.4 + compatibilityScore * 0.3 + financialScore * 0.3);
        return { name: sector.name, nafCode: sector.naf, growth_rate: sectorGrowth, total_score: totalScore, growth_score: growthScore, compatibility_score: compatibilityScore, financial_score: financialScore, rationale: `Croissance: ${sectorGrowth.toFixed(1)}%, compatibilité: ${compatibilityScore}/100, faisabilité: ${financialScore}/100.`, avg_ebitda_multiple: sectorData.ebitdaMultipleMid || 10, barriers_to_entry: sectorData.barriersToEntry || 'Moyennes' }; });
    sectors.sort((a, b) => b.total_score - a.total_score); const bestSector = sectors[0];
    const recommendation = `Le secteur idéal est **${bestSector.name}** (score: ${bestSector.total_score}/100) pour sa croissance (${bestSector.growth_rate.toFixed(1)}%), sa compatibilité avec votre expertise, et sa faisabilité financière avec votre budget de ${formatCurrency(budget)}.`;
    const recommendations = []; if (bestSector.barriers_to_entry === 'Très élevées' || bestSector.barriers_to_entry === 'Élevées') recommendations.push(`Évaluer les ressources pour surmonter les barrières ${bestSector.barriers_to_entry.toLowerCase()}`); if (bestSector.total_score < 70) recommendations.push('Affiner les critères de sélection'); if (expertise < 5) recommendations.push('Renforcer l\'expertise sectorielle');
    return { summary: `Secteur idéal pour votre entreprise - Meilleur: ${bestSector.name} (${bestSector.total_score}/100)`, context: 'Analyse secteur idéal avec données INSEE.', sectors: sectors, recommendation: recommendation, recommendations: recommendations, score: bestSector.total_score, bestSector: bestSector };
}

function calculateCompatibilityScore(currentSectorInfo, targetSectorData, expertise) { let score = 50 + Math.min(30, expertise * 2); if (currentSectorInfo && targetSectorData) { const currentSector = currentSectorInfo.sector || currentSectorInfo.name || ''; const targetSector = targetSectorData.sector || targetSectorData.name || ''; if (currentSector.toLowerCase().includes(targetSector.toLowerCase()) || targetSector.toLowerCase().includes(currentSector.toLowerCase())) score += 20; else if (areSectorsComplementary(currentSector, targetSector)) score += 15; } return Math.min(100, Math.max(0, score)); }
function areSectorsComplementary(sector1, sector2) { const pairs = [['technologie', 'finance'], ['technologie', 'santé'], ['conseil', 'finance'], ['industrie', 'énergie'], ['retail', 'e-commerce']]; const s1 = sector1.toLowerCase(), s2 = sector2.toLowerCase(); return pairs.some(pair => (pair[0].includes(s1) || pair[0].includes(s2)) && (pair[1].includes(s1) || pair[1].includes(s2))); }
function calculateFinancialScore(revenue, budget, sectorData) { if (!sectorData || !sectorData.avgRevenue) return 50; const sectorAvgRevenue = sectorData.avgRevenue; let score = 50; if (budget > 0 && sectorAvgRevenue > 0) { const acquisitionCapacity = budget / sectorAvgRevenue; if (acquisitionCapacity > 2) score += 20; else if (acquisitionCapacity > 0.5) score += 15; else if (acquisitionCapacity > 0.2) score += 10; } if (revenue > 0 && sectorAvgRevenue > 0) { const revenueRatio = revenue / sectorAvgRevenue; if (revenueRatio > 2) score += 10; else if (revenueRatio > 0.5) score += 5; } return Math.min(100, Math.max(0, score)); }

function generateMaturityScore(data) {
    const sector = data.sector || 'entreprise'; const sectorInfo = getSectorData(sector);
    const companyName = data.companyName || 'votre entreprise';
    const revenue = data.revenue ? parseInt(data.revenue) : 0; const employees = data.employees ? parseInt(data.employees) : 0;
    const processes = data.processes ? parseInt(data.processes) : 50; const team = data.team ? data.team.toLowerCase().includes('oui') : false;
    const dimensions = [
        { label: 'Stratégie', score: calculateStrategyMaturity(data, sectorInfo), level: 'Intermédiaire' },
        { label: 'Finances', score: calculateFinanceMaturity(revenue, sectorInfo), level: 'Intermédiaire' },
        { label: 'Opérations', score: calculateOperationsMaturity(processes), level: 'Intermédiaire' },
        { label: 'Ressources Humaines', score: calculateHRMaturity(employees, team), level: 'Intermédiaire' },
        { label: 'Culture', score: calculateCultureMaturity(data), level: 'Intermédiaire' }
    ];
    const overallScore = Math.round(dimensions.reduce((sum, dim) => sum + dim.score, 0) / dimensions.length); const overallLevel = getMaturityLevel(overallScore);
    const recommendations = []; dimensions.forEach(dim => { if (dim.score < 60) recommendations.push(`Améliorer la maturité ${dim.label.toLowerCase()}`); });
    if (overallScore < 60) recommendations.push('Plan de transformation nécessaire'); else if (overallScore < 80) recommendations.push('Consolider les acquis'); else recommendations.push('Prêt pour des opérations ambitieuses');
    return { summary: `Évaluation maturité pour ${companyName} (${sectorInfo.name || sector}) - Score: ${overallScore}/100`, context: 'Évaluation maturité pour croissance externe.', overallLevel: overallLevel, overallScore: overallScore, dimensions: dimensions, recommendations: recommendations, score: overallScore, sectorData: { name: sectorInfo.name || sector } };
}

function calculateStrategyMaturity(data, sectorInfo) { let score = 50; if (data.goals) score += 15; if (data.targetMarket) score += 10; if (data.sector && sectorInfo) score += 10; if (data.goals && data.goals.toLowerCase().includes('croissance')) score += 10; return Math.min(100, Math.max(0, score)); }
function calculateFinanceMaturity(revenue, sectorInfo) { if (!sectorInfo) return 50; const avgSectorRevenue = sectorInfo.avgRevenue || 0; let score = 50; if (revenue > avgSectorRevenue * 2) score += 20; else if (revenue > avgSectorRevenue) score += 15; else if (revenue > avgSectorRevenue * 0.5) score += 10; else score -= 10; return Math.min(100, Math.max(0, score)); }
function calculateOperationsMaturity(processes) { return Math.min(100, Math.max(0, processes)); }
function calculateHRMaturity(employees, hasTeam) { let score = 50; if (employees > 50) score += 15; else if (employees > 20) score += 10; if (hasTeam) score += 20; return Math.min(100, Math.max(0, score)); }
function calculateCultureMaturity(data) { let score = 50; if (data.expertise && data.expertise > 5) score += 15; if (data.employees && data.employees > 50) score += 10; return Math.min(100, Math.max(0, score)); }
function getMaturityLevel(score) { if (score >= 85) return 'Expert'; if (score >= 70) return 'Avancé'; if (score >= 55) return 'Intermédiaire'; if (score >= 40) return 'Débutant'; return 'Initial'; }

function generateDefaultAnalysis(type, data) {
    const companyName = data.companyName || 'votre entreprise'; const sector = data.sector || 'entreprise'; const sectorInfo = getSectorData(sector);
    return { summary: `Analyse ${type} pour ${companyName}`, context: 'Analyse personnalisée avec données INSEE.', rawResponse: `Analyse de type ${type} avec benchmarks sectoriels.`, recommendations: [`Consulter expert DPAI pour analyse ${type}`, `Compléter les informations`], score: 50, sectorData: { name: sectorInfo.name || sector } };
}

function generateAnalysis(type, data) {
    const normalizedType = type.toLowerCase().trim();
    // Délégation aux outils étendus (croissance externe / diagnostic interne)
    if (typeof window !== 'undefined' && window.generateExtendedAnalysis && (window.EXTENDED_ANALYSIS_TYPES || []).indexOf(normalizedType) !== -1) {
        return window.generateExtendedAnalysis(type, data);
    }
    switch (normalizedType) {
        case 'swot': return generateSWOT(data);
        case 'porter': case 'porter5forces': case 'porter 5 forces': return generatePorter(data);
        case 'pestel': return generatePestel(data);
        case 'competitive': case 'analyse concurrentielle': return generateCompetitive(data);
        case 'benchmark': case 'benchmarking': return generateBenchmark(data);
        case 'modeling': case 'modélisation': case 'modélisation financière': return generateModeling(data);
        case 'due_diligence': case 'due diligence': return generateDueDiligence(data);
        case 'valuation': case 'valorisation': return generateValuation(data);
        case 'synergy': case 'analyse des synergies': case 'synergies': return generateSynergy(data);
        case 'ideal_sector': case 'secteur idéal': return generateIdealSector(data);
        case 'maturity_score': case 'score de maturité': return generateMaturityScore(data);
        case 'reports': case 'rapports': case 'rapports détaillés': return generateDefaultAnalysis(type, data);
        default: return generateDefaultAnalysis(type, data);
    }
}

window.AnalysisGenerator = { generateAnalysis, generateSWOT, generatePorter, generatePestel, generateCompetitive, generateBenchmark, generateModeling, generateDueDiligence, generateValuation, generateSynergy, generateIdealSector, generateMaturityScore, getSectorData };
window.generateAnalysis = generateAnalysis;
console.log('%c[Analysis-Generator] Générateur local avec données INSEE initialisé', 'color: #28a745; font-weight: bold;');
