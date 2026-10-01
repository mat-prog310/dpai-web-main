// =============================================================================
// ANALYSES.JS - Système d'analyses stratégiques avancées
// =============================================================================

// Références Firebase (exposées par firebase-config.js)
// db est défini globalement dans firebase-config.js

// =============================================================================
// CLASSE DE BASE POUR LES ANALYSES
// =============================================================================

class Analysis {
    constructor(type, name, description, companyData) {
        this.type = type;
        this.name = name || `Analyse ${type} - ${new Date().toLocaleDateString('fr-FR')}`;
        this.description = description || '';
        this.companyData = companyData || {};
        this.createdAt = new Date().toISOString();
        this.status = 'processing';
        this.results = {};
        this.recommendations = [];
        this.score = 0;
        this.confidence = 0;
    }

    async execute() {
        this.status = 'processing';
        try {
            await this.runAnalysis();
            this.status = 'completed';
            this.generateRecommendations();
            this.calculateScore();
        } catch (error) {
            this.status = 'failed';
            this.error = error.message;
            throw error;
        }
        return this;
    }

    async runAnalysis() {
        throw new Error('La méthode runAnalysis doit être implémentée par les sous-classes');
    }

    generateRecommendations() {
        this.recommendations = this.formatRecommendations(this.results);
    }

    calculateScore() {
        // Calcul d'un score global basé sur les résultats
        this.score = this.calculateAnalysisScore(this.results);
        this.confidence = this.calculateConfidence(this.results);
    }

    formatRecommendations(results) {
        return [];
    }

    calculateAnalysisScore(results) {
        return 0;
    }

    calculateConfidence(results) {
        return 0;
    }

    toJSON() {
        return {
            type: this.type,
            name: this.name,
            description: this.description,
            companyData: this.companyData,
            createdAt: this.createdAt,
            status: this.status,
            results: this.results,
            recommendations: this.recommendations,
            score: this.score,
            confidence: this.confidence,
            error: this.error
        };
    }
}

// =============================================================================
// ANALYSE SWOT
// =============================================================================

class SWOTAnalysis extends Analysis {
    constructor(name, description, companyData) {
        super('swot', name, description, companyData);
        this.category = 'strategic';
        this.cost = { free: 30, pro: 10, enterprise: 3 };
    }

    async runAnalysis() {
        const company = this.companyData;
        
        // Générer des forces basées sur les données de l'entreprise
        const strengths = this.generateStrengths(company);
        const weaknesses = this.generateWeaknesses(company);
        const opportunities = this.generateOpportunities(company);
        const threats = this.generateThreats(company);

        // Matrice SWOT
        const swotMatrix = {
            internal: {
                positive: strengths,
                negative: weaknesses
            },
            external: {
                positive: opportunities,
                negative: threats
            }
        };

        // Analyse SO, ST, WO, WT
        const strategicInsights = this.generateStrategicInsights(
            strengths, weaknesses, opportunities, threats
        );

        this.results = {
            strengths,
            weaknesses,
            opportunities,
            threats,
            swotMatrix,
            strategicInsights,
            summary: this.generateSummary(swotMatrix, strategicInsights)
        };

        return this.results;
    }

    generateStrengths(company) {
        const strengths = [];
        
        if (!company || Object.keys(company).length === 0) {
            return [];
        }

        // Forces basées sur les données réelles de l'entreprise
        // Part de marché
        if (company.marketShare !== undefined) {
            const marketSharePct = company.marketShare * 100;
            if (marketSharePct > 30) {
                strengths.push(`Leader du marché avec ${marketSharePct.toFixed(1)}% de part de marché`);
            } else if (marketSharePct > 20) {
                strengths.push(`Position forte sur le marché avec ${marketSharePct.toFixed(1)}% de parts`);
            } else if (marketSharePct > 10) {
                strengths.push(`Présence significative avec ${marketSharePct.toFixed(1)}% du marché`);
            } else if (marketSharePct > 5) {
                strengths.push(`Position de challenger avec ${marketSharePct.toFixed(1)}% de part de marché`);
            }
        }

        // Chiffre d'affaires
        if (company.revenue !== undefined) {
            const revenueStr = this.formatCurrency(company.revenue);
            if (company.revenue > 50000000) {
                strengths.push(`Chiffre d'affaires substantiel de ${revenueStr}, permettant des investissements stratégiques`);
            } else if (company.revenue > 10000000) {
                strengths.push(`CA solide de ${revenueStr}, assurant une bonne stabilité financière`);
            } else if (company.revenue > 1000000) {
                strengths.push(`Chiffre d'affaires de ${revenueStr} avec un bon potentiel de croissance`);
            }
        }

        // Effectifs
        if (company.employees !== undefined) {
            if (company.employees > 500) {
                strengths.push(`Effectif important de ${company.employees} employés, offrant une grande capacité opérationnelle`);
            } else if (company.employees > 100) {
                strengths.push(`Équipe de ${company.employees} personnes, alliant agilité et expertise`);
            } else if (company.employees > 20) {
                strengths.push(`Structure humaine de ${company.employees} employés, favorisant la réactivité`);
            }
        }

        // Technologie
        if (company.technology) {
            if (company.technology.includes('innovant') || company.technology.includes('innovante')) {
                strengths.push(`Technologie ${company.technology} offrant un avantage concurrentiel distinct`);
            } else if (company.technology.includes('moderne')) {
                strengths.push(`Infrastructure technologique moderne et performante`);
            } else if (company.technology === 'avancée' || company.technology === 'advanced') {
                strengths.push(`Technologie de pointe supportant l'innovation produit`);
            }
        }

        // Notoriété de la marque
        if (company.brandRecognition !== undefined) {
            if (company.brandRecognition > 9) {
                strengths.push(`Marque très reconnue dans le secteur, avec une forte crédibilité`);
            } else if (company.brandRecognition > 7) {
                strengths.push(`Bonne notoriété de la marque, facilitant l'acquisition client`);
            } else if (company.brandRecognition > 5) {
                strengths.push(`Notoriété de marque en développement, en croissance constante`);
            }
        }

        // Satisfaction client
        if (company.customerSatisfaction !== undefined) {
            if (company.customerSatisfaction > 9) {
                strengths.push(`Excellence en satisfaction client (${company.customerSatisfaction}/10), générant une forte fidélisation`);
            } else if (company.customerSatisfaction > 8) {
                strengths.push(`Taux de satisfaction client élevé (${company.customerSatisfaction}/10), supérieure à la moyenne du secteur`);
            } else if (company.customerSatisfaction > 7) {
                strengths.push(`Bonne satisfaction client (${company.customerSatisfaction}/10) avec une marge de progression`);
            }
        }

        // Brevets et propriété intellectuelle
        if (company.patents !== undefined) {
            if (company.patents > 10) {
                strengths.push(`Portfeuille impressionnant de ${company.patents} brevets, protégeant les innovations clés`);
            } else if (company.patents > 5) {
                strengths.push(`Portfeuille solide de ${company.patents} brevets, renforçant la position technologique`);
            } else if (company.patents > 0) {
                strengths.push(`Base de ${company.patents} brevet(s), fondement pour le développement technologique`);
            }
        }

        // Emplacement
        if (company.location) {
            if (company.location === 'strategic' || company.location === 'stratégique') {
                strengths.push(`Emplacement stratégique offrant un accès privilégié aux marchés clés`);
            } else if (company.location === 'central' || company.location === 'centre-ville') {
                strengths.push(`Positionnement géographique central, optimisant la logistique et l'accessibilité`);
            }
        }

        // Qualité des produits
        if (company.quality !== undefined) {
            if (company.quality > 8) {
                strengths.push(`Qualité des produits/services exceptionnelle (${company.quality}/10), reconnue par les clients`);
            } else if (company.quality > 6) {
                strengths.push(`Offre de qualité supérieure à la moyenne du marché (${company.quality}/10)`);
            }
        }

        // Innovation
        if (company.innovation !== undefined) {
            if (company.innovation > 8) {
                strengths.push(`Culture d'innovation très forte (${company.innovation}/10), moteur de croissance`);
            } else if (company.innovation > 6) {
                strengths.push(`Capacité d'innovation significative (${company.innovation}/10)`);
            }
        }

        // Service client
        if (company.customerService !== undefined) {
            if (company.customerService > 8) {
                strengths.push(`Service client d'excellence (${company.customerService}/10), différenciateur concurrentiel`);
            } else if (company.customerService > 6) {
                strengths.push(`Bon service client (${company.customerService}/10), contribuant à la satisfaction`);
            }
        }

        // Force de la marque
        if (company.brandStrength !== undefined) {
            if (company.brandStrength > 8) {
                strengths.push(`Marque forte et distincte (${company.brandStrength}/10) dans l'esprit des consommateurs`);
            } else if (company.brandStrength > 6) {
                strengths.push(`Marque bien positionnée (${company.brandStrength}/10) sur le marché`);
            }
        }

        // Distribution
        if (company.distribution !== undefined) {
            if (company.distribution > 8) {
                strengths.push(`Réseau de distribution très développé (${company.distribution}/10), assurant une large couverture`);
            } else if (company.distribution > 6) {
                strengths.push(`Bonne couverture de distribution (${company.distribution}/10)`);
            }
        }

        return strengths;
    }

    generateWeaknesses(company) {
        const weaknesses = [];

        if (!company || Object.keys(company).length === 0) {
            return [];
        }

        // Ratio d'endettement
        if (company.debtRatio !== undefined) {
            const debtPct = company.debtRatio * 100;
            if (debtPct > 70) {
                weaknesses.push(`Ratio d'endettement critique (${debtPct.toFixed(1)}%) limitant la capacité d'investissement`);
            } else if (debtPct > 60) {
                weaknesses.push(`Endettement élevé (${debtPct.toFixed(1)}%) impactant la flexibilité financière`);
            } else if (debtPct > 50) {
                weaknesses.push(`Niveau d'endettement à surveiller (${debtPct.toFixed(1)}%)`);
            }
        }

        // Concentration client
        if (company.customerConcentration !== undefined) {
            const concPct = company.customerConcentration * 100;
            if (concPct > 50) {
                weaknesses.push(`Dépendance dangereuse à un seul client (${concPct.toFixed(1)}% du CA)`);
            } else if (concPct > 30) {
                weaknesses.push(`Concentration client élevée (${concPct.toFixed(1)}% du CA) réduisant la stabilité`);
            } else if (concPct > 20) {
                weaknesses.push(`Dépendance modérée à certains clients (${concPct.toFixed(1)}% du CA)`);
            }
        }

        // Technologie
        if (company.technology) {
            if (company.technology.includes('vieillissant') || company.technology.includes('vieillissante')) {
                weaknesses.push(`Technologie vieillissante nécessitant une modernisation urgente pour rester compétitif`);
            } else if (company.technology === 'dépassée' || company.technology === 'obsolète') {
                weaknesses.push(`Infrastructure technologique dépassée, frein à l'innovation`);
            } else if (company.technology === 'basique' || company.technology === 'limitée') {
                weaknesses.push(`Technologie basique limitant les capacités opérationnelles`);
            }
        }

        // Part de marché
        if (company.marketShare !== undefined) {
            const marketSharePct = company.marketShare * 100;
            if (marketSharePct < 3) {
                weaknesses.push(`Part de marché très faible (${marketSharePct.toFixed(1)}%) limitant la visibilité`);
            } else if (marketSharePct < 5) {
                weaknesses.push(`Présence limitée sur le marché (${marketSharePct.toFixed(1)}%)`);
            } else if (marketSharePct < 10) {
                weaknesses.push(`Part de marché modeste (${marketSharePct.toFixed(1)}%)`);
            }
        }

        // Turnover employé
        if (company.employeeTurnover !== undefined) {
            const turnoverPct = company.employeeTurnover * 100;
            if (turnoverPct > 25) {
                weaknesses.push(`Taux de turnover très élevé (${turnoverPct.toFixed(1)}%) affectant la continuité opérationnelle`);
            } else if (turnoverPct > 15) {
                weaknesses.push(`Turnover élevé (${turnoverPct.toFixed(1)}%) indicateur de problèmes de rétention`);
            }
        }

        // Rotation des stocks
        if (company.inventoryDays !== undefined) {
            if (company.inventoryDays > 120) {
                weaknesses.push(`Rotation des stocks très lente (${company.inventoryDays} jours) impactant la trésorerie`);
            } else if (company.inventoryDays > 90) {
                weaknesses.push(`Gestion des stocks à améliorer (rotation de ${company.inventoryDays} jours)`);
            } else if (company.inventoryDays > 60) {
                weaknesses.push(`Rotation des stocks perfectible (${company.inventoryDays} jours)`);
            }
        }

        // Flux de trésorerie
        if (company.cashFlow !== undefined) {
            if (company.cashFlow < 0) {
                weaknesses.push(`Flux de trésorerie négatif nécessitant une attention immédiate`);
            } else if (company.cashFlow < company.revenue * 0.1) {
                weaknesses.push(`Marge de trésorerie limitée, vulnérabilité aux chocs`);
            }
        }

        // Coûts opérationnels
        if (company.variableCosts !== undefined) {
            if (company.variableCosts > 0.7) {
                weaknesses.push(`Structure de coûts déséquilibrée avec des coûts variables élevés (${(company.variableCosts * 100).toFixed(0)}%)`);
            }
        }

        // Qualité des produits
        if (company.quality !== undefined && company.quality < 6) {
            weaknesses.push(`Qualité des produits/services à améliorer (${company.quality}/10) par rapport aux concurrents`);
        }

        // Innovation
        if (company.innovation !== undefined && company.innovation < 5) {
            weaknesses.push(`Capacité d'innovation insuffisante (${company.innovation}/10) pour maintenir la compétitivité`);
        }

        // Service client
        if (company.customerService !== undefined && company.customerService < 6) {
            weaknesses.push(`Service client perfectible (${company.customerService}/10), source de mécontentement`);
        }

        // Distribution
        if (company.distribution !== undefined && company.distribution < 5) {
            weaknesses.push(`Réseau de distribution limité (${company.distribution}/10) restreignant l'accès au marché`);
        }

        return weaknesses;
    }

    generateOpportunities(company) {
        const opportunities = [];

        if (!company || Object.keys(company).length === 0) {
            return [];
        }

        // Croissance du marché
        if (company.market) {
            if (company.market.includes('croissance rapide') || company.marketGrowth > 15) {
                opportunities.push(`Marché en forte croissance (${company.marketGrowth || '>15'}%) offrant un potentiel important`);
            } else if (company.market.includes('croissance') || company.marketGrowth > 5) {
                opportunities.push(`Marché en croissance modérée (${company.marketGrowth || '5-15'}%) à exploiter`);
            } else if (company.market === 'stable') {
                opportunities.push(`Marché stable permettant une croissance organique par gain de parts`);
            }
        }

        // Potentiel d'innovation
        if (company.innovationPotential !== undefined) {
            if (company.innovationPotential > 9) {
                opportunities.push(`Potentiel d'innovation exceptionnel (${company.innovationPotential}/10) pour développer de nouveaux produits`);
            } else if (company.innovationPotential > 7) {
                opportunities.push(`Fort potentiel d'innovation (${company.innovationPotential}/10) à capitaliser`);
            } else if (company.innovationPotential > 5) {
                opportunities.push(`Potentiel d'innovation (${company.innovationPotential}/10) permettant de se différencier`);
            }
        }

        // Nouveaux marchés
        if (company.newMarkets && company.newMarkets.length > 0) {
            if (company.newMarkets.length > 3) {
                opportunities.push(`Nombreuses opportunités sur de nouveaux marchés: ${company.newMarkets.join(', ')}`);
            } else {
                opportunities.push(`Potentiel d'expansion sur ${company.newMarkets.join(', ')}`);
            }
        }

        // Opportunités de partenariat
        if (company.partnershipOpportunities && company.partnershipOpportunities.length > 0) {
            if (company.partnershipOpportunities.length > 2) {
                opportunities.push(`Multiples possibilités de partenariats stratégiques avec ${company.partnershipOpportunities.join(', ')}`);
            } else {
                opportunities.push(`Opportunité de partenariat avec ${company.partnershipOpportunities.join(', ')}`);
            }
        }

        // Tendances technologiques
        if (company.technologyTrends && company.technologyTrends.length > 0) {
            opportunities.push(`Possibilité d'adopter des technologies émergentes: ${company.technologyTrends.join(', ')} pour gagner en compétitivité`);
        }

        // Changements réglementaires
        if (company.regulationChanges) {
            if (company.regulationChanges.includes('favorable') || company.regulationChanges === 'positif') {
                opportunities.push(`Changements réglementaires favorables à exploiter pour développer l'activité`);
            } else if (Array.isArray(company.regulationChanges)) {
                const favorableChanges = company.regulationChanges.filter(r => r.includes('favorable') || r.includes('positif'));
                if (favorableChanges.length > 0) {
                    opportunities.push(`Opportunités liées aux changements réglementaires: ${favorableChanges.join(', ')}`);
                }
            }
        }

        // Tendances économiques
        if (company.economicTrends) {
            if (company.economicTrends === 'expansion' || company.economicTrends === 'forte croissance') {
                opportunities.push(`Contexte économique très porteur favorisant les investissements et la croissance`);
            } else if (company.economicTrends === 'croissance') {
                opportunities.push(`Contexte économique positif soutenant le développement`);
            } else if (company.economicTrends === 'stabilité') {
                opportunities.push(`Environnement économique stable permettant une croissance maîtrisée`);
            }
        }

        // Croissance du PIB
        if (company.gdpGrowth !== undefined) {
            if (company.gdpGrowth > 3) {
                opportunities.push(`Croissance économique forte (PIB +${company.gdpGrowth}%) stimulant la demande`);
            } else if (company.gdpGrowth > 1) {
                opportunities.push(`Croissance économique modérée (PIB +${company.gdpGrowth}%)`);
            }
        }

        // Marchés sous-exploités
        if (company.marketShare !== undefined && company.marketShare < 0.3) {
            opportunities.push(`Marge de progression importante sur le marché actuel (part de marché de ${(company.marketShare * 100).toFixed(1)}%)`);
        }

        // Diversification
        if (company.geographicCoverage === 'local' || company.geographicCoverage === 'régional') {
            opportunities.push(`Potentiel de diversification géographique au-delà du marché ${company.geographicCoverage}`);
        }

        // Produits/services
        if (company.productDifferentiation === 'low' || company.productDifferentiation === 'faible') {
            opportunities.push(`Opportunité de différenciation produit pour se démarquer de la concurrence`);
        }

        return opportunities;
    }

    generateThreats(company) {
        const threats = [];

        if (!company || Object.keys(company).length === 0) {
            return [];
        }

        // Concurrence
        if (company.competitors && company.competitors.length > 0) {
            if (company.competitors.length > 10) {
                threats.push(`Concurrence très intense avec plus de ${company.competitors.length} acteurs majeurs sur le marché`);
            } else if (company.competitors.length > 5) {
                threats.push(`Concurrence intense avec ${company.competitors.length} principaux concurrents`);
            } else if (company.competitors.length > 0) {
                threats.push(`Pression concurrentielle de ${company.competitors.length} concurrents directs`);
            }
        }

        // Part de marché des concurrents
        if (company.competitorMarketShare !== undefined) {
            const competitorSharePct = company.competitorMarketShare * 100;
            if (competitorSharePct > 60) {
                threats.push(`Domination écrasante des concurrents avec ${competitorSharePct.toFixed(1)}% du marché`);
            } else if (competitorSharePct > 40) {
                threats.push(`Part de marché des concurrents élevée (${competitorSharePct.toFixed(1)}%) limitant la croissance`);
            } else if (competitorSharePct > 20) {
                threats.push(`Pression concurrentielle significative (${competitorSharePct.toFixed(1)}% du marché détenu par les concurrents)`);
            }
        }

        // Changements réglementaires
        if (company.regulationChanges) {
            if (company.regulationChanges.includes('défavorable') || company.regulationChanges.includes('négatif')) {
                threats.push(`Changements réglementaires défavorables impactant négativement l'activité`);
            } else if (Array.isArray(company.regulationChanges)) {
                const unfavorableChanges = company.regulationChanges.filter(r => r.includes('défavorable') || r.includes('négatif') || r.includes('restrictif'));
                if (unfavorableChanges.length > 0) {
                    threats.push(`Menaces réglementaires: ${unfavorableChanges.join(', ')}`);
                }
            }
        }

        // Tendances économiques
        if (company.economicTrends) {
            if (company.economicTrends === 'récession' || company.economicTrends === 'crise') {
                threats.push(`Risque de récession économique impactant la demande globale`);
            } else if (company.economicTrends === 'ralentissement' || company.economicTrends === 'slowdown') {
                threats.push(`Ralentissement économique réduisant le pouvoir d'achat des clients`);
            } else if (company.economicTrends === 'incertain' || company.economicTrends === 'volatile') {
                threats.push(`Incertitude économique créant de la volatilité`);
            }
        }

        // Risques chaîne d'approvisionnement
        if (company.supplyChainRisks && company.supplyChainRisks.length > 0) {
            threats.push(`Risques dans la chaîne d'approvisionnement: ${company.supplyChainRisks.join(', ')} pouvant perturber l'activité`);
        }

        // Disruption technologique
        if (company.technologyDisruption && company.technologyDisruption.length > 0) {
            threats.push(`Menace de disruption technologique: ${company.technologyDisruption.join(', ')} risquant de rendre les produits obsolètes`);
        }

        // Changement des préférences
        if (company.customerPreferenceChanges) {
            threats.push(`Évolution des préférences des consommateurs pouvant rendre les produits/services moins attractifs`);
        }

        // Produits de substitution
        if (company.substitutes && company.substitutes.length > 0) {
            threats.push(`Menace des produits de substitution: ${company.substitutes.join(', ')} offrant des alternatives à moindre coût`);
        }

        // Fluctuations des taux de change
        if (company.exchangeRates === 'volatile' || company.exchangeRates === 'instable') {
            threats.push(`Volatilité des taux de change impactant les coûts et les marges`);
        }

        // Inflation
        if (company.inflationRate && company.inflationRate > 5) {
            threats.push(`Inflation élevée (${company.inflationRate}%) excerçant une pression sur les coûts`);
        }

        // Taux d'intérêt
        if (company.interestRates === 'high' || company.interestRates === 'élevés') {
            threats.push(`Taux d'intérêt élevés augmentant le coût du crédit`);
        }

        return threats;
    }

    generateStrategicInsights(strengths, weaknesses, opportunities, threats) {
        const insights = {
            SO: [], // Strengths-Opportunities
            ST: [], // Strengths-Threats
            WO: [], // Weaknesses-Opportunities
            WT: []  // Weaknesses-Threats
        };

        // Stratégies SO (agressives)
        strengths.forEach(s => {
            opportunities.forEach(o => {
                insights.SO.push(this.combineInsight(s, o, 'SO'));
            });
        });

        // Stratégies ST (défensives)
        strengths.forEach(s => {
            threats.forEach(t => {
                insights.ST.push(this.combineInsight(s, t, 'ST'));
            });
        });

        // Stratégies WO (amélioration)
        weaknesses.forEach(w => {
            opportunities.forEach(o => {
                insights.WO.push(this.combineInsight(w, o, 'WO'));
            });
        });

        // Stratégies WT (survie)
        weaknesses.forEach(w => {
            threats.forEach(t => {
                insights.WT.push(this.combineInsight(w, t, 'WT'));
            });
        });

        // Sélectionner les meilleures insights (max 3 par catégorie)
        for (const key in insights) {
            insights[key] = insights[key].slice(0, 3);
        }

        return insights;
    }

    combineInsight(item1, item2, type) {
        // Nettoyer les items pour éviter les doublons de mots
        const cleanItem = (str) => {
            return str.replace(/^le |la |les |un |une |des /i, '').trim();
        };

        const s1 = cleanItem(item1);
        const s2 = cleanItem(item2);

        const soTemplates = [
            `Lever ${s1} pour capitaliser sur ${s2}`,
            `Utiliser ${s1} afin de profiter pleinement de ${s2}`,
            `Exploiter ${s1} pour maximiser l'opportunité liée à ${s2}`,
            `Combiner ${s1} avec ${s2} pour créer un avantage concurrentiel`,
            `Tirer parti de ${s1} pour développer ${s2}`
        ];

        const stTemplates = [
            `Mobiliser ${s1} comme bouclier contre ${s2}`,
            `Renforcer ${s1} pour atténuer l'impact de ${s2}`,
            `Utiliser ${s1} de manière stratégique pour contrer ${s2}`,
            `Protéger ${s1} face à la menace de ${s2}`,
            `Transformer ${s1} en atout pour faire face à ${s2}`
        ];

        const woTemplates = [
            `Corriger ${s1} afin de pouvoir saisir ${s2}`,
            `Améliorer ${s1} pour être en position de bénéficier de ${s2}`,
            `Résoudre ${s1} afin d'exploiter pleinement ${s2}`,
            `Travailler sur ${s1} pour pouvoir capitaliser sur ${s2}`,
            `Surmonter ${s1} pour tirer profit de ${s2}`
        ];

        const wtTemplates = [
            `Agir rapidement pour éviter que ${s1} ne soit amplifié par ${s2}`,
            `Prévenir le scénario où ${s1} serait exacerbé par ${s2}`,
            `Mettre en place des mesures pour limiter l'impact de ${s2} sur ${s1}`,
            `Anticiper les conséquences de ${s2} sur ${s1}`,
            `Éviter la combinaison risquée entre ${s1} et ${s2}`
        ];

        const allTemplates = {
            SO: soTemplates,
            ST: stTemplates,
            WO: woTemplates,
            WT: wtTemplates
        };

        const templates = allTemplates[type];
        if (templates && templates.length > 0) {
            const randomIndex = Math.floor(Math.random() * templates.length);
            return templates[randomIndex];
        }
        return `${item1} -> ${item2}`;
    }

    generateSummary(swotMatrix, strategicInsights) {
        const strengths = swotMatrix.internal.positive;
        const weaknesses = swotMatrix.internal.negative;
        const opportunities = swotMatrix.external.positive;
        const threats = swotMatrix.external.negative;

        const strengthsCount = strengths.length;
        const weaknessesCount = weaknesses.length;
        const opportunitiesCount = opportunities.length;
        const threatsCount = threats.length;

        let overallAssessment = '';
        const internalBalance = strengthsCount - weaknessesCount;
        const externalBalance = opportunitiesCount - threatsCount;

        // Analyser les forces dominantes
        if (strengthsCount > weaknessesCount && opportunitiesCount > threatsCount) {
            if (internalBalance >= 2 && externalBalance >= 2) {
                overallAssessment = 'Position stratégique exceptionnelle avec des forces internes solides et un environnement externe porteur. Idéal pour une stratégie d\'expansion agressive.';
            } else if (internalBalance >= 1 && externalBalance >= 1) {
                overallAssessment = 'Position stratégique forte avec de nombreux atouts internes et des opportunités externes à saisir. Stratégie recommandée: croissance et développement.';
            } else {
                overallAssessment = 'Position stratégique positive avec des forces et opportunités équilibrées. Poursuivre les initiatives en cours.';
            }
        } else if (strengthsCount > weaknessesCount && opportunitiesCount <= threatsCount) {
            if (internalBalance >= 2 && externalBalance <= -2) {
                overallAssessment = 'Position interne très solide, mais environnement externe défavorable. Stratégie recommandée: se concentrer sur la consolidation des forces internes.';
            } else {
                overallAssessment = 'Position interne solide mais environnement externe difficile. Adopter une stratégie défensive tout en maintenant les avantages concurrentiels.';
            }
        } else if (strengthsCount <= weaknessesCount && opportunitiesCount > threatsCount) {
            if (internalBalance <= -2 && externalBalance >= 2) {
                overallAssessment = 'Faiblesses internes significatives, mais environnement externe très favorable. Stratégie recommandée: corriger les faiblesses pour profiter des opportunités.';
            } else {
                overallAssessment = 'Faiblesses internes à corriger pour pouvoir pleinement profiter des opportunités externes.';
            }
        } else {
            if (internalBalance <= -2 && externalBalance <= -2) {
                overallAssessment = 'Position stratégique difficile avec des faiblesses internes et un environnement externe défavorable. Urgence: réévaluer la stratégie globale.';
            } else if (internalBalance <= -1 && externalBalance <= -1) {
                overallAssessment = 'Position défensive nécessaire face à un environnement difficile. Se concentrer sur la survie et la consolidation.';
            } else {
                overallAssessment = 'Position fragile nécessitant une attention particulière à la fois sur les forces internes et les menaces externes.';
            }
        }

        return {
            assessment: overallAssessment,
            scores: {
                strengths: strengthsCount,
                weaknesses: weaknessesCount,
                opportunities: opportunitiesCount,
                threats: threatsCount
            },
            balance: {
                internal: internalBalance,
                external: externalBalance
            }
        };
    }

    formatRecommendations(results) {
        const recommendations = [];
        const { strategicInsights, summary, strengths, weaknesses, opportunities, threats } = results;

        // Ajouter des recommandations stratégiques basées sur les insights
        if (strategicInsights && strategicInsights.SO && strategicInsights.SO.length > 0) {
            strategicInsights.SO.forEach(insight => {
                recommendations.push({
                    type: 'strategic',
                    priority: 'high',
                    action: `🚀 ${insight}`,
                    category: 'SO - Stratégie offensive'
                });
            });
        }

        if (strategicInsights && strategicInsights.ST && strategicInsights.ST.length > 0) {
            strategicInsights.ST.forEach(insight => {
                recommendations.push({
                    type: 'defensive',
                    priority: 'high',
                    action: `🛡️ ${insight}`,
                    category: 'ST - Stratégie défensive'
                });
            });
        }

        if (strategicInsights && strategicInsights.WO && strategicInsights.WO.length > 0) {
            strategicInsights.WO.forEach(insight => {
                recommendations.push({
                    type: 'improvement',
                    priority: 'medium',
                    action: `✨ ${insight}`,
                    category: 'WO - Stratégie d\'amélioration'
                });
            });
        }

        if (strategicInsights && strategicInsights.WT && strategicInsights.WT.length > 0) {
            strategicInsights.WT.forEach(insight => {
                recommendations.push({
                    type: 'survival',
                    priority: 'high',
                    action: `⚠️ ${insight}`,
                    category: 'WT - Stratégie de survie'
                });
            });
        }

        // Ajouter une recommandation basée sur le résumé avec des conseils spécifiques
        if (summary && summary.balance) {
            const { internal, external } = summary.balance;
            
            if (internal < 0 && external < 0) {
                recommendations.unshift({
                    type: 'critical',
                    priority: 'critical',
                    action: '🔴 URGENT: Réévaluer la stratégie globale de l\'entreprise. Les faiblesses internes combinées aux menaces externes créent une situation critique nécessitant une action immédiate.',
                    category: 'emergency'
                });
            } else if (internal < 0 && external > 0) {
                recommendations.unshift({
                    type: 'warning',
                    priority: 'high',
                    action: '⚠️ Priorité: Corriger les faiblesses internes pour être en mesure de profiter des opportunités externes. Concentrez-vous sur l\'amélioration des aspects internes avant de chercher à croître.',
                    category: 'priority'
                });
            } else if (internal > 0 && external < 0) {
                recommendations.unshift({
                    type: 'warning',
                    priority: 'high',
                    action: '⚠️ Attention: Malgrés des forces internes solides, l\'environnement externe est défavorable. Adoptez une stratégie défensive pour protéger vos atouts.',
                    category: 'priority'
                });
            } else if (internal > 2 && external > 2) {
                recommendations.unshift({
                    type: 'success',
                    priority: 'high',
                    action: '🎯 EXCELLENT: Position stratégique exceptionnelle. Poursuivez les initiatives d\'expansion et d\'innovation pour maximiser cette position avantageuse.',
                    category: 'opportunity'
                });
            }
        }

        // Ajouter des recommandations spécifiques basées sur les comptes
        if (strengths && strengths.length > 0 && weaknesses && weaknesses.length > 0) {
            if (strengths.length > weaknesses.length * 2) {
                recommendations.push({
                    type: 'strategic',
                    priority: 'high',
                    action: 'Capitaliser sur vos nombreuses forces pour compenser les quelques faiblesses identifiées.',
                    category: 'balance'
                });
            } else if (weaknesses.length > strengths.length * 2) {
                recommendations.push({
                    type: 'critical',
                    priority: 'high',
                    action: 'Urgent: Renforcer significativement vos points faibles qui surpassent en nombre vos forces.',
                    category: 'balance'
                });
            }
        }

        // Recommandations basées sur les opportunités et menaces
        if (opportunities && threats) {
            if (opportunities.length > threats.length * 2) {
                recommendations.push({
                    type: 'strategic',
                    priority: 'high',
                    action: 'Exploiter le nombre important d\'opportunités disponibles pour compenser les menaces.',
                    category: 'market'
                });
            } else if (threats.length > opportunities.length * 2) {
                recommendations.push({
                    type: 'defensive',
                    priority: 'high',
                    action: 'Développer des stratégies pour atténuer les nombreuses menaces qui dépassent les opportunités.',
                    category: 'risk'
                });
            }
        }

        return recommendations;
    }

    calculateAnalysisScore(results) {
        const { summary } = results;
        // Score basé sur l'équilibre des forces/faiblesses et opportunités/menaces
        const internalScore = Math.min(100, (summary.scores.strengths - summary.scores.weaknesses + 10) * 20);
        const externalScore = Math.min(100, (summary.scores.opportunities - summary.scores.threats + 10) * 20);
        return Math.round((internalScore * 0.6 + externalScore * 0.4));
    }

    calculateConfidence(results) {
        // Confiance basée sur le nombre d'éléments analysés
        const totalElements = Object.values(results.swotMatrix)
            .flatMap(Object.values)
            .reduce((sum, arr) => sum + arr.length, 0);
        return Math.min(100, totalElements * 5);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    }
}

// =============================================================================
// ANALYSE PORTER 5 FORCES
// =============================================================================

class PorterFiveForcesAnalysis extends Analysis {
    constructor(name, description, companyData) {
        super('porter', name, description, companyData);
        this.category = 'competitive';
        this.cost = { free: 120, pro: 20, enterprise: 5 };
        this.forces = [
            'supplierPower',
            'buyerPower',
            'newEntrants',
            'substitutes',
            'rivalry'
        ];
    }

    async runAnalysis() {
        const company = this.companyData;
        
        const analysis = {
            supplierPower: this.analyzeSupplierPower(company),
            buyerPower: this.analyzeBuyerPower(company),
            newEntrants: this.analyzeNewEntrants(company),
            substitutes: this.analyzeSubstitutes(company),
            rivalry: this.analyzeRivalry(company)
        };

        const industryAttractiveness = this.calculateIndustryAttractiveness(analysis);
        const strategicImplications = this.generateStrategicImplications(analysis);

        this.results = {
            ...analysis,
            industryAttractiveness,
            strategicImplications,
            summary: this.generateSummary(analysis, industryAttractiveness)
        };

        return this.results;
    }

    analyzeSupplierPower(company) {
        const factors = {
            concentration: company?.supplierConcentration || 0,
            switchingCosts: company?.supplierSwitchingCosts || 'low',
            uniqueness: company?.supplierUniqueness || 'low',
            threatOfForwardIntegration: company?.supplierForwardIntegration || 'low',
            importanceToQuality: company?.supplierImportance || 'high'
        };

        let score = 0;
        const assessmentPoints = [];

        // Concentration des fournisseurs
        if (factors.concentration > 0.7) {
            score += 30;
            assessmentPoints.push(`fournisseurs très concentrés (${(factors.concentration * 100).toFixed(0)}% du marché)`);
        } else if (factors.concentration > 0.4) {
            score += 20;
            assessmentPoints.push(`fournisseurs concentrés (${(factors.concentration * 100).toFixed(0)}%)`);
        } else if (factors.concentration < 0.2) {
            score += 5;
            assessmentPoints.push(`base de fournisseurs large et diversifiée`);
        } else {
            score += 10;
        }

        // Coûts de changement
        if (factors.switchingCosts === 'very_high') {
            score += 30;
            assessmentPoints.push(`coûts de changement de fournisseur très élevés`);
        } else if (factors.switchingCosts === 'high') {
            score += 25;
            assessmentPoints.push(`coûts de changement de fournisseur élevés`);
        } else if (factors.switchingCosts === 'medium') {
            score += 15;
        } else {
            score += 5;
        }

        // Unicité des inputs
        if (factors.uniqueness === 'very_high') {
            score += 30;
            assessmentPoints.push(`inputs uniques et hautement spécialisés`);
        } else if (factors.uniqueness === 'high') {
            score += 25;
            assessmentPoints.push(`inputs spécialisés et uniques`);
        } else if (factors.uniqueness === 'medium') {
            score += 15;
        } else {
            score += 5;
        }

        // Menace d'intégration verticale
        if (factors.threatOfForwardIntegration === 'very_high') {
            score += 20;
            assessmentPoints.push(`menace très élevée d'intégration verticale par les fournisseurs`);
        } else if (factors.threatOfForwardIntegration === 'high') {
            score += 15;
            assessmentPoints.push(`menace d'intégration verticale par les fournisseurs`);
        } else if (factors.threatOfForwardIntegration === 'medium') {
            score += 10;
        } else {
            score += 5;
        }

        // Importance pour la qualité
        if (factors.importanceToQuality === 'critical') {
            score += 10;
            assessmentPoints.push(`importance critique des inputs pour la qualité finale`);
        } else if (factors.importanceToQuality === 'high') {
            score += 5;
        }

        score = Math.min(100, score);

        let level = '';
        if (score >= 80) level = 'Très élevé';
        else if (score >= 60) level = 'Élevé';
        else if (score >= 40) level = 'Moyen';
        else if (score >= 20) level = 'Faible';
        else level = 'Très faible';

        // Générer un assessment détaillé
        let assessment = '';
        if (assessmentPoints.length > 0) {
            assessment = `Le pouvoir des fournisseurs est ${level.toLowerCase()} en raison de : ${assessmentPoints.join(', ')}.`;
            
            // Ajouter une recommandation spécifique
            if (score >= 70) {
                assessment += ' Il est recommandé de diversifier la base de fournisseurs et de négocier des contrats à long terme pour réduire cette dépendance.';
            } else if (score < 30) {
                assessment += ' Cette situation favorable permet de négocier des conditions avantageuses avec les fournisseurs.';
            }
        } else {
            assessment = 'Pouvoir des fournisseurs standard';
        }

        return {
            score,
            level,
            assessment,
            factors
        };
    }

    analyzeBuyerPower(company) {
        const factors = {
            concentration: company?.buyerConcentration || 0,
            volume: company?.buyerVolume || 'low',
            switchingCosts: company?.buyerSwitchingCosts || 'low',
            informationAvailability: company?.buyerInformation || 'high',
            priceSensitivity: company?.buyerPriceSensitivity || 'high'
        };

        let score = 0;
        const assessmentPoints = [];

        // Concentration des acheteurs
        if (factors.concentration > 0.7) {
            score += 30;
            assessmentPoints.push(`clientèle très concentrée (${(factors.concentration * 100).toFixed(0)}% des achats)`);
        } else if (factors.concentration > 0.4) {
            score += 20;
            assessmentPoints.push(`clientèle concentrée (${(factors.concentration * 100).toFixed(0)}%)`);
        } else if (factors.concentration < 0.2) {
            score += 5;
            assessmentPoints.push(`base de clients large et dispersée`);
        } else {
            score += 10;
        }

        // Volume d'achat
        if (factors.volume === 'very_large') {
            score += 30;
            assessmentPoints.push(`volumes d'achat très importants`);
        } else if (factors.volume === 'large') {
            score += 25;
            assessmentPoints.push(`volumes d'achat importants`);
        } else if (factors.volume === 'medium') {
            score += 15;
        } else {
            score += 5;
        }

        // Coûts de changement
        if (factors.switchingCosts === 'very_low') {
            score += 30;
            assessmentPoints.push(`coûts de changement de fournisseur très faibles`);
        } else if (factors.switchingCosts === 'low') {
            score += 25;
            assessmentPoints.push(`coûts de changement de fournisseur faibles`);
        } else if (factors.switchingCosts === 'medium') {
            score += 15;
        } else {
            score += 5;
        }

        // Disponibilité de l'information
        if (factors.informationAvailability === 'very_high') {
            score += 15;
            assessmentPoints.push(`accès facile et complet à l'information sur les produits`);
        } else if (factors.informationAvailability === 'high') {
            score += 10;
            assessmentPoints.push(`information facilement disponible`);
        } else {
            score += 5;
        }

        // Sensibilité au prix
        if (factors.priceSensitivity === 'very_high') {
            score += 10;
            assessmentPoints.push(`sensibilité au prix très élevée`);
        } else if (factors.priceSensitivity === 'high') {
            score += 5;
            assessmentPoints.push(`sensibilité au prix élevée`);
        }

        score = Math.min(100, score);

        let level = '';
        if (score >= 80) level = 'Très élevé';
        else if (score >= 60) level = 'Élevé';
        else if (score >= 40) level = 'Moyen';
        else if (score >= 20) level = 'Faible';
        else level = 'Très faible';

        // Générer un assessment détaillé
        let assessment = '';
        if (assessmentPoints.length > 0) {
            assessment = `Le pouvoir des acheteurs est ${level.toLowerCase()} en raison de : ${assessmentPoints.join(', ')}.`;
            
            // Ajouter une recommandation spécifique
            if (score >= 70) {
                assessment += ' Il est conseillé d\'améliorer la différenciation des produits et de développer des relations à long terme avec les clients clés.';
            } else if (score < 30) {
                assessment += ' Cette position favorable permet de maintenir une bonne marge tout en satisfaisant les clients.';
            }
        } else {
            assessment = 'Pouvoir des acheteurs standard';
        }

        return {
            score,
            level,
            assessment,
            factors
        };
    }

    analyzeNewEntrants(company) {
        const factors = {
            economiesOfScale: company?.economiesOfScale || 'high',
            capitalRequirements: company?.capitalRequirements || 'high',
            brandLoyalty: company?.brandLoyalty || 'medium',
            switchingCosts: company?.entrySwitchingCosts || 'medium',
            accessToDistribution: company?.accessToDistribution || 'medium',
            regulatoryBarriers: company?.regulatoryBarriers || 'medium',
            proprietaryTechnology: company?.proprietaryTechnology || 'low'
        };

        let score = 0;
        let assessment = '';

        // Économies d'échelle
        if (factors.economiesOfScale === 'high') {
            score += 20;
            assessment += 'Économies d\'échelle importantes. ';
        } else if (factors.economiesOfScale === 'medium') {
            score += 15;
        } else {
            score += 5;
        }

        // Besoins en capital
        if (factors.capitalRequirements === 'very_high') {
            score += 20;
            assessment += 'Besoins en capital très élevés. ';
        } else if (factors.capitalRequirements === 'high') {
            score += 15;
        } else {
            score += 5;
        }

        // Fidélité à la marque
        if (factors.brandLoyalty === 'very_high') {
            score += 15;
            assessment += 'Fidélité à la marque très forte. ';
        } else if (factors.brandLoyalty === 'high') {
            score += 10;
        } else if (factors.brandLoyalty === 'low') {
            score += 5;
        }

        // Coûts de changement
        if (factors.switchingCosts === 'high') {
            score += 15;
            assessment += 'Coûts de changement élevés. ';
        } else if (factors.switchingCosts === 'medium') {
            score += 10;
        } else {
            score += 5;
        }

        // Accès à la distribution
        if (factors.accessToDistribution === 'difficult') {
            score += 15;
            assessment += 'Accès à la distribution difficile. ';
        } else if (factors.accessToDistribution === 'medium') {
            score += 10;
        } else {
            score += 5;
        }

        // Barrières réglementaires
        if (factors.regulatoryBarriers === 'very_high') {
            score += 10;
            assessment += 'Barrières réglementaires très élevées. ';
        } else if (factors.regulatoryBarriers === 'high') {
            score += 5;
        }

        // Technologie propriété
        if (factors.proprietaryTechnology === 'high') {
            score += 5;
            assessment += 'Technologie propriétaire importante. ';
        }

        score = Math.min(100, score);

        // Plus le score est élevé, plus la menace est faible
        const threatLevel = 100 - score;
        let level = '';
        if (threatLevel >= 80) level = 'Très élevée';
        else if (threatLevel >= 60) level = 'Élevée';
        else if (threatLevel >= 40) level = 'Moyenne';
        else if (threatLevel >= 20) level = 'Faible';
        else level = 'Très faible';

        return {
            score: threatLevel,
            level: `Menace des nouveaux entrants: ${level}`,
            assessment: assessment || 'Menace standard des nouveaux entrants',
            factors,
            barrierScore: score
        };
    }

    analyzeSubstitutes(company) {
        const factors = {
            availability: company?.substituteAvailability || 'medium',
            pricePerformance: company?.substitutePricePerformance || 'better',
            switchingCosts: company?.substituteSwitchingCosts || 'low',
            buyerPropensity: company?.buyerPropensityToSubstitute || 'medium'
        };

        let score = 0;
        let assessment = '';

        // Disponibilité des substituts
        if (factors.availability === 'very_high') {
            score += 30;
            assessment += 'Substituts très disponibles. ';
        } else if (factors.availability === 'high') {
            score += 20;
        } else if (factors.availability === 'low') {
            score += 5;
        }

        // Rapport prix/performance
        if (factors.pricePerformance === 'much_better') {
            score += 25;
            assessment += 'Substituts avec un rapport prix/performance beaucoup meilleur. ';
        } else if (factors.pricePerformance === 'better') {
            score += 20;
        } else if (factors.pricePerformance === 'worse') {
            score += 5;
        }

        // Coûts de changement
        if (factors.switchingCosts === 'very_low') {
            score += 25;
            assessment += 'Coûts de changement vers les substituts très faibles. ';
        } else if (factors.switchingCosts === 'low') {
            score += 20;
        } else if (factors.switchingCosts === 'high') {
            score += 5;
        }

        // Propension des acheteurs
        if (factors.buyerPropensity === 'very_high') {
            score += 20;
            assessment += 'Propension des acheteurs à substituer très élevée. ';
        } else if (factors.buyerPropensity === 'high') {
            score += 15;
        } else if (factors.buyerPropensity === 'low') {
            score += 5;
        }

        score = Math.min(100, score);

        let level = '';
        if (score >= 80) level = 'Très élevée';
        else if (score >= 60) level = 'Élevée';
        else if (score >= 40) level = 'Moyenne';
        else if (score >= 20) level = 'Faible';
        else level = 'Très faible';

        return {
            score,
            level,
            assessment: assessment || 'Menace des substituts standard',
            factors
        };
    }

    analyzeRivalry(company) {
        const factors = {
            competitorCount: company?.competitorCount || 5,
            industryGrowth: company?.industryGrowth || 'medium',
            fixedCosts: company?.fixedCosts || 'high',
            storageCosts: company?.storageCosts || 'medium',
            productDifferentiation: company?.productDifferentiation || 'medium',
            exitBarriers: company?.exitBarriers || 'medium',
            strategicStakes: company?.strategicStakes || 'high'
        };

        let score = 0;
        let assessment = '';

        // Nombre de concurrents
        if (factors.competitorCount > 20) {
            score += 30;
            assessment += 'Nombre très élevé de concurrents. ';
        } else if (factors.competitorCount > 10) {
            score += 20;
            assessment += 'Nombre élevé de concurrents. ';
        } else if (factors.competitorCount < 3) {
            score += 5;
        }

        // Croissance de l'industrie
        if (factors.industryGrowth === 'slow') {
            score += 25;
            assessment += 'Croissance de l\'industrie lente. ';
        } else if (factors.industryGrowth === 'medium') {
            score += 15;
        } else if (factors.industryGrowth === 'fast') {
            score += 5;
        }

        // Coûts fixes
        if (factors.fixedCosts === 'very_high') {
            score += 20;
            assessment += 'Coûts fixes très élevés. ';
        } else if (factors.fixedCosts === 'high') {
            score += 15;
        } else {
            score += 5;
        }

        // Coûts de stockage
        if (factors.storageCosts === 'very_high') {
            score += 15;
            assessment += 'Coûts de stockage très élevés. ';
        } else if (factors.storageCosts === 'high') {
            score += 10;
        } else {
            score += 5;
        }

        // Différenciation des produits
        if (factors.productDifferentiation === 'low') {
            score += 15;
            assessment += 'Différenciation des produits faible. ';
        } else if (factors.productDifferentiation === 'medium') {
            score += 10;
        } else if (factors.productDifferentiation === 'high') {
            score += 5;
        }

        // Barrières à la sortie
        if (factors.exitBarriers === 'very_high') {
            score += 10;
            assessment += 'Barrières à la sortie très élevées. ';
        } else if (factors.exitBarriers === 'high') {
            score += 5;
        }

        // Enjeux stratégiques
        if (factors.strategicStakes === 'very_high') {
            score += 5;
            assessment += 'Enjeux stratégiques très importants. ';
        }

        score = Math.min(100, score);

        let level = '';
        if (score >= 80) level = 'Très intense';
        else if (score >= 60) level = 'Intense';
        else if (score >= 40) level = 'Modérée';
        else if (score >= 20) level = 'Faible';
        else level = 'Très faible';

        return {
            score,
            level,
            assessment: assessment || 'Intensité concurrentielle standard',
            factors
        };
    }

    calculateIndustryAttractiveness(analysis) {
        const weights = {
            supplierPower: 0.15,
            buyerPower: 0.15,
            newEntrants: 0.20,
            substitutes: 0.20,
            rivalry: 0.30
        };

        // Normaliser les scores (pour newEntrants, plus le score est bas, plus c'est bon)
        const normalizedScores = {
            supplierPower: 100 - analysis.supplierPower.score,
            buyerPower: 100 - analysis.buyerPower.score,
            newEntrants: analysis.newEntrants.barrierScore, // Déjà inversé
            substitutes: 100 - analysis.substitutes.score,
            rivalry: 100 - analysis.rivalry.score
        };

        let totalScore = 0;
        for (const force of this.forces) {
            totalScore += normalizedScores[force] * weights[force];
        }

        totalScore = Math.round(totalScore);

        let attractiveness = '';
        if (totalScore >= 80) attractiveness = 'Très attractive';
        else if (totalScore >= 65) attractiveness = 'Attractive';
        else if (totalScore >= 50) attractiveness = 'Moyennement attractive';
        else if (totalScore >= 35) attractiveness = 'Peu attractive';
        else attractiveness = 'Non attractive';

        return {
            score: totalScore,
            level: attractiveness,
            breakdown: normalizedScores
        };
    }

    generateStrategicImplications(analysis) {
        const implications = [];

        // Implication pour le pouvoir des fournisseurs
        if (analysis.supplierPower.score > 70) {
            implications.push({
                type: 'suppliers',
                action: 'Développer des relations étroites avec les fournisseurs stratégiques',
                priority: 'high'
            });
            implications.push({
                type: 'suppliers',
                action: 'Diversifier la base de fournisseurs pour réduire la dépendance',
                priority: 'high'
            });
        } else if (analysis.supplierPower.score < 30) {
            implications.push({
                type: 'suppliers',
                action: 'Profiter de la faible dépendance aux fournisseurs pour négocier de meilleurs termes',
                priority: 'medium'
            });
        }

        // Implication pour le pouvoir des acheteurs
        if (analysis.buyerPower.score > 70) {
            implications.push({
                type: 'buyers',
                action: 'Améliorer la différenciation des produits pour réduire la sensibilité au prix',
                priority: 'high'
            });
            implications.push({
                type: 'buyers',
                action: 'Développer des relations à long terme avec les clients clés',
                priority: 'high'
            });
        } else if (analysis.buyerPower.score < 30) {
            implications.push({
                type: 'buyers',
                action: 'Maintenir une bonne relation avec les clients tout en optimisant les prix',
                priority: 'medium'
            });
        }

        // Implication pour les nouveaux entrants
        if (analysis.newEntrants.score > 70) {
            implications.push({
                type: 'new_entrants',
                action: 'Renforcer les barrières à l\'entrée par l\'innovation et les économies d\'échelle',
                priority: 'high'
            });
            implications.push({
                type: 'new_entrants',
                action: 'Surveiller de près les nouveaux concurrents potentiels',
                priority: 'high'
            });
        } else if (analysis.newEntrants.score < 30) {
            implications.push({
                type: 'new_entrants',
                action: 'Profiter des barrières élevées à l\'entrée pour maintenir une position dominante',
                priority: 'medium'
            });
        }

        // Implication pour les substituts
        if (analysis.substitutes.score > 70) {
            implications.push({
                type: 'substitutes',
                action: 'Investir dans l\'innovation pour se différencier des substituts',
                priority: 'high'
            });
            implications.push({
                type: 'substitutes',
                action: 'Éduquer les clients sur les avantages uniques de vos produits',
                priority: 'high'
            });
        } else if (analysis.substitutes.score < 30) {
            implications.push({
                type: 'substitutes',
                action: 'Maintenir la surveillance des substituts potentiels',
                priority: 'low'
            });
        }

        // Implication pour la rivalité
        if (analysis.rivalry.score > 70) {
            implications.push({
                type: 'rivalry',
                action: 'Éviter les guerres de prix et se concentrer sur la différenciation',
                priority: 'critical'
            });
            implications.push({
                type: 'rivalry',
                action: 'Développer des avantages concurrentiels durables',
                priority: 'critical'
            });
        } else if (analysis.rivalry.score < 30) {
            implications.push({
                type: 'rivalry',
                action: 'Profiter de la faible rivalité pour renforcer la position sur le marché',
                priority: 'medium'
            });
        }

        return implications;
    }

    generateSummary(analysis, attractiveness) {
        const forceLevels = {};
        for (const force of this.forces) {
            forceLevels[force] = analysis[force].level;
        }

        return {
            forceLevels,
            attractiveness: attractiveness.level,
            attractivenessScore: attractiveness.score,
            recommendation: this.generateAttractivenessRecommendation(attractiveness.score)
        };
    }

    generateAttractivenessRecommendation(score) {
        if (score >= 80) {
            return 'L\'industrie est très attractive. Stratégie recommandée: Investissement agressif et expansion';
        } else if (score >= 65) {
            return 'L\'industrie est attractive. Stratégie recommandée: Développement et croissance';
        } else if (score >= 50) {
            return 'L\'industrie est moyennement attractive. Stratégie recommandée: Sélectivité et optimisation';
        } else if (score >= 35) {
            return 'L\'industrie est peu attractive. Stratégie recommandée: Approche défensive et optimisation des coûts';
        } else {
            return 'L\'industrie n\'est pas attractive. Stratégie recommandée: Réorientation ou sortie';
        }
    }

    formatRecommendations(results) {
        const recommendations = [];
        const { strategicImplications, summary } = results;

        // Ajouter les implications stratégiques
        strategicImplications.forEach(implication => {
            recommendations.push({
                type: 'strategic',
                priority: implication.priority,
                action: implication.action,
                category: implication.type,
                context: implication.type
            });
        });

        // Ajouter une recommandation basée sur l'attractivité
        recommendations.unshift({
            type: 'industry',
            priority: 'high',
            action: summary.recommendation,
            category: 'attractiveness'
        });

        return recommendations;
    }

    calculateAnalysisScore(results) {
        return Math.round(results.industryAttractiveness.score);
    }

    calculateConfidence(results) {
        // Confiance basée sur la complétude des données
        let confidence = 70; // Base
        for (const force of this.forces) {
            if (results[force].assessment && results[force].assessment.length > 50) {
                confidence += 5;
            }
        }
        return Math.min(100, confidence);
    }
}

// =============================================================================
// ANALYSE PESTEL
// =============================================================================

class PESTELAnalysis extends Analysis {
    constructor(name, description, companyData) {
        super('pestel', name, description, companyData);
        this.category = 'environmental';
        this.cost = { free: 75, pro: 15, enterprise: 4 };
        this.factors = [
            'political',
            'economic',
            'social',
            'technological',
            'environmental',
            'legal'
        ];
    }

    async runAnalysis() {
        const company = this.companyData;
        
        const analysis = {
            political: this.analyzePolitical(company),
            economic: this.analyzeEconomic(company),
            social: this.analyzeSocial(company),
            technological: this.analyzeTechnological(company),
            environmental: this.analyzeEnvironmental(company),
            legal: this.analyzeLegal(company)
        };

        const impactAssessment = this.calculateImpactAssessment(analysis);
        const trendAnalysis = this.generateTrendAnalysis(analysis);

        this.results = {
            ...analysis,
            impactAssessment,
            trendAnalysis,
            summary: this.generateSummary(analysis, impactAssessment)
        };

        return this.results;
    }

    analyzePolitical(company) {
        const factors = {
            governmentStability: company?.governmentStability || 'stable',
            taxationPolicy: company?.taxationPolicy || 'moderate',
            tradeRegulations: company?.tradeRegulations || 'favorable',
            foreignInvestmentPolicy: company?.foreignInvestmentPolicy || 'open',
            subsidies: company?.subsidies || 'none',
            politicalRisks: company?.politicalRisks || 'low'
        };

        let score = 0;
        let assessment = '';
        let impact = 'neutral';

        // Stabilité du gouvernement
        if (factors.governmentStability === 'very_stable') {
            score += 25;
            assessment += 'Gouvernement très stable. ';
        } else if (factors.governmentStability === 'stable') {
            score += 20;
            assessment += 'Gouvernement stable. ';
        } else if (factors.governmentStability === 'unstable') {
            score += 5;
            assessment += 'Gouvernement instable. ';
            impact = 'negative';
        }

        // Politique fiscale
        if (factors.taxationPolicy === 'favorable') {
            score += 20;
            assessment += 'Politique fiscale favorable. ';
        } else if (factors.taxationPolicy === 'moderate') {
            score += 15;
        } else if (factors.taxationPolicy === 'unfavorable') {
            score += 5;
            impact = 'negative';
        }

        // Réglementations commerciales
        if (factors.tradeRegulations === 'very_favorable') {
            score += 20;
            assessment += 'Réglementations commerciales très favorables. ';
        } else if (factors.tradeRegulations === 'favorable') {
            score += 15;
        } else if (factors.tradeRegulations === 'restrictive') {
            score += 5;
            impact = 'negative';
        }

        // Politique d'investissement étranger
        if (factors.foreignInvestmentPolicy === 'very_open') {
            score += 15;
            assessment += 'Politique d\'investissement étranger très ouverte. ';
        } else if (factors.foreignInvestmentPolicy === 'open') {
            score += 10;
        } else if (factors.foreignInvestmentPolicy === 'restricted') {
            score += 5;
            impact = 'negative';
        }

        // Subventions
        if (factors.subsidies === 'significant') {
            score += 10;
            assessment += 'Subventions importantes disponibles. ';
        } else if (factors.subsidies === 'some') {
            score += 5;
        }

        // Risques politiques
        if (factors.politicalRisks === 'very_high') {
            score -= 10;
            assessment += 'Risques politiques très élevés. ';
            impact = 'negative';
        } else if (factors.politicalRisks === 'high') {
            score -= 5;
            impact = 'negative';
        }

        score = Math.max(0, Math.min(100, score));

        let level = '';
        if (score >= 80) level = 'Très favorable';
        else if (score >= 60) level = 'Favorable';
        else if (score >= 40) level = 'Neutre';
        else if (score >= 20) level = 'Défavorable';
        else level = 'Très défavorable';

        return {
            score,
            level,
            impact,
            assessment: assessment || 'Environnement politique standard',
            factors
        };
    }

    analyzeEconomic(company) {
        const factors = {
            gdpGrowth: company?.gdpGrowth || 2.5,
            inflationRate: company?.inflationRate || 2.0,
            interestRates: company?.interestRates || 'moderate',
            unemploymentRate: company?.unemploymentRate || 5.0,
            exchangeRates: company?.exchangeRates || 'stable',
            disposableIncome: company?.disposableIncome || 'increasing',
            consumerSpending: company?.consumerSpending || 'growing'
        };

        let score = 0;
        let assessment = '';
        let impact = 'neutral';

        // Croissance du PIB
        if (factors.gdpGrowth > 4) {
            score += 25;
            assessment += `Croissance du PIB élevée (${factors.gdpGrowth}%). `;
        } else if (factors.gdpGrowth > 2) {
            score += 20;
            assessment += `Croissance du PIB modérée (${factors.gdpGrowth}%). `;
        } else if (factors.gdpGrowth < 0) {
            score += 5;
            assessment += `Récession économique (${factors.gdpGrowth}%). `;
            impact = 'negative';
        }

        // Taux d'inflation
        if (factors.inflationRate < 2) {
            score += 20;
            assessment += `Taux d'inflation faible (${factors.inflationRate}%). `;
        } else if (factors.inflationRate < 5) {
            score += 15;
        } else {
            score += 5;
            impact = 'negative';
        }

        // Taux d'intérêt
        if (factors.interestRates === 'low') {
            score += 15;
            assessment += 'Taux d\'intérêt bas. ';
        } else if (factors.interestRates === 'moderate') {
            score += 10;
        } else if (factors.interestRates === 'high') {
            score += 5;
            impact = 'negative';
        }

        // Taux de chômage
        if (factors.unemploymentRate < 4) {
            score += 15;
            assessment += `Taux de chômage faible (${factors.unemploymentRate}%). `;
        } else if (factors.unemploymentRate < 7) {
            score += 10;
        } else {
            score += 5;
            impact = 'negative';
        }

        // Taux de change
        if (factors.exchangeRates === 'very_stable') {
            score += 10;
            assessment += 'Taux de change très stables. ';
        } else if (factors.exchangeRates === 'stable') {
            score += 5;
        } else {
            impact = 'negative';
        }

        // Revenu disponible
        if (factors.disposableIncome === 'rapidly_increasing') {
            score += 10;
            assessment += 'Revenu disponible en forte augmentation. ';
        } else if (factors.disposableIncome === 'increasing') {
            score += 5;
        } else if (factors.disposableIncome === 'decreasing') {
            impact = 'negative';
        }

        // Dépenses des consommateurs
        if (factors.consumerSpending === 'rapidly_growing') {
            score += 10;
            assessment += 'Dépenses des consommateurs en forte croissance. ';
        } else if (factors.consumerSpending === 'growing') {
            score += 5;
        } else if (factors.consumerSpending === 'declining') {
            impact = 'negative';
        }

        score = Math.max(0, Math.min(100, score));

        let level = '';
        if (score >= 80) level = 'Très favorable';
        else if (score >= 60) level = 'Favorable';
        else if (score >= 40) level = 'Neutre';
        else if (score >= 20) level = 'Défavorable';
        else level = 'Très défavorable';

        return {
            score,
            level,
            impact,
            assessment: assessment || 'Environnement économique standard',
            factors
        };
    }

    analyzeSocial(company) {
        const factors = {
            populationGrowth: company?.populationGrowth || 'stable',
            ageDistribution: company?.ageDistribution || 'balanced',
            educationLevel: company?.educationLevel || 'high',
            culturalTrends: company?.culturalTrends || 'favorable',
            lifestyleChanges: company?.lifestyleChanges || 'moderate',
            healthAwareness: company?.healthAwareness || 'increasing',
            workLifeBalance: company?.workLifeBalance || 'improving'
        };

        let score = 0;
        let assessment = '';
        let impact = 'neutral';

        // Croissance de la population
        if (factors.populationGrowth === 'rapid') {
            score += 20;
            assessment += 'Croissance rapide de la population. ';
        } else if (factors.populationGrowth === 'moderate') {
            score += 15;
        } else if (factors.populationGrowth === 'declining') {
            score += 5;
            impact = 'negative';
        }

        // Distribution par âge
        if (factors.ageDistribution === 'young') {
            score += 15;
            assessment += 'Population jeune. ';
        } else if (factors.ageDistribution === 'balanced') {
            score += 10;
        } else if (factors.ageDistribution === 'aging') {
            score += 5;
            impact = 'negative';
        }

        // Niveau d'éducation
        if (factors.educationLevel === 'very_high') {
            score += 20;
            assessment += 'Niveau d\'éducation très élevé. ';
        } else if (factors.educationLevel === 'high') {
            score += 15;
        } else if (factors.educationLevel === 'low') {
            score += 5;
            impact = 'negative';
        }

        // Tendances culturelles
        if (factors.culturalTrends === 'very_favorable') {
            score += 15;
            assessment += 'Tendances culturelles très favorables. ';
        } else if (factors.culturalTrends === 'favorable') {
            score += 10;
        } else if (factors.culturalTrends === 'unfavorable') {
            score += 5;
            impact = 'negative';
        }

        // Changements de mode de vie
        if (factors.lifestyleChanges === 'rapid') {
            score += 10;
            assessment += 'Changements rapides du mode de vie. ';
        } else if (factors.lifestyleChanges === 'moderate') {
            score += 5;
        }

        // Sensibilisation à la santé
        if (factors.healthAwareness === 'rapidly_increasing') {
            score += 10;
            assessment += 'Sensibilisation à la santé en forte augmentation. ';
        } else if (factors.healthAwareness === 'increasing') {
            score += 5;
        }

        // Équilibre vie professionnelle/vie privée
        if (factors.workLifeBalance === 'greatly_improving') {
            score += 5;
            assessment += 'Équilibre vie professionnelle/vie privée fortement amélioré. ';
        } else if (factors.workLifeBalance === 'improving') {
            score += 5;
        }

        score = Math.max(0, Math.min(100, score));

        let level = '';
        if (score >= 80) level = 'Très favorable';
        else if (score >= 60) level = 'Favorable';
        else if (score >= 40) level = 'Neutre';
        else if (score >= 20) level = 'Défavorable';
        else level = 'Très défavorable';

        return {
            score,
            level,
            impact,
            assessment: assessment || 'Environnement social standard',
            factors
        };
    }

    analyzeTechnological(company) {
        const factors = {
            rndInvestment: company?.rndInvestment || 'high',
            technologicalAdoption: company?.technologicalAdoption || 'fast',
            digitalTransformation: company?.digitalTransformation || 'advanced',
            automation: company?.automation || 'increasing',
            aiAdoption: company?.aiAdoption || 'growing',
            technologicalDisruption: company?.technologicalDisruption || 'moderate',
            ipProtection: company?.ipProtection || 'strong'
        };

        let score = 0;
        let assessment = '';
        let impact = 'neutral';

        // Investissement en R&D
        if (factors.rndInvestment === 'very_high') {
            score += 25;
            assessment += 'Investissement en R&D très élevé. ';
        } else if (factors.rndInvestment === 'high') {
            score += 20;
            assessment += 'Investissement en R&D élevé. ';
        } else if (factors.rndInvestment === 'low') {
            score += 5;
            impact = 'negative';
        }

        // Adoption technologique
        if (factors.technologicalAdoption === 'very_fast') {
            score += 20;
            assessment += 'Adoption technologique très rapide. ';
        } else if (factors.technologicalAdoption === 'fast') {
            score += 15;
        } else if (factors.technologicalAdoption === 'slow') {
            score += 5;
            impact = 'negative';
        }

        // Transformation numérique
        if (factors.digitalTransformation === 'very_advanced') {
            score += 15;
            assessment += 'Transformation numérique très avancée. ';
        } else if (factors.digitalTransformation === 'advanced') {
            score += 10;
        } else if (factors.digitalTransformation === 'limited') {
            score += 5;
            impact = 'negative';
        }

        // Automatisation
        if (factors.automation === 'extensive') {
            score += 15;
            assessment += 'Automatisation extensive. ';
        } else if (factors.automation === 'increasing') {
            score += 10;
        } else if (factors.automation === 'limited') {
            score += 5;
            impact = 'negative';
        }

        // Adoption de l'IA
        if (factors.aiAdoption === 'widespread') {
            score += 10;
            assessment += 'Adoption de l\'IA généralisée. ';
        } else if (factors.aiAdoption === 'growing') {
            score += 5;
        }

        // Disruption technologique
        if (factors.technologicalDisruption === 'high') {
            score += 5;
            assessment += 'Risque de disruption technologique élevé. ';
            impact = 'negative';
        } else if (factors.technologicalDisruption === 'very_high') {
            score -= 5;
            impact = 'negative';
        }

        // Protection de la propriété intellectuelle
        if (factors.ipProtection === 'very_strong') {
            score += 10;
            assessment += 'Protection de la propriété intellectuelle très forte. ';
        } else if (factors.ipProtection === 'strong') {
            score += 5;
        } else if (factors.ipProtection === 'weak') {
            impact = 'negative';
        }

        score = Math.max(0, Math.min(100, score));

        let level = '';
        if (score >= 80) level = 'Très favorable';
        else if (score >= 60) level = 'Favorable';
        else if (score >= 40) level = 'Neutre';
        else if (score >= 20) level = 'Défavorable';
        else level = 'Très défavorable';

        return {
            score,
            level,
            impact,
            assessment: assessment || 'Environnement technologique standard',
            factors
        };
    }

    analyzeEnvironmental(company) {
        const factors = {
            climateChangeImpact: company?.climateChangeImpact || 'moderate',
            sustainabilityTrends: company?.sustainabilityTrends || 'growing',
            carbonFootprint: company?.carbonFootprint || 'reducing',
            greenEnergyAdoption: company?.greenEnergyAdoption || 'increasing',
            wasteManagement: company?.wasteManagement || 'improving',
            waterScarcity: company?.waterScarcity || 'concerning',
            naturalResourceAvailability: company?.naturalResourceAvailability || 'stable'
        };

        let score = 0;
        let assessment = '';
        let impact = 'neutral';

        // Impact du changement climatique
        if (factors.climateChangeImpact === 'low') {
            score += 20;
            assessment += 'Impact du changement climatique faible. ';
        } else if (factors.climateChangeImpact === 'moderate') {
            score += 15;
        } else if (factors.climateChangeImpact === 'high') {
            score += 5;
            impact = 'negative';
        }

        // Tendances de durabilité
        if (factors.sustainabilityTrends === 'rapidly_growing') {
            score += 20;
            assessment += 'Tendances de durabilité en forte croissance. ';
        } else if (factors.sustainabilityTrends === 'growing') {
            score += 15;
        } else if (factors.sustainabilityTrends === 'declining') {
            score += 5;
            impact = 'negative';
        }

        // Empreinte carbone
        if (factors.carbonFootprint === 'rapidly_reducing') {
            score += 15;
            assessment += 'Réduction rapide de l\'empreinte carbone. ';
        } else if (factors.carbonFootprint === 'reducing') {
            score += 10;
        } else if (factors.carbonFootprint === 'increasing') {
            impact = 'negative';
        }

        // Adoption de l'énergie verte
        if (factors.greenEnergyAdoption === 'widespread') {
            score += 15;
            assessment += 'Adoption généralisée de l\'énergie verte. ';
        } else if (factors.greenEnergyAdoption === 'increasing') {
            score += 10;
        } else if (factors.greenEnergyAdoption === 'limited') {
            score += 5;
        }

        // Gestion des déchets
        if (factors.wasteManagement === 'excellent') {
            score += 10;
            assessment += 'Gestion des déchets excellente. ';
        } else if (factors.wasteManagement === 'improving') {
            score += 5;
        } else if (factors.wasteManagement === 'poor') {
            impact = 'negative';
        }

        // Pénurie d'eau
        if (factors.waterScarcity === 'not_a_concern') {
            score += 5;
        } else if (factors.waterScarcity === 'concerning') {
            score += 5;
            impact = 'negative';
        } else if (factors.waterScarcity === 'critical') {
            score -= 5;
            impact = 'negative';
        }

        // Disponibilité des ressources naturelles
        if (factors.naturalResourceAvailability === 'abundant') {
            score += 10;
            assessment += 'Ressources naturelles abondantes. ';
        } else if (factors.naturalResourceAvailability === 'stable') {
            score += 5;
        } else if (factors.naturalResourceAvailability === 'declining') {
            impact = 'negative';
        }

        score = Math.max(0, Math.min(100, score));

        let level = '';
        if (score >= 80) level = 'Très favorable';
        else if (score >= 60) level = 'Favorable';
        else if (score >= 40) level = 'Neutre';
        else if (score >= 20) level = 'Défavorable';
        else level = 'Très défavorable';

        return {
            score,
            level,
            impact,
            assessment: assessment || 'Environnement écologique standard',
            factors
        };
    }

    analyzeLegal(company) {
        const factors = {
            laborLaws: company?.laborLaws || 'balanced',
            consumerProtection: company?.consumerProtection || 'strong',
            environmentalRegulations: company?.environmentalRegulations || 'strict',
            dataProtection: company?.dataProtection || 'strong',
            industryRegulations: company?.industryRegulations || 'moderate',
            intellectualProperty: company?.intellectualProperty || 'protected',
            taxCompliance: company?.taxCompliance || 'complex',
            healthAndSafety: company?.healthAndSafety || 'strict'
        };

        let score = 0;
        let assessment = '';
        let impact = 'neutral';

        // Lois du travail
        if (factors.laborLaws === 'very_flexible') {
            score += 15;
            assessment += 'Lois du travail très flexibles. ';
        } else if (factors.laborLaws === 'flexible') {
            score += 10;
        } else if (factors.laborLaws === 'very_rigid') {
            score += 5;
            impact = 'negative';
        }

        // Protection des consommateurs
        if (factors.consumerProtection === 'very_strong') {
            score += 10;
            assessment += 'Protection des consommateurs très forte. ';
        } else if (factors.consumerProtection === 'strong') {
            score += 5;
        }

        // Réglementations environnementales
        if (factors.environmentalRegulations === 'clear') {
            score += 15;
            assessment += 'Réglementations environnementales claires. ';
        } else if (factors.environmentalRegulations === 'strict') {
            score += 10;
        } else if (factors.environmentalRegulations === 'unclear') {
            score += 5;
            impact = 'negative';
        }

        // Protection des données
        if (factors.dataProtection === 'very_strong') {
            score += 15;
            assessment += 'Protection des données très forte. ';
        } else if (factors.dataProtection === 'strong') {
            score += 10;
        } else if (factors.dataProtection === 'weak') {
            score += 5;
            impact = 'negative';
        }

        // Réglementations industrielles
        if (factors.industryRegulations === 'favorable') {
            score += 15;
            assessment += 'Réglementations industrielles favorables. ';
        } else if (factors.industryRegulations === 'moderate') {
            score += 10;
        } else if (factors.industryRegulations === 'restrictive') {
            score += 5;
            impact = 'negative';
        }

        // Propriété intellectuelle
        if (factors.intellectualProperty === 'very_protected') {
            score += 10;
            assessment += 'Propriété intellectuelle très protégée. ';
        } else if (factors.intellectualProperty === 'protected') {
            score += 5;
        } else if (factors.intellectualProperty === 'poorly_protected') {
            impact = 'negative';
        }

        // Conformité fiscale
        if (factors.taxCompliance === 'simple') {
            score += 10;
            assessment += 'Conformité fiscale simple. ';
        } else if (factors.taxCompliance === 'moderate') {
            score += 5;
        } else if (factors.taxCompliance === 'very_complex') {
            impact = 'negative';
        }

        // Santé et sécurité
        if (factors.healthAndSafety === 'clear') {
            score += 10;
            assessment += 'Réglementations santé et sécurité claires. ';
        } else if (factors.healthAndSafety === 'strict') {
            score += 5;
        } else if (factors.healthAndSafety === 'unclear') {
            impact = 'negative';
        }

        score = Math.max(0, Math.min(100, score));

        let level = '';
        if (score >= 80) level = 'Très favorable';
        else if (score >= 60) level = 'Favorable';
        else if (score >= 40) level = 'Neutre';
        else if (score >= 20) level = 'Défavorable';
        else level = 'Très défavorable';

        return {
            score,
            level,
            impact,
            assessment: assessment || 'Environnement légal standard',
            factors
        };
    }

    calculateImpactAssessment(analysis) {
        const positiveFactors = [];
        const negativeFactors = [];
        const neutralFactors = [];

        for (const factor of this.factors) {
            const result = analysis[factor];
            if (result.impact === 'positive') {
                positiveFactors.push({ factor, ...result });
            } else if (result.impact === 'negative') {
                negativeFactors.push({ factor, ...result });
            } else {
                neutralFactors.push({ factor, ...result });
            }
        }

        const totalPositive = positiveFactors.reduce((sum, f) => sum + f.score, 0);
        const totalNegative = negativeFactors.reduce((sum, f) => sum + (100 - f.score), 0);
        const totalNeutral = neutralFactors.reduce((sum, f) => sum + f.score, 0);

        return {
            positiveFactors,
            negativeFactors,
            neutralFactors,
            balance: totalPositive - totalNegative,
            overallImpact: this.determineOverallImpact(totalPositive, totalNegative)
        };
    }

    determineOverallImpact(positive, negative) {
        const ratio = positive / (positive + negative + 1);
        if (ratio > 0.7) return 'Très positif';
        if (ratio > 0.5) return 'Positif';
        if (ratio > 0.3) return 'Neutre';
        if (ratio > 0.1) return 'Négatif';
        return 'Très négatif';
    }

    generateTrendAnalysis(analysis) {
        const trends = [];

        for (const factor of this.factors) {
            const result = analysis[factor];
            trends.push({
                factor,
                currentLevel: result.level,
                trend: this.determineTrend(result.factors),
                assessment: result.assessment
            });
        }

        return trends;
    }

    determineTrend(factors) {
        // Analyser les facteurs pour déterminer une tendance
        const values = Object.values(factors);
        const positive = values.filter(v => v === 'high' || v === 'very_high' || v === 'favorable' || v === 'very_favorable' || v > 0).length;
        const negative = values.filter(v => v === 'low' || v === 'very_low' || v === 'unfavorable' || v === 'very_unfavorable' || v < 0).length;

        if (positive > negative) return 'Amélioration';
        if (positive < negative) return 'Dégradation';
        return 'Stable';
    }

    generateSummary(analysis, impactAssessment) {
        const factorLevels = {};
        for (const factor of this.factors) {
            factorLevels[factor] = analysis[factor].level;
        }

        return {
            factorLevels,
            overallImpact: impactAssessment.overallImpact,
            balance: impactAssessment.balance,
            recommendation: this.generatePESTELRecommendation(impactAssessment.balance)
        };
    }

    generatePESTELRecommendation(balance) {
        if (balance > 200) {
            return 'Environnement global très favorable. Stratégie recommandée: Expansion agressive et investissement';
        } else if (balance > 100) {
            return 'Environnement global favorable. Stratégie recommandée: Croissance et développement';
        } else if (balance > -50) {
            return 'Environnement global équilibré. Stratégie recommandée: Approche prudente et optimisation';
        } else if (balance > -150) {
            return 'Environnement global défavorable. Stratégie recommandée: Approche défensive et consolidation';
        } else {
            return 'Environnement global très défavorable. Stratégie recommandée: Réorientation stratégique ou réduction des activités';
        }
    }

    formatRecommendations(results) {
        const recommendations = [];
        const { strategicImplications, summary } = results;

        // Ajouter la recommandation principale
        recommendations.push({
            type: 'environmental',
            priority: 'high',
            action: summary.recommendation,
            category: 'overall'
        });

        // Ajouter des recommandations basées sur chaque facteur
        for (const factor of this.factors) {
            const result = results[factor];
            if (result.impact === 'negative') {
                recommendations.push({
                    type: 'environmental',
                    priority: 'high',
                    action: `Atténuer les impacts négatifs de l\'environnement ${factor} (${result.level})`,
                    category: factor
                });
            } else if (result.impact === 'positive') {
                recommendations.push({
                    type: 'environmental',
                    priority: 'medium',
                    action: `Exploiter les opportunités de l\'environnement ${factor} (${result.level})`,
                    category: factor
                });
            }
        }

        return recommendations;
    }

    calculateAnalysisScore(results) {
        const { impactAssessment } = results;
        // Score basé sur l'impact global
        let score = 50; // Point de départ neutre
        score += impactAssessment.balance / 3;
        
        // Ajuster en fonction de l'impact global
        if (impactAssessment.overallImpact === 'Très positif') score += 20;
        else if (impactAssessment.overallImpact === 'Positif') score += 10;
        else if (impactAssessment.overallImpact === 'Négatif') score -= 10;
        else if (impactAssessment.overallImpact === 'Très négatif') score -= 20;

        return Math.max(0, Math.min(100, Math.round(score)));
    }

    calculateConfidence(results) {
        // Confiance basée sur le nombre de facteurs analysés en détail
        let confidence = 60;
        for (const factor of this.factors) {
            if (results[factor].assessment && results[factor].assessment.length > 50) {
                confidence += 6;
            }
        }
        return Math.min(100, confidence);
    }
}

// =============================================================================
// ANALYSE CONCURRENTIELLE
// =============================================================================

class CompetitiveAnalysis extends Analysis {
    constructor(name, description, companyData) {
        super('competitive', name, description, companyData);
        this.category = 'competitive';
        this.cost = { free: 160, pro: 20, enterprise: 6 };
    }

    async runAnalysis() {
        const company = this.companyData;
        
        const analysis = {
            marketShare: this.analyzeMarketShare(company),
            competitivePosition: this.analyzeCompetitivePosition(company),
            competitorBenchmark: this.analyzeCompetitorBenchmark(company),
            costStructure: this.analyzeCostStructure(company),
            differentiation: this.analyzeDifferentiation(company),
            strategicGroups: this.analyzeStrategicGroups(company)
        };

        const competitiveAdvantage = this.calculateCompetitiveAdvantage(analysis);
        const strategicRecommendations = this.generateStrategicRecommendations(analysis);

        this.results = {
            ...analysis,
            competitiveAdvantage,
            strategicRecommendations,
            summary: this.generateSummary(analysis, competitiveAdvantage)
        };

        return this.results;
    }

    analyzeMarketShare(company) {
        if (!company || !company.competitors) {
            return {
                companyMarketShare: 0.25,
                competitors: [],
                marketConcentration: 'moderate',
                assessment: 'Part de marché non spécifiée. Utilisation d\'une estimation par défaut.'
            };
        }

        const totalMarket = company.competitors.reduce((sum, c) => sum + (c.marketShare || 0), 0) + (company.marketShare || 0.25);
        const companyMarketShare = company.marketShare || 0.25;

        let marketConcentration = '';
        if (totalMarket > 0.9) {
            marketConcentration = 'high';
        } else if (totalMarket > 0.7) {
            marketConcentration = 'moderate';
        } else {
            marketConcentration = 'fragmented';
        }

        let assessment = '';
        const marketSharePct = (companyMarketShare * 100).toFixed(1);
        if (companyMarketShare > 0.5) {
            assessment = `Position de leader incontesté sur le marché avec ${marketSharePct}% de part de marché, dominant largement la concurrence.`;
        } else if (companyMarketShare > 0.4) {
            assessment = `Position de leader sur le marché avec ${marketSharePct}% de parts, en tête du secteur.`;
        } else if (companyMarketShare > 0.25) {
            assessment = `Position forte sur le marché avec ${marketSharePct}% de parts, dans le peloton de tête.`;
        } else if (companyMarketShare > 0.15) {
            assessment = `Position compétitive solide avec ${marketSharePct}% du marché, bien positionné face aux principaux concurrents.`;
        } else if (companyMarketShare > 0.05) {
            assessment = `Position de challenger avec ${marketSharePct}% de part de marché, en croissance ou avec un potentiel dexpansion.`;
        } else {
            assessment = `Position de suiveur ou de nouveau entrant avec ${marketSharePct}% du marché, nécessitant une stratégie agressive pour gagner des parts.`;
        }

        return {
            companyMarketShare,
            competitors: company.competitors || [],
            marketConcentration,
            assessment
        };
    }

    analyzeCompetitivePosition(company) {
        if (!company) {
            return {
                strengths: [],
                weaknesses: [],
                position: 'average',
                assessment: 'Position compétitive non spécifiée.'
            };
        }

        const strengths = [];
        const weaknesses = [];

        // Comparaison avec les concurrents moyens
        if (company.quality && company.quality > 8) {
            strengths.push('Qualité supérieure à la moyenne du marché');
        } else if (company.quality && company.quality < 6) {
            weaknesses.push('Qualité inférieure à la moyenne du marché');
        }

        if (company.price && company.price < 0.95) {
            strengths.push('Prix compétitifs');
        } else if (company.price && company.price > 1.05) {
            weaknesses.push('Prix non compétitifs');
        }

        if (company.innovation && company.innovation > 7) {
            strengths.push('Innovation supérieure à la concurrence');
        } else if (company.innovation && company.innovation < 5) {
            weaknesses.push('Retard en matière d\'innovation');
        }

        if (company.customerService && company.customerService > 8) {
            strengths.push('Service client excellent');
        } else if (company.customerService && company.customerService < 6) {
            weaknesses.push('Service client à améliorer');
        }

        if (company.brandStrength && company.brandStrength > 7) {
            strengths.push('Marque forte et reconnue');
        } else if (company.brandStrength && company.brandStrength < 5) {
            weaknesses.push('Notoriété de la marque faible');
        }

        if (company.distribution && company.distribution > 7) {
            strengths.push('Réseau de distribution étendu');
        } else if (company.distribution && company.distribution < 5) {
            weaknesses.push('Réseau de distribution limité');
        }

        let position = '';
        if (strengths.length > weaknesses.length + 2) {
            position = 'leader';
        } else if (strengths.length > weaknesses.length) {
            position = 'strong';
        } else if (strengths.length === weaknesses.length) {
            position = 'average';
        } else if (weaknesses.length > strengths.length + 2) {
            position = 'weak';
        } else {
            position = 'challenger';
        }

        let assessment = '';
        if (position === 'leader') {
            assessment = 'Position de leader avec des avantages compétitifs significatifs.';
        } else if (position === 'strong') {
            assessment = 'Position compétitive forte avec plusieurs avantages.';
        } else if (position === 'average') {
            assessment = 'Position moyenne sur le marché.';
        } else if (position === 'challenger') {
            assessment = 'Position de challenger avec des faiblesses à corriger.';
        } else {
            assessment = 'Position faible nécessitant des améliorations majeures.';
        }

        return {
            strengths,
            weaknesses,
            position,
            assessment
        };
    }

    analyzeCompetitorBenchmark(company) {
        if (!company || !company.competitors) {
            return {
                priceComparison: 'average',
                qualityComparison: 'average',
                featureComparison: 'average',
                innovationComparison: 'average',
                assessment: 'Benchmark concurrentiel non disponible.'
            };
        }

        // Moyenne des concurrents
        const avgPrice = company.competitors.reduce((sum, c) => sum + (c.priceIndex || 1), 0) / company.competitors.length;
        const avgQuality = company.competitors.reduce((sum, c) => sum + (c.qualityIndex || 7), 0) / company.competitors.length;
        const avgFeatures = company.competitors.reduce((sum, c) => sum + (c.featureScore || 7), 0) / company.competitors.length;
        const avgInnovation = company.competitors.reduce((sum, c) => sum + (c.innovationScore || 5), 0) / company.competitors.length;

        const companyPrice = company.priceIndex || 1;
        const companyQuality = company.qualityIndex || 7;
        const companyFeatures = company.featureScore || 7;
        const companyInnovation = company.innovationScore || 5;

        let priceComparison = '';
        if (companyPrice < avgPrice * 0.95) priceComparison = 'below_average';
        else if (companyPrice > avgPrice * 1.05) priceComparison = 'above_average';
        else priceComparison = 'average';

        let qualityComparison = '';
        if (companyQuality > avgQuality * 1.1) qualityComparison = 'above_average';
        else if (companyQuality < avgQuality * 0.9) qualityComparison = 'below_average';
        else qualityComparison = 'average';

        let featureComparison = '';
        if (companyFeatures > avgFeatures * 1.1) featureComparison = 'above_average';
        else if (companyFeatures < avgFeatures * 0.9) featureComparison = 'below_average';
        else featureComparison = 'average';

        let innovationComparison = '';
        if (companyInnovation > avgInnovation * 1.1) innovationComparison = 'above_average';
        else if (companyInnovation < avgInnovation * 0.9) innovationComparison = 'below_average';
        else innovationComparison = 'average';

        let assessment = `Benchmark: Prix ${priceComparison}, Qualité ${qualityComparison}, `;
        assessment += `Fonctionnalités ${featureComparison}, Innovation ${innovationComparison}.`;

        return {
            priceComparison,
            qualityComparison,
            featureComparison,
            innovationComparison,
            companyVsAverage: {
                price: companyPrice,
                quality: companyQuality,
                features: companyFeatures,
                innovation: companyInnovation
            },
            industryAverage: {
                price: avgPrice,
                quality: avgQuality,
                features: avgFeatures,
                innovation: avgInnovation
            },
            assessment
        };
    }

    analyzeCostStructure(company) {
        if (!company) {
            return {
                fixedCosts: 0.5,
                variableCosts: 0.5,
                costAdvantage: 'none',
                assessment: 'Structure de coûts non spécifiée.'
            };
        }

        const fixedCosts = company.fixedCosts || 0.5;
        const variableCosts = company.variableCosts || 0.5;

        let costAdvantage = '';
        let assessment = '';

        if (fixedCosts < 0.4 && variableCosts < 0.6) {
            costAdvantage = 'significant';
            assessment = 'Structure de coûts très avantageuse avec des coûts fixes et variables bas.';
        } else if (fixedCosts < 0.5 && variableCosts < 0.7) {
            costAdvantage = 'moderate';
            assessment = 'Structure de coûts avantageuse avec des coûts compétitifs.';
        } else if (fixedCosts > 0.6 || variableCosts > 0.7) {
            costAdvantage = 'disadvantage';
            assessment = 'Structure de coûts désavantageuse nécessitant une optimisation.';
        } else {
            costAdvantage = 'none';
            assessment = 'Structure de coûts comparable à la moyenne du marché.';
        }

        return {
            fixedCosts,
            variableCosts,
            costAdvantage,
            assessment
        };
    }

    analyzeDifferentiation(company) {
        if (!company) {
            return {
                productDifferentiation: 'moderate',
                serviceDifferentiation: 'moderate',
                brandDifferentiation: 'moderate',
                assessment: 'Différenciation non spécifiée.'
            };
        }

        const productDiff = company.productDifferentiation || 'moderate';
        const serviceDiff = company.serviceDifferentiation || 'moderate';
        const brandDiff = company.brandDifferentiation || 'moderate';

        let assessment = '';
        if (productDiff === 'high' && serviceDiff === 'high' && brandDiff === 'high') {
            assessment = 'Différenciation excellente sur tous les plans.';
        } else if (productDiff === 'high' || serviceDiff === 'high' || brandDiff === 'high') {
            assessment = 'Bonne différenciation dans au moins un domaine clé.';
        } else if (productDiff === 'low' && serviceDiff === 'low' && brandDiff === 'low') {
            assessment = 'Faible différenciation nécessitant une amélioration urgente.';
        } else {
            assessment = 'Différenciation moyenne par rapport aux concurrents.';
        }

        return {
            productDifferentiation: productDiff,
            serviceDifferentiation: serviceDiff,
            brandDifferentiation: brandDiff,
            assessment
        };
    }

    analyzeStrategicGroups(company) {
        if (!company || !company.competitors) {
            return {
                groups: [],
                companyGroup: 'unknown',
                assessment: 'Groupes stratégiques non identifiés.'
            };
        }

        // Identifier les groupes stratégiques basés sur les caractéristiques
        const groups = {};
        
        // Groupe par taille
        if (company.revenue > 100000000) {
            groups.size = 'large';
        } else if (company.revenue > 10000000) {
            groups.size = 'medium';
        } else {
            groups.size = 'small';
        }

        // Groupe par porté géographique
        if (company.geographicCoverage && company.geographicCoverage === 'global') {
            groups.geography = 'global';
        } else if (company.geographicCoverage && company.geographicCoverage === 'regional') {
            groups.geography = 'regional';
        } else {
            groups.geography = 'local';
        }

        // Groupe par stratégie
        if (company.strategy && company.strategy === 'premium') {
            groups.strategy = 'premium';
        } else if (company.strategy && company.strategy === 'cost_leader') {
            groups.strategy = 'cost_leader';
        } else if (company.strategy && company.strategy === 'differentiation') {
            groups.strategy = 'differentiation';
        } else {
            groups.strategy = 'focus';
        }

        // Groupe par innovation
        if (company.innovationLevel && company.innovationLevel > 7) {
            groups.innovation = 'innovator';
        } else if (company.innovationLevel && company.innovationLevel > 4) {
            groups.innovation = 'follower';
        } else {
            groups.innovation = 'laggard';
        }

        const companyGroup = `${groups.size}_${groups.geography}_${groups.strategy}_${groups.innovation}`;

        let assessment = `L'entreprise appartient au groupe stratégique: ${companyGroup.replace(/_/g, ' ')}. `;
        assessment += 'Cela influence sa position concurrentielle et ses options stratégiques.';

        return {
            groups,
            companyGroup,
            assessment
        };
    }

    calculateCompetitiveAdvantage(analysis) {
        const { competitivePosition, competitorBenchmark, costStructure, differentiation } = analysis;

        let score = 0;
        let advantages = [];
        let disadvantages = [];

        // Position compétitive
        if (competitivePosition.position === 'leader') {
            score += 30;
            advantages.push('Position de leader sur le marché');
        } else if (competitivePosition.position === 'strong') {
            score += 20;
            advantages.push('Position compétitive forte');
        } else if (competitivePosition.position === 'average') {
            score += 10;
        } else {
            disadvantages.push(`Position compétitive ${competitivePosition.position}`);
        }

        // Benchmark
        if (competitorBenchmark.priceComparison === 'below_average') {
            score += 15;
            advantages.push('Avantage prix par rapport à la concurrence');
        } else if (competitorBenchmark.priceComparison === 'above_average') {
            disadvantages.push('Désavantage prix par rapport à la concurrence');
        }

        if (competitorBenchmark.qualityComparison === 'above_average') {
            score += 20;
            advantages.push('Avantage qualité par rapport à la concurrence');
        } else if (competitorBenchmark.qualityComparison === 'below_average') {
            disadvantages.push('Désavantage qualité par rapport à la concurrence');
        }

        if (competitorBenchmark.featureComparison === 'above_average') {
            score += 15;
            advantages.push('Avantage fonctionnalités par rapport à la concurrence');
        } else if (competitorBenchmark.featureComparison === 'below_average') {
            disadvantages.push('Désavantage fonctionnalités par rapport à la concurrence');
        }

        if (competitorBenchmark.innovationComparison === 'above_average') {
            score += 15;
            advantages.push('Avantage innovation par rapport à la concurrence');
        } else if (competitorBenchmark.innovationComparison === 'below_average') {
            disadvantages.push('Désavantage innovation par rapport à la concurrence');
        }

        // Structure de coûts
        if (costStructure.costAdvantage === 'significant') {
            score += 15;
            advantages.push('Avantage coûteux significatif');
        } else if (costStructure.costAdvantage === 'moderate') {
            score += 10;
            advantages.push('Avantage coûteux modéré');
        } else if (costStructure.costAdvantage === 'disadvantage') {
            disadvantages.push('Désavantage coûteux');
        }

        // Différenciation
        if (differentiation.productDifferentiation === 'high' && 
            differentiation.serviceDifferentiation === 'high' && 
            differentiation.brandDifferentiation === 'high') {
            score += 10;
            advantages.push('Excellente différenciation globale');
        } else if (differentiation.productDifferentiation === 'low' || 
                   differentiation.serviceDifferentiation === 'low' || 
                   differentiation.brandDifferentiation === 'low') {
            disadvantages.push('Faible différenciation dans un ou plusieurs domaines');
        }

        score = Math.min(100, score);

        let level = '';
        if (score >= 80) level = 'Très fort';
        else if (score >= 60) level = 'Fort';
        else if (score >= 40) level = 'Modéré';
        else if (score >= 20) level = 'Faible';
        else level = 'Très faible';

        return {
            score,
            level,
            advantages,
            disadvantages
        };
    }

    generateStrategicRecommendations(analysis) {
        const recommendations = [];
        const { competitivePosition, competitorBenchmark, costStructure, differentiation, strategicGroups } = analysis;

        // Recommandations basées sur la position compétitive
        if (competitivePosition.position === 'leader') {
            recommendations.push({
                type: 'positioning',
                action: 'Maintenir la position de leader en continuant à innover et à investir dans la différenciation',
                priority: 'high'
            });
            recommendations.push({
                type: 'positioning',
                action: 'Protéger la position de leader par des barrières à l\'entrée',
                priority: 'high'
            });
        } else if (competitivePosition.position === 'strong') {
            recommendations.push({
                type: 'positioning',
                action: 'Renforcer la position forte en ciblant les faiblesses des leaders',
                priority: 'high'
            });
            recommendations.push({
                type: 'positioning',
                action: 'Développer des avantages compétitifs supplémentaires',
                priority: 'medium'
            });
        } else if (competitivePosition.position === 'challenger') {
            recommendations.push({
                type: 'positioning',
                action: 'Lancer des actions agressives pour rattraper les leaders',
                priority: 'critical'
            });
            recommendations.push({
                type: 'positioning',
                action: 'Identifier et exploiter les faiblesses des leaders',
                priority: 'critical'
            });
        } else {
            recommendations.push({
                type: 'positioning',
                action: 'Améliorer les fondamentaux avant de viser des positions plus élevées',
                priority: 'critical'
            });
        }

        // Recommandations basées sur le benchmark
        if (competitorBenchmark.priceComparison === 'above_average' && 
            competitorBenchmark.qualityComparison !== 'above_average') {
            recommendations.push({
                type: 'benchmark',
                action: 'Réduire les coûts ou améliorer la qualité pour justifier les prix élevés',
                priority: 'high'
            });
        }

        if (competitorBenchmark.qualityComparison === 'below_average') {
            recommendations.push({
                type: 'benchmark',
                action: 'Investir dans l\'amélioration de la qualité pour rattraper la concurrence',
                priority: 'high'
            });
        }

        if (competitorBenchmark.innovationComparison === 'below_average') {
            recommendations.push({
                type: 'benchmark',
                action: 'Augmenter les investissements en R&D pour améliorer l\'innovation',
                priority: 'high'
            });
        }

        // Recommandations basées sur la structure de coûts
        if (costStructure.costAdvantage === 'disadvantage') {
            recommendations.push({
                type: 'cost',
                action: 'Lancer un programme d\'optimisation des coûts',
                priority: 'critical'
            });
        } else if (costStructure.costAdvantage === 'significant' || costStructure.costAdvantage === 'moderate') {
            recommendations.push({
                type: 'cost',
                action: 'Utiliser l\'avantage coût pour gagner des parts de marché',
                priority: 'medium'
            });
        }

        // Recommandations basées sur la différenciation
        if (differentiation.productDifferentiation === 'low') {
            recommendations.push({
                type: 'differentiation',
                action: 'Développer une stratégie de différenciation produit',
                priority: 'high'
            });
        }

        if (differentiation.brandDifferentiation === 'low') {
            recommendations.push({
                type: 'differentiation',
                action: 'Renforcer l\'image de marque et le positionnement',
                priority: 'high'
            });
        }

        // Recommandations basées sur les groupes stratégiques
        if (strategicGroups.companyGroup.includes('small')) {
            recommendations.push({
                type: 'strategic',
                action: 'Envisager des partenariats ou des alliances pour concurrencer les grands acteurs',
                priority: 'medium'
            });
        }

        if (strategicGroups.companyGroup.includes('laggard')) {
            recommendations.push({
                type: 'strategic',
                action: 'Investir massivement dans l\'innovation pour sortir du groupe des retardataires',
                priority: 'critical'
            });
        }

        return recommendations;
    }

    generateSummary(analysis, competitiveAdvantage) {
        const { competitivePosition, marketShare, strategicGroups } = analysis;

        return {
            marketShare: marketShare.companyMarketShare,
            competitivePosition: competitivePosition.position,
            competitiveAdvantage: competitiveAdvantage.level,
            strategicGroup: strategicGroups.companyGroup,
            recommendation: this.generateCompetitiveRecommendation(competitiveAdvantage.score, competitivePosition.position)
        };
    }

    generateCompetitiveRecommendation(score, position) {
        if (score >= 80) {
            return `Avantage compétitif très fort (${score}/100). Stratégie recommandée: Expansion agressive et diversification`;
        } else if (score >= 60) {
            return `Avantage compétitif solide (${score}/100). Stratégie recommandée: Croissance et consolidation`;
        } else if (score >= 40) {
            if (position === 'challenger' || position === 'weak') {
                return `Avantage compétitif modéré (${score}/100). Stratégie recommandée: Amélioration des positions clés et différenciation`;
            }
            return `Avantage compétitif modéré (${score}/100). Stratégie recommandée: Maintien et optimisation`;
        } else if (score >= 20) {
            return `Avantage compétitif faible (${score}/100). Stratégie recommandée: Approche défensive et restructuration`;
        } else {
            return `Avantage compétitif très faible (${score}/100). Stratégie recommandée: Réorientation stratégique ou sortie du marché`;
        }
    }

    formatRecommendations(results) {
        const recommendations = [];
        const { strategicRecommendations, summary } = results;

        // Ajouter la recommandation principale
        recommendations.push({
            type: 'competitive',
            priority: 'high',
            action: summary.recommendation,
            category: 'overall'
        });

        // Ajouter les recommandations stratégiques
        strategicRecommendations.forEach(rec => {
            recommendations.push({
                type: 'competitive',
                priority: rec.priority,
                action: rec.action,
                category: rec.type
            });
        });

        // Ajouter des recommandations basées sur les avantages/désavantages
        results.competitiveAdvantage.advantages.forEach(adv => {
            recommendations.push({
                type: 'competitive',
                priority: 'medium',
                action: `Maintenir et renforcer: ${adv}`,
                category: 'advantage'
            });
        });

        results.competitiveAdvantage.disadvantages.forEach(dis => {
            recommendations.push({
                type: 'competitive',
                priority: 'high',
                action: `Corriger: ${dis}`,
                category: 'disadvantage'
            });
        });

        return recommendations;
    }

    calculateAnalysisScore(results) {
        return Math.round(results.competitiveAdvantage.score);
    }

    calculateConfidence(results) {
        // Confiance basée sur la complétude des données
        let confidence = 70;
        if (results.marketShare.assessment && results.marketShare.assessment.length > 50) confidence += 5;
        if (results.competitivePosition.assessment && results.competitivePosition.assessment.length > 50) confidence += 5;
        if (results.competitorBenchmark.assessment && results.competitorBenchmark.assessment.length > 50) confidence += 5;
        if (results.costStructure.assessment && results.costStructure.assessment.length > 50) confidence += 5;
        if (results.differentiation.assessment && results.differentiation.assessment.length > 50) confidence += 5;
        if (results.strategicGroups.assessment && results.strategicGroups.assessment.length > 50) confidence += 5;
        return Math.min(100, confidence);
    }
}

// =============================================================================
// SYSTÈME DE GESTION DES ANALYSES
// =============================================================================

class AnalysisManager {
    static analysisTypes = {
        swot: SWOTAnalysis,
        porter: PorterFiveForcesAnalysis,
        pestel: PESTELAnalysis,
        competitive: CompetitiveAnalysis
    };

    static analysisCosts = {
        swot: { free: 5, pro: 5, enterprise: 5 },
        porter: { free: 20, pro: 20, enterprise: 20 },
        pestel: { free: 15, pro: 15, enterprise: 15 },
        competitive: { free: 20, pro: 20, enterprise: 20 }
    };

    static async runAnalysis(type, name, description, companyData, plan = 'free') {
        // Vérifier le coût
        const cost = this.analysisCosts[type]?.[plan] || this.analysisCosts[type]?.free;
        if (!cost) {
            throw new Error(`Type d'analyse inconnu: ${type}`);
        }

        // Vérifier que l'utilisateur a assez de tokens (sauf si advisor avec tokens illimités)
        const availableTokens = TokenManager.availableTokens || 0;
        const isAdvisor = plan === 'advisor';
        
        if (!isAdvisor && availableTokens < cost) {
            throw new Error(`Pas assez de tokens. Nécessaire: ${cost}, Disponible: ${availableTokens}`);
        }

        // Créer et exécuter l'analyse
        const AnalysisClass = this.analysisTypes[type];
        if (!AnalysisClass) {
            throw new Error(`Type d'analyse non supporté: ${type}`);
        }

        const analysis = new AnalysisClass(name, description, companyData);
        const result = await analysis.execute();

        // =============================================================================
        // INTÉGRATION IA : Améliorer les résultats avec Mistral si l'utilisateur a accès
        // =============================================================================
        let enhancedResult = result;
        const user = authService.currentUser;
        
        if (user && TokenManager.isAIAllowed()) {
            try {
                // Appeler l'IA pour enrichir les résultats
              const aiEnhancement = await this.enhanceWithAI(type, result, companyData);
              
              // Fusionner les résultats
              enhancedResult = {
                ...result,
                results: {
                  ...result.results,
                  aiEnhancement: aiEnhancement,
                  isAIEnhanced: true
                }
              };
              
              console.log('✅ Résultats enrichis par IA');
            } catch (aiError) {
              console.error('⚠️ Erreur IA (analyse continue sans IA):', aiError);
              // Continuer sans IA si erreur
            }
        }

        // Sauvegarder l'analyse dans Firestore
        if (user) {
            await db.collection('users').doc(user.uid).collection('analyses').add({
                ...enhancedResult.toJSON(),
                cost: cost,
                createdAt: new Date().toISOString(),
                userId: user.uid,
                isAIEnhanced: TokenManager.isAIAllowed()
            });

            // Mettre à jour les tokens (sauf pour advisor avec tokens illimités)
            if (!TokenManager.isTokensUnlimited()) {
                await TokenManager.useTokens(cost, type);
            }

            // Mettre à jour les stats utilisateur
            const FieldValue = (window.firebaseDB || firebase.firestore()).FieldValue;
            await db.collection('users').doc(user.uid).update({
                'loyaltyInfo.totalAnalyses': FieldValue.increment(1),
                'loyaltyInfo.monthlyAnalyses': FieldValue.increment(1)
            });
        }

        return enhancedResult;
    }

    // =============================================================================
    // AMÉLIORATION DES RÉSULTATS AVEC IA MISTRAL
    // =============================================================================
    static async enhanceWithAI(type, analysisResult, companyData) {
        try {
            // Créer un prompt pour améliorer les résultats
            const prompt = this.createEnhancementPrompt(type, analysisResult, companyData);
            
            // Appeler Mistral via TokenManager
            const aiResponse = await TokenManager.callMistral(prompt);
            
            // Parser la réponse
            return {
                prompt: prompt,
                response: aiResponse,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Erreur enhanceWithAI:', error);
            throw error;
        }
    }

    static createEnhancementPrompt(type, analysisResult, companyData) {
        // Utiliser le contexte DPAI
        const context = window.DPAI_CONTEXT || `
Tu es **DPAI Strategy**, un cabinet français spécialisé dans la croissance externe.
Nos analyses sont basées sur notre expertise en M&A avec des données marché françaises/européennes.
Toujours personnaliser, utiliser des chiffres concrets, et proposer des recommandations actionnables.
Structure : Contexte → Analyse → Recommandations → Prochaines étapes
Toujours en français, ton professionnel.
`;

        // Formater les données de l'entreprise
        const companyInfo = companyData ? `
Données entreprise:
- Nom: ${companyData.name || 'Non spécifié'}
- Secteur: ${companyData.sector || 'Non spécifié'}
- CA: ${companyData.revenue || 'Non spécifié'}
- EBITDA: ${companyData.ebitda || 'Non spécifié'}
- Effectifs: ${companyData.employees || 'Non spécifié'}
` : '';

        // Formater les résultats de l'analyse existante
        let existingResults = '';
        if (analysisResult.results) {
            if (analysisResult.results.strengths) {
                existingResults += `\nForces identifiées:\n${analysisResult.results.strengths.map((s, i) => `${i+1}. ${s}`).join('\n')}`;
            }
            if (analysisResult.results.weaknesses) {
                existingResults += `\nFaiblesses identifiées:\n${analysisResult.results.weaknesses.map((w, i) => `${i+1}. ${w}`).join('\n')}`;
            }
            if (analysisResult.results.opportunities) {
                existingResults += `\nOpportunités identifiées:\n${analysisResult.results.opportunities.map((o, i) => `${i+1}. ${o}`).join('\n')}`;
            }
            if (analysisResult.results.threats) {
                existingResults += `\nMenaces identifiées:\n${analysisResult.results.threats.map((t, i) => `${i+1}. ${t}`).join('\n')}`;
            }
        }

        // Créer le prompt selon le type d'analyse
        switch (type) {
            case 'swot':
                return `${context}

Mission: **PERSONNALISER ET AMÉLIORER** cette analyse SWOT pour la rendre plus spécifique, plus précise et plus actionnable. NE PAS simplement répéter ce qui existe déjà.

${companyInfo}

Analyse existante à améliorer:
${existingResults}

Instructions:
1. **Analyse critique** : Identifie ce qui manque ou ce qui est trop générique dans l'analyse existante
2. **Ajoute des éléments spécifiques** : Utilise des benchmarks sectoriels français, des exemples concrets DPAI, des chiffres
3. **Structure améliorée** :
   - **Contexte** (1-2 phrases maximum)
   - **Forces** (min 3, max 5) → avec impact chiffré si possible
   - **Faiblesses** (min 3, max 5) → avec risque chiffré si possible
   - **Opportunités** (min 3, max 5) → avec potentiel chiffré
   - **Menaces** (min 3, max 5) → avec impact + solution DPAI
   - **Recommandations Stratégiques DPAI** (3-5) → avec ROI estimé
   - **Prochaines étapes** (2-3 actions immédiates)
4. **Ne jamais dire** : "En tant qu'IA", "Généralement", "Typiquement"
5. **Toujours inclure** : Des exemples concrets de cas traités par DPAI

Format attendu : Markdown bien structuré avec des titres clairs`;

            case 'porter':
                return `${context}

Mission: **PERSONNALISER ET APPROFONDIR** cette analyse Porter 5 Forces avec des données sectorielles françaises spécifiques.

${companyInfo}

Analyse existante à améliorer:
${existingResults}

Instructions:
1. **Ne pas répéter** l'analyse existante
2. **Ajouter des benchmarks sectoriels** : "Dans le secteur X en France, le multiple moyen est de Yx EBITDA"
3. **Structure complète** :
   - Contexte sectoriel français
   - 5 Forces analysées avec scores (1-10) et benchmarks
   - Synthèse avec attractivité du secteur
   - Recommandations DPAI (2-3)
   - Prochaines étapes
4. **Utiliser des exemples DPAI** : "Chez DPAI, nous avons observé que..."

Format attendu : Analyse professionnelle avec chiffres et exemples concrets`;

            case 'pestel':
                return `${context}

Mission: **ENRICHIR** cette analyse PESTEL avec des données macro-économiques françaises et européennes.

${companyInfo}

Analyse existante à améliorer:
${existingResults}

Instructions:
1. **Ajouter des données spécifiques** : INSEE, Banque de France, Xerfi
2. **Structure** :
   - Politique (score 1-10, impact, évaluation)
   - Économique (score 1-10, impact, évaluation)
   - Social (score 1-10, impact, évaluation)
   - Technologique (score 1-10, impact, évaluation)
   - Environnemental (score 1-10, impact, évaluation)
   - Légal (score 1-10, impact, évaluation)
   - Synthèse globale
3. **Inclure des tendances 2026** pour la France

Format attendu : Analyse macro-économique précise et actionnable`;

            case 'competitive':
                return `${context}

Mission: **APPROFONDIR** cette analyse concurrentielle avec des comparaisons précises et des recommandations stratégiques.

${companyInfo}

Analyse existante à améliorer:
${existingResults}

Instructions:
1. **Ajouter des comparaisons** : positionnement prix, qualité, fonctionnalités
2. **Analyse des parts de marché** avec données françaises
3. **Avantage concurrentiel** : identifier et quantifier
4. **Recommandations** : comment se différencier

Format attendu : Analyse concurrentielle détaillée avec actions concrètes`;

            default:
                return `${context}

Mission: **AMÉLIORER** cette analyse ${type} pour la rendre plus spécifique et actionnable.

${companyInfo}

Analyse existante:
${existingResults}

Instructions:
1. Personnaliser pour cette entreprise et ce secteur
2. Ajouter des chiffres et des exemples concrets
3. Proposer des recommandations actionnables
4. Utiliser la méthodologie DPAI

Format attendu : Analyse professionnelle et précise`;
        }
    }

    static getCost(type, plan = 'free') {
        return this.analysisCosts[type]?.[plan] || this.analysisCosts[type]?.free || 0;
    }

    static getAnalysisTypes() {
        return Object.keys(this.analysisTypes);
    }

    static getAnalysisInfo(type) {
        const infos = {
            swot: {
                name: 'Analyse SWOT',
                description: 'Analyse des Forces, Faiblesses, Opportunités et Menaces',
                category: 'Stratégique',
                minTokens: 3,
                maxTokens: 30,
                avgTokens: 10
            },
            porter: {
                name: 'Porter 5 Forces',
                description: 'Analyse des cinq forces concurrentielles de Porter',
                category: 'Concurrence',
                minTokens: 5,
                maxTokens: 120,
                avgTokens: 20
            },
            pestel: {
                name: 'Analyse PESTEL',
                description: 'Analyse de l\'environnement Politique, Économique, Social, Technologique, Écologique et Légal',
                category: 'Environnement',
                minTokens: 4,
                maxTokens: 75,
                avgTokens: 15
            },
            competitive: {
                name: 'Analyse Concurrentielle',
                description: 'Analyse détaillée de la position concurrentielle',
                category: 'Concurrence',
                minTokens: 6,
                maxTokens: 160,
                avgTokens: 20
            }
        };
        return infos[type] || { name: type, description: '', category: 'Inconnu' };
    }

    static generateMockCompanyData() {
        return {
            name: 'Entreprise Exemple',
            industry: 'Technologie',
            revenue: 50000000,
            employees: 250,
            marketShare: 0.15,
            quality: 8,
            price: 0.95,
            innovation: 7,
            customerService: 8,
            brandStrength: 7,
            distribution: 7,
            fixedCosts: 0.45,
            variableCosts: 0.55,
            productDifferentiation: 'high',
            serviceDifferentiation: 'medium',
            brandDifferentiation: 'high',
            strategy: 'differentiation',
            geographicCoverage: 'regional',
            innovationLevel: 7,
            competitorCount: 8,
            competitors: [
                { name: 'Concurrent A', marketShare: 0.25, qualityIndex: 7, priceIndex: 1.0, featureScore: 6, innovationScore: 5 },
                { name: 'Concurrent B', marketShare: 0.20, qualityIndex: 8, priceIndex: 1.1, featureScore: 7, innovationScore: 6 },
                { name: 'Concurrent C', marketShare: 0.15, qualityIndex: 6, priceIndex: 0.9, featureScore: 5, innovationScore: 4 }
            ],
            supplierConcentration: 0.3,
            supplierSwitchingCosts: 'medium',
            supplierUniqueness: 'low',
            supplierForwardIntegration: 'low',
            buyerConcentration: 0.2,
            buyerVolume: 'large',
            buyerSwitchingCosts: 'low',
            buyerInformation: 'high',
            buyerPriceSensitivity: 'high',
            economiesOfScale: 'high',
            capitalRequirements: 'high',
            brandLoyalty: 'high',
            entrySwitchingCosts: 'medium',
            accessToDistribution: 'medium',
            regulatoryBarriers: 'medium',
            proprietaryTechnology: 'low',
            substituteAvailability: 'medium',
            substitutePricePerformance: 'better',
            substituteSwitchingCosts: 'low',
            buyerPropensityToSubstitute: 'medium',
            industryGrowth: 'medium',
            industryFixedCosts: 'high',
            industryStorageCosts: 'medium',
            productDifferentiationIndustry: 'medium',
            exitBarriers: 'medium',
            strategicStakes: 'high',
            governmentStability: 'stable',
            taxationPolicy: 'moderate',
            tradeRegulations: 'favorable',
            foreignInvestmentPolicy: 'open',
            subsidies: 'none',
            politicalRisks: 'low',
            gdpGrowth: 2.5,
            inflationRate: 2.0,
            interestRates: 'moderate',
            unemploymentRate: 5.0,
            exchangeRates: 'stable',
            disposableIncome: 'increasing',
            consumerSpending: 'growing',
            populationGrowth: 'moderate',
            ageDistribution: 'balanced',
            educationLevel: 'high',
            culturalTrends: 'favorable',
            lifestyleChanges: 'moderate',
            healthAwareness: 'increasing',
            workLifeBalance: 'improving',
            rndInvestment: 'high',
            technologicalAdoption: 'fast',
            digitalTransformation: 'advanced',
            automation: 'increasing',
            aiAdoption: 'growing',
            technologicalDisruption: 'moderate',
            ipProtection: 'strong',
            climateChangeImpact: 'moderate',
            sustainabilityTrends: 'growing',
            carbonFootprint: 'reducing',
            greenEnergyAdoption: 'increasing',
            wasteManagement: 'improving',
            waterScarcity: 'concerning',
            naturalResourceAvailability: 'stable',
            laborLaws: 'balanced',
            consumerProtection: 'strong',
            environmentalRegulations: 'strict',
            dataProtection: 'strong',
            industryRegulations: 'moderate',
            intellectualProperty: 'protected',
            taxCompliance: 'complex',
            healthAndSafety: 'strict'
        };
    }
}

// =============================================================================
// FONCTIONS GLOBALES
// =============================================================================

// Exécuter une analyse
async function executeAnalysis(type, name, description, companyData) {
    try {
        const user = authService.currentUser;
        if (!user) {
            throw new Error('Vous devez être connecté pour effectuer une analyse');
        }

        const plan = authService.userData?.plan || 'free';
        const result = await AnalysisManager.runAnalysis(type, name, description, companyData, plan);
        
        return { success: true, result };
    } catch (error) {
        console.error('Erreur lors de l\'exécution de l\'analyse:', error);
        return { success: false, error: error.message };
    }
}

// Générer des résultats mock pour la compatibilité avec l'existant
function generateMockResults(type, companyName = 'votre entreprise') {
    // Générer un score aléatoire réaliste
    const randomScore = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    
    // Sélectionner des éléments aléatoires pour plus de variété
    const randomFrom = (arr, count) => {
        const shuffled = [...arr].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    };

    const mockResults = {
        swot: {
            strengths: randomFrom([
                `Marque reconnue dans le secteur de ${companyName}`,
                `Équipe expérimentée avec une expertise métiers solide`,
                `Technologie moderne et adaptée aux besoins clients`,
                `Position financière saine permettant des investissements`,
                `Réseau de distribution efficace couvrant les zones clés`,
                `Portfeuille clients diversifié et fidèle`,
                `Processus opérationnels optimisés et performants`,
                `Innovation continue avec des produits compétitifs`
            ], 4),
            weaknesses: randomFrom([
                `Dépendance modérée à quelques clients principaux`,
                `Coûts opérationnels nécessitant une optimisation`,
                `Présence géographique encore limitée à certaines régions`,
                `Capacité de production à renforcer pour répondre à la demande`,
                `Besoins en talents spécialisés dans certains domaines`,
                `Délais de mise sur le marché parfois trop longs`
            ], 3),
            opportunities: randomFrom([
                `Nouveaux segments de marché en forte croissance`,
                `Partenariats stratégiques avec des acteurs complémentaires`,
                `Adoption de technologies émergentes pour gagner en efficacité`,
                `Demande croissante pour des solutions innovantes`,
                `Expansion géographique vers de nouvelles zones`,
                `Diversification de la gamme produits/services`,
                `Acquisitions ciblées pour renforcer la position`
            ], 3),
            threats: randomFrom([
                `Concurrence accrue avec l'arrivée de nouveaux acteurs`,
                `Changements réglementaires à surveiller de près`,
                `Fluctuations économiques impactant la demande`,
                `Risque de disruption technologique dans le secteur`,
                `Pression sur les marges due à la concurrence`,
                `Évolution des attentes et préférences clients`
            ], 3),
            strategicInsights: {
                SO: [
                    `Exploiter la notoriété de la marque pour conquérir de nouveaux segments clients`,
                    `Capitaliser sur l'expertise de l'équipe pour développer des solutions innovantes`
                ],
                ST: [
                    `Utiliser la position technologique pour contrer l'arrivée de nouveaux concurrents`,
                    `Renforcer la relation client pour limiter l'impact des fluctuations économiques`
                ],
                WO: [
                    `Améliorer la couverture géographique pour saisir les opportunités de croissance`,
                    `Optimiser les coûts opérationnels pour financer l'innovation`
                ],
                WT: [
                    `Diversifier le portefeuille clients pour réduire la dépendance aux principaux clients`,
                    `Anticiper les changements réglementaires pour éviter les risques`
                ]
            }
        },
        porter: {
            supplierPower: { 
                score: randomScore(50, 80), 
                level: randomScore(50, 80) > 70 ? 'Élevé' : 'Moyen', 
                assessment: `Pouvoir des fournisseurs ${randomScore(50, 80) > 70 ? 'élevé' : 'modéré'} avec des facteurs de concentration et de spécialisation à considérer`,
                factors: { concentration: 0.5, switchingCosts: 'medium', uniqueness: 'medium' }
            },
            buyerPower: { 
                score: randomScore(60, 85), 
                level: randomScore(60, 85) > 75 ? 'Élevé' : 'Moyen', 
                assessment: `Pouvoir des acheteurs ${randomScore(60, 85) > 75 ? 'élevé' : 'modéré'} influencé par la disponibilité de l'information et la sensibilité aux prix`,
                factors: { concentration: 0.3, volume: 'large', switchingCosts: 'low' }
            },
            newEntrants: { 
                score: randomScore(30, 60), 
                level: randomScore(30, 60) > 50 ? 'Moyenne' : 'Faible', 
                assessment: `Menace des nouveaux entrants ${randomScore(30, 60) > 50 ? 'modérée' : 'faible'} grâce aux barrières à l'entrée existantes`,
                factors: { economiesOfScale: 'high', capitalRequirements: 'high' }
            },
            substitutes: { 
                score: randomScore(40, 70), 
                level: randomScore(40, 70) > 60 ? 'Élevée' : 'Moyenne', 
                assessment: `Menace des substituts ${randomScore(40, 70) > 60 ? 'significative' : 'modérée'} selon les alternatives disponibles`,
                factors: { availability: 'medium', pricePerformance: 'better' }
            },
            rivalry: { 
                score: randomScore(65, 85), 
                level: randomScore(65, 85) > 80 ? 'Intense' : 'Modérée', 
                assessment: `Rivalité concurrentielle ${randomScore(65, 85) > 80 ? 'intense' : 'modérée'} dans un marché dynamique`,
                factors: { competitorCount: randomScore(5, 15) }
            },
            industryAttractiveness: { 
                score: randomScore(45, 75), 
                level: randomScore(45, 75) > 65 ? 'Attractive' : 'Moyennement attractive'
            }
        },
        pestel: {
            political: { 
                score: randomScore(60, 85), 
                level: randomScore(60, 85) > 75 ? 'Favorable' : 'Modérément favorable', 
                impact: 'positive', 
                assessment: `Environnement politique ${randomScore(60, 85) > 75 ? 'stable et favorable' : 'relativement stable'}`
            },
            economic: { 
                score: randomScore(55, 75), 
                level: randomScore(55, 75) > 70 ? 'Favorable' : 'Modéré', 
                impact: randomScore(55, 75) > 70 ? 'positive' : 'neutral', 
                assessment: `Contexte économique ${randomScore(55, 75) > 70 ? 'porteur' : 'stable'}`
            },
            social: { 
                score: randomScore(65, 85), 
                level: randomScore(65, 85) > 80 ? 'Très favorable' : 'Favorable', 
                impact: 'positive', 
                assessment: `Tendances socioculturelles ${randomScore(65, 85) > 80 ? 'très favorables' : 'favorables'}`
            },
            technological: { 
                score: randomScore(70, 90), 
                level: randomScore(70, 90) > 85 ? 'Très favorable' : 'Favorable', 
                impact: 'positive', 
                assessment: `Environnement technologique ${randomScore(70, 90) > 85 ? 'très dynamique' : 'favorable'}`
            },
            environmental: { 
                score: randomScore(50, 75), 
                level: randomScore(50, 75) > 65 ? 'Favorable' : 'Neutre', 
                impact: randomScore(50, 75) > 65 ? 'positive' : 'neutral', 
                assessment: `Pression environnementale ${randomScore(50, 75) > 65 ? 'maîtrisée' : 'modérée'}`
            },
            legal: { 
                score: randomScore(50, 70), 
                level: randomScore(50, 70) > 60 ? 'Favorable' : 'Neutre', 
                impact: randomScore(50, 70) > 60 ? 'positive' : 'neutral', 
                assessment: `Cadre légal ${randomScore(50, 70) > 60 ? 'clair et favorable' : 'standard'}`
            }
        },
        competitive: {
            marketShare: { 
                companyMarketShare: Math.random() * 0.15 + 0.10,
                assessment: `Part de marché de ${(Math.random() * 0.15 + 0.10 * 100).toFixed(1)}% dans un marché concurrentiel`
            },
            competitivePosition: { 
                position: Math.random() > 0.5 ? 'strong' : 'solid',
                assessment: `Position compétitive ${Math.random() > 0.5 ? 'forte' : 'solide'} avec des atouts différenciateurs`
            },
            competitorBenchmark: {
                priceComparison: Math.random() > 0.7 ? 'competitive' : Math.random() > 0.5 ? 'average' : 'premium',
                qualityComparison: Math.random() > 0.7 ? 'superior' : Math.random() > 0.5 ? 'above_average' : 'average',
                featureComparison: Math.random() > 0.7 ? 'rich' : Math.random() > 0.5 ? 'average' : 'basic',
                assessment: `Positionnement produit ${Math.random() > 0.7 ? 'supérieur' : 'équivalent'} par rapport aux principaux concurrents`
            },
            competitiveAdvantage: { 
                score: randomScore(60, 85), 
                level: randomScore(60, 85) > 75 ? 'Fort' : 'Modéré'
            }
        }
    };

    return mockResults[type] || {};
}

// =============================================================================
// INTÉGRATION IA AVEC MISTRAL
// =============================================================================

// Stocker le DPAI_CONTEXT et les prompts au niveau global
const DPAI_CONTEXT_AI = `
Tu es **DPAI Strategy**, un cabinet français spécialisé dans la **croissance externe** (fusions, acquisitions, rachats) pour les **PME et ETI françaises**.
**Notre méthodologie propriétaire :**
- Nous utilisons des **données marché françaises/européennes** (INSEE, Banque de France, Xerfi).
- Nos analyses sont **basées sur notre expertise** en M&A.
- Nous priorisons les **stratégies actionnables** (pas de théorie vide).

**Règles strictes :**
1. **Toujours personnaliser** : Adapte tes réponses au secteur, taille, et contexte du client.
2. **Chiffres concrets** : Utilise des **benchmarks sectoriels** (ex : "Dans la tech française, le multiple moyen est de 8-12x EBITDA").
3. **Exemples DPAI** : Si tu cites un exemple, utilise un **cas réel traité par DPAI** (à inventer si nécessaire).
4. **Structure claire** : Utilise **toujours** cette structure :
   - **Contexte** (1 phrase)
   - **Analyse** (3-5 points clés)
   - **Recommandations** (2-3 actions concrètes)
   - **Prochaines étapes** (1-2 actions immédiates)
5. **Langage** : **Toujours en français**, avec un ton **professionnel mais accessible**.
6. **Ne JAMAIS dire** : "En tant qu'IA...", "Je suis un modèle de langage...", "Généralement...".
`;

// Définir les prompts pour chaque type d'analyse
const ANALYSIS_PROMPTS = {
    swot: (companyData) => `
        ${DPAI_CONTEXT_AI}

        **Mission :**
        Réalise une **analyse SWOT ultra-personnalisée** pour cette entreprise, en utilisant **uniquement** les données fournies et notre méthodologie DPAI.

        **Données de l'entreprise :**
        - **Nom** : ${companyData.name || 'Non spécifié'}
        - **Secteur** : ${companyData.sector || 'Non spécifié'} (en France)
        - **Chiffre d'affaires** : ${companyData.revenue || 'Non spécifié'} €
        - **EBITDA** : ${companyData.ebitda || 'Non spécifié'} €
        - **Nombre d'employés** : ${companyData.employees || 'Non spécifié'}
        - **Marché cible** : ${companyData.targetMarket || 'Non spécifié'}
        - **Objectifs** : ${companyData.goals || 'Croissance externe'}
        - **Contraintes** : ${companyData.constraints || 'Aucune'}

        **Format attendu :**
        ## 📊 Analyse SWOT pour [Nom de l'entreprise] (Secteur : [Secteur])
        **Contexte :** [1 phrase résumant la situation]

        ### 🔵 **Forces** (min 3 points)
        1. [Force 1] → **Impact** : [Explication concrète avec chiffres]
        2. [Force 2] → **Impact** : [Explication concrète avec chiffres]
        3. [Force 3] → **Impact** : [Explication concrète avec chiffres]

        ### 🟠 **Faiblesses** (min 3 points)
        1. [Faiblesse 1] → **Risque** : [Explication concrète]
        2. [Faiblesse 2] → **Risque** : [Explication concrète]
        3. [Faiblesse 3] → **Risque** : [Explication concrète]

        ### 🟢 **Opportunités** (min 3 points)
        1. [Opportunité 1] → **Potentiel** : [Chiffre ou exemple concret]
        2. [Opportunité 2] → **Potentiel** : [Chiffre ou exemple concret]
        3. [Opportunité 3] → **Potentiel** : [Chiffre ou exemple concret]

        ### 🔴 **Menaces** (min 3 points)
        1. [Menace 1] → **Impact** : [Explication + solution DPAI]
        2. [Menace 2] → **Impact** : [Explication + solution DPAI]
        3. [Menace 3] → **Impact** : [Explication + solution DPAI]

        ### 💡 **Recommandations Stratégiques (DPAI)**
        1. [Recommandation 1] → **Action** : [Étapes concrètes] → **ROI estimé** : [Chiffre si possible]
        2. [Recommandation 2] → **Action** : [Étapes concrètes] → **ROI estimé** : [Chiffre si possible]
        3. [Recommandation 3] → **Action** : [Étapes concrètes] → **ROI estimé** : [Chiffre si possible]

        **Prochaines étapes :**
        - [Étape 1]
        - [Étape 2]

        **⚠️ Important :**
        - **Ne pas utiliser de placeholders** comme "[Nom de l'entreprise]".
        - **Toujours inclure des chiffres** (même estimés).
        - **Proposer des solutions DPAI**.`,

    porter: (companyData) => `
        ${DPAI_CONTEXT_AI}

        **Mission :**
        Analyse les **5 Forces de Porter** pour cette entreprise, en utilisant **nos données sectorielles DPAI**.

        **Données :**
        - **Secteur** : ${companyData.sector || 'Non spécifié'} (France)
        - **Positionnement** : ${companyData.positioning || 'Leader local'}
        - **Part de marché** : ${companyData.marketShare || 'Non spécifié'}%
        - **Prix moyen** : ${companyData.avgPrice || 'Non spécifié'} €
        - **Coûts fixes** : ${companyData.fixedCosts || 'Élevés/Modérés/Faibles'}

        **Format attendu :**
        ## 📊 Analyse Porter 5 Forces pour [Nom] (Secteur : [Secteur])

        ### 1️⃣ **Pouvoir de négociation des clients**
        - **Niveau** : [Élevé/Modéré/Faible]
        - **Explication** : [Analyse + exemple concret avec chiffres]
        - **Impact sur [Nom]** : [Conséquences]
        - **Recommandation DPAI** : [Solution concrète]

        ### 2️⃣ **Pouvoir de négociation des fournisseurs**
        - **Niveau** : [Élevé/Modéré/Faible]
        - **Explication** : [Analyse + exemple concret]
        - **Impact sur [Nom]** : [Conséquences]
        - **Recommandation DPAI** : [Solution]

        ### 3️⃣ **Menace des nouveaux entrants**
        - **Niveau** : [Élevé/Modéré/Faible]
        - **Barrières** : [Liste des barrières (brevets, capital, etc.)]
        - **Risque pour [Nom]** : [Analyse]
        - **Recommandation DPAI** : [Solution]

        ### 4️⃣ **Menace des produits de substitution**
        - **Niveau** : [Élevé/Modéré/Faible]
        - **Alternatives** : [Liste]
        - **Impact** : [Analyse]
        - **Recommandation DPAI** : [Solution]

        ### 5️⃣ **Intensité de la rivalité**
        - **Niveau** : [Élevé/Modéré/Faible]
        - **Concurrence directe** : [Liste des principaux concurrents]
        - **Facteurs de différenciation** : [Pour [Nom]]
        - **Recommandation DPAI** : [Solution]

        **Synthèse :**
        - **Force concurrentielle globale** : [Élevée/Modérée/Faible]
        - **Atouts de [Nom]** : [Top 3]
        - **Risques majeurs** : [Top 3]

        **Prochaines étapes :**
        - [Action 1]
        - [Action 2]`,

    pestel: (companyData) => `
        ${DPAI_CONTEXT_AI}

        **Mission :**
        Analyse **PESTEL** pour cette entreprise, en identifiant les facteurs politiques, économiques, socioculturels, technologiques, environnementaux et légaux.

        **Données :**
        - **Secteur** : ${companyData.sector || 'Non spécifié'}
        - **Pays** : France
        - **Contexte** : ${companyData.context || 'Analyse stratégique'}

        **Format attendu :**
        ## 📊 Analyse PESTEL pour [Nom] (Secteur : [Secteur])

        ### 🏛️ **Politique**
        - **Impact** : [Favorable/Neutre/Négatif]
        - **Analyse** : [Détails avec exemples français]
        - **Recommandation** : [Action concrète]

        ### 💰 **Économique**
        - **Impact** : [Favorable/Neutre/Négatif]
        - **Analyse** : [Détails avec chiffres du marché français]
        - **Recommandation** : [Action concrète]

        ### 👥 **Socioculturel**
        - **Impact** : [Favorable/Neutre/Négatif]
        - **Analyse** : [Détails avec tendances françaises]
        - **Recommandation** : [Action concrète]

        ### 💻 **Technologique**
        - **Impact** : [Favorable/Neutre/Négatif]
        - **Analyse** : [Détails avec innovations sectorielles]
        - **Recommandation** : [Action concrète]

        ### 🌍 **Environnemental**
        - **Impact** : [Favorable/Neutre/Négatif]
        - **Analyse** : [Détails avec réglementations françaises/EU]
        - **Recommandation** : [Action concrète]

        ### ⚖️ **Légal**
        - **Impact** : [Favorable/Neutre/Négatif]
        - **Analyse** : [Détails avec cadre légal français/EU]
        - **Recommandation** : [Action concrète]

        **Synthèse :**
        - **Opportunités majeures** : [Top 3]
        - **Risques majeurs** : [Top 3]

        **Prochaines étapes :**
        - [Action 1]
        - [Action 2]`,

    competitive: (companyData) => `
        ${DPAI_CONTEXT_AI}

        **Mission :**
        Analyse concurrentielle détaillée pour cette entreprise.

        **Données :**
        - **Entreprise** : ${companyData.name || 'Non spécifié'}
        - **Secteur** : ${companyData.sector || 'Non spécifié'}
        - **Principaux concurrents** : ${companyData.competitors || 'Non spécifiés'}

        **Format attendu :**
        ## 📊 Analyse Concurrentielle pour [Nom]

        ### 🎯 **Positionnement Concurrentiel**
        - **Part de marché** : [Chiffre estimé]
        - **Avantages concurrentiels** : [Liste avec détails]
        - **Points faibles vs concurrents** : [Liste avec détails]

        ### 📊 **Benchmark**
        | Critère | [Nom] | Concurrent 1 | Concurrent 2 | Concurrent 3 |
        |---------|-------|-------------|-------------|-------------|
        | Prix | [Valeur] | [Valeur] | [Valeur] | [Valeur] |
        | Qualité | [Valeur] | [Valeur] | [Valeur] | [Valeur] |
        | Fonctionnalités | [Valeur] | [Valeur] | [Valeur] | [Valeur] |

        ### 💡 **Recommandations DPAI**
        1. [Recommandation 1] → **Action** : [Détails]
        2. [Recommandation 2] → **Action** : [Détails]
        3. [Recommandation 3] → **Action** : [Détails]

        **Prochaines étapes :**
        - [Action 1]
        - [Action 2]`
};

// Classe pour gérer les analyses avec IA
class AIAnalysisManager {
    
    static MISTRAL_API_KEY = typeof MISTRAL_API_KEY !== 'undefined' ? MISTRAL_API_KEY : (typeof window !== 'undefined' && window.MISTRAL_API_KEY) || "mstrl_OUgXuc71KYyO2QoWZ8h0okTn14wCYUnG_20gLSU";
    static MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
    
    // Vérifier si l'utilisateur a accès à l'IA
    static canUseAI() {
        if (typeof TokenManager === 'undefined' || !TokenManager.tokenState) {
            return false;
        }
        const plan = TokenManager.tokenState.plan || 'free';
        return plan === 'api_monthly' || plan === 'advisor';
    }
    
    // Vérifier si l'utilisateur a des tokens illimités
    static hasUnlimitedTokens() {
        if (typeof TokenManager === 'undefined' || !TokenManager.tokenState) {
            return false;
        }
        return TokenManager.isTokensUnlimited && TokenManager.isTokensUnlimited();
    }
    
    // Appeler Mistral API
    static async callMistral(prompt, model = "mistral-large") {
        try {
            const response = await fetch(this.MISTRAL_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.MISTRAL_API_KEY}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3,
                    max_tokens: 2000
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erreur Mistral API');
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('❌ Erreur Mistral:', error);
            throw error;
        }
    }
    
    // Exécuter une analyse avec IA
    static async executeWithAI(type, companyData) {
        // Vérifier si l'utilisateur a accès à l'IA
        if (!this.canUseAI()) {
            console.log('[AIAnalysis] Utilisateur n\'a pas accès à l\'IA, utilisation de l\'analyse classique');
            return null; // Signale que l'IA n'est pas disponible
        }
        
        // Vérifier si l'abonnement est expiré
        if (TokenManager.isExpired && TokenManager.isExpired()) {
            throw new Error('Votre abonnement a expiré. Veuillez le renouveler.');
        }
        
        // Récupérer le prompt pour ce type d'analyse
        const promptFunction = ANALYSIS_PROMPTS[type];
        if (!promptFunction) {
            console.warn(`[AIAnalysis] Aucun prompt défini pour le type: ${type}`);
            return null;
        }
        
        // Générer le prompt
        const prompt = promptFunction(companyData);
        
        // Appeler Mistral
        const response = await this.callMistral(prompt);
        
        // Déduire les tokens si l'utilisateur n'a pas des tokens illimités (seul advisor a illimité)
        if (!this.hasUnlimitedTokens() && typeof TokenManager !== 'undefined') {
            const tokenCost = AnalysisCosts[`ai_${type}`] || 100;
            try {
                await TokenManager.useTokens(tokenCost, `ai_${type}`);
            } catch (error) {
                console.warn('[AIAnalysis] Impossible de déduire les tokens:', error.message);
                // Continuer quand même, l'analyse est déjà faite
            }
        }
        
        return response;
    }
}

// Modifier la classe Analysis pour intégrer l'IA
const originalExecute = Analysis.prototype.execute;
Analysis.prototype.execute = async function() {
    // Vérifier si on peut utiliser l'IA pour cette analyse
    if (AIAnalysisManager.canUseAI() && ANALYSIS_PROMPTS[this.type]) {
        try {
            const aiResult = await AIAnalysisManager.executeWithAI(this.type, this.companyData);
            if (aiResult) {
                // Si l'IA a retourné un résultat, l'utiliser
                this.results = this.parseAIResult(aiResult);
                this.status = 'completed';
                this.generateRecommendations();
                this.calculateScore();
                return this;
            }
        } catch (error) {
            console.warn('[Analysis] IA non disponible, utilisation de l\'analyse classique:', error.message);
        }
    }
    
    // Si IA pas disponible ou erreur, utiliser l'analyse classique
    return originalExecute.call(this);
};

// Méthode pour parser le résultat de l'IA
Analysis.prototype.parseAIResult = function(aiText) {
    // Par défaut, retourner le texte brut
    // Les classes spécifiques peuvent override cette méthode
    return {
        aiAnalysis: aiText,
        source: 'ai'
    };
};

// Rendre les fonctions disponibles globalement
window.AnalysisManager = AnalysisManager;
window.executeAnalysis = executeAnalysis;
window.AIAnalysisManager = AIAnalysisManager;
window.ANALYSIS_PROMPTS = ANALYSIS_PROMPTS;
window.generateMockResults = generateMockResults;