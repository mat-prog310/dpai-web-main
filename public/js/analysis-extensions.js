/* =============================================================================
   DPAI - Outils etendus : Croissance Externe (M&A) & Diagnostic Interne
   10 nouveaux outils generant des donnees structurees (scores, listes, grilles)
   Ces donnees peuvent etre injectees dans les prompts du Conseiller IA.
   Charge APRES analysis-generator.js ; branche via window.generateExtendedAnalysis
   ============================================================================= */

(function () {
    'use strict';

    function getSectorDataSafe(sector) {
        try {
            if (window.AnalysisGenerator && typeof window.AnalysisGenerator.getSectorData === 'function') {
                return window.AnalysisGenerator.getSectorData(sector) || {};
            }
        } catch (e) { /* ignore */ }
        return {};
    }

    function num(v, def) { var n = parseFloat(v); return isNaN(n) ? def : n; }
    function boolText(v) { return typeof v === 'string' && v.toLowerCase().indexOf('oui') !== -1; }
    function clamp(n) { return Math.min(100, Math.max(0, Math.round(n))); }
    function fmtEur(n) {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.round(n));
    }

    /* 1. SCREENING DE CIBLES */
    function generateTargetScreening(data) {
        var sectorInfo = getSectorDataSafe(data.targetSector || data.sector);
        var targetSize = num(data.targetSize, 0);
        var budget = num(data.budget, 0);
        var geoZone = data.geoZone || 'France';

        var growthOk = sectorInfo && sectorInfo.growthRate;
        var sizeBudgetScore = 50;
        if (targetSize > 0 && budget > 0) {
            var mult = sectorInfo && sectorInfo.ebitdaMultiple ? (parseFloat(sectorInfo.ebitdaMultiple) || 6) : 6;
            sizeBudgetScore = targetSize * mult <= budget ? 90 : 45;
        }
        var criteria = [
            { label: 'Adequation sectorielle', weight: 25, score: growthOk ? 75 : 55, comment: growthOk ? 'Secteur en croissance ' + sectorInfo.growthRate : 'Secteur a documenter' },
            { label: 'Taille de cible vs budget', weight: 25, score: sizeBudgetScore, comment: targetSize > 0 && budget > 0 ? 'Budget ' + fmtEur(budget) + ' pour CA cible ' + fmtEur(targetSize) : 'Definir budget et taille' },
            { label: 'Attractivite geographique', weight: 20, score: geoZone.toLowerCase().indexOf('france') !== -1 ? 80 : 65, comment: 'Zone : ' + geoZone },
            { label: 'Synergies potentielles', weight: 20, score: data.synergies ? 75 : 50, comment: data.synergies ? 'Synergies definies' : 'Synergies a preciser' },
            { label: 'Barrieres a lentree', weight: 10, score: sectorInfo && sectorInfo.barriersToEntry ? (String(sectorInfo.barriersToEntry).indexOf('Faible') === 0 ? 70 : 55) : 55, comment: sectorInfo && sectorInfo.barriersToEntry ? 'Barrieres : ' + sectorInfo.barriersToEntry : 'A evaluer' }
        ];
        var globalScore = clamp(criteria.reduce(function (s, c) { return s + c.weight * c.score / 100; }, 0));

        var firstContactQuestions = [
            'Pourquoi le dirigeant envisage-t-il une cession maintenant ?',
            'Quelle est la repartition du CA entre clients (dependance) ?',
            'Quelle est la structure actionnariale et qui decide ?',
            'Quels sont les 3 principaux contrats et leurs echeances ?',
            'Y a-t-il des litiges, garanties ou engagements hors bilan ?',
            'Quelle est la pyramide des ages des equipes et competences cles ?'
        ];

        return {
            summary: 'Grille de scoring pour cibles ' + (data.targetSector || 'a definir') + ' - Score d attractivite : ' + globalScore + '/100',
            context: 'Screening de cibles base sur les criteres de ciblage definis.',
            score: globalScore,
            criteria: criteria,
            firstContactQuestions: firstContactQuestions,
            targetProfile: { sector: data.targetSector || '', size: targetSize, geoZone: geoZone, budget: budget },
            recommendations: [
                globalScore >= 70 ? 'Ciblage pertinent : lancer le sourcing sur ce profil' : 'Affiner les criteres avant de lancer le sourcing',
                'Etablir une long list de 10-20 cibles et appliquer cette grille',
                'Preparer les questions de premier contact avant chaque rendez-vous'
            ]
        };
    }

    /* 2. CHECKLIST PRE-ACQUISITION (Readiness M&A) */
    function generatePreAcquisitionChecklist(data) {
        var budget = num(data.budget, 0);
        var hasTeam = boolText(data.team);
        var ddPlanned = boolText(data.ddPlanned);
        var integrationPlan = boolText(data.integrationPlan);
        var funding = (data.funding || '').toLowerCase();

        var dimensions = [
            { label: 'Capacite financiere', score: clamp(budget >= 1000000 ? 85 : budget >= 100000 ? 65 : 40), gap: budget >= 1000000 ? null : 'Securiser un financement suffisant (dette, fonds propres, LBO)' },
            { label: 'Structure de financement', score: clamp(funding.indexOf('mix') !== -1 ? 80 : funding ? 65 : 45), gap: funding ? null : 'Definir la structure de financement' },
            { label: 'Equipe projet', score: hasTeam ? 85 : 35, gap: hasTeam ? null : 'Constituer une equipe projet dediee (interne + conseils externes)' },
            { label: 'Due diligence prevue', score: ddPlanned ? 85 : 40, gap: ddPlanned ? null : 'Planifier la due diligence (financiere, juridique, humaine)' },
            { label: 'Plan d integration', score: integrationPlan ? 85 : 40, gap: integrationPlan ? null : 'Anticiper le plan d integration post-acquisition' }
        ];
        var score = clamp(dimensions.reduce(function (s, d) { return s + d.score; }, 0) / dimensions.length);
        var gaps = dimensions.filter(function (d) { return d.gap; }).map(function (d) { return { area: d.label, action: d.gap }; });

        return {
            summary: 'Readiness M&A de ' + (data.companyName || 'votre entreprise') + ' - Score de preparation : ' + score + '/100',
            context: 'Evaluation de la preparation a une acquisition.',
            score: score,
            dimensions: dimensions,
            gaps: gaps,
            recommendations: gaps.length === 0 ? ['Vous etes pret : identifier les cibles et lancer le processus'] : gaps.map(function (g) { return g.action; }),
            nextSteps: gaps.length === 0 ? ['Sourcer les cibles', 'Prendre contact avec les dirigeants'] : ['Combler les manques listes', 'Reevaluer dans 3 mois']
        };
    }

    /* 3. SIMULATEUR DE SYNERGIES (post-acquisition) */
    function generateSynergySimulator(data) {
        var acqRev = num(data.acquirerRevenue, 0);
        var tgtRev = num(data.targetRevenue, 0);
        var acqCosts = num(data.acquirerCosts, 0) || acqRev * 0.75;
        var tgtCosts = num(data.targetCosts, 0) || tgtRev * 0.75;
        var combinedRev = acqRev + tgtRev;

        var costSavings = (acqCosts + tgtCosts) * 0.05;
        var crossSelling = combinedRev * 0.03 * 0.35;
        var purchasingPower = (acqCosts + tgtCosts) * 0.015;
        var annualPotential = costSavings + crossSelling + purchasingPower;
        var valuePotential = annualPotential * 6;

        var breakdown = [
            { label: 'Economies d echelle (mutualisation des couts)', value: costSavings },
            { label: 'Cross-selling (ventes croisees)', value: crossSelling },
            { label: 'Pouvoir de negociation (achats, finance)', value: purchasingPower }
        ];

        return {
            summary: 'Synergies estimees ' + (data.companyName || '') + ' + ' + (data.targetName || 'cible') + ' : ' + fmtEur(annualPotential) + '/an, potentiel de valeur ' + fmtEur(valuePotential),
            context: 'Estimation des synergies post-acquisition (couts, cross-selling, echelle).',
            score: clamp(50 + annualPotential / Math.max(1, combinedRev) * 500),
            breakdown: breakdown,
            annualSynergies: annualPotential,
            valuePotential: valuePotential,
            combinedRevenue: combinedRev,
            recommendations: [
                'Chiffrer les synergies au cas par cas dans le business plan d integration',
                'Ne pas integrer 100% des synergies dans le prix d achat (regle : 50-70%)',
                'Nommer un responsable de la capture des synergies des le closing'
            ]
        };
    }

    /* 4. GRILLE DE DUE DILIGENCE HUMAINE */
    function generateHrDueDiligence(data) {
        var employees = num(data.targetEmployees, 0);
        var turnover = num(data.turnover, 10);
        var style = data.managementStyle || 'Inconnu';
        var keyPeople = data.keyPeople || '';

        var checks = [
            { area: 'Style de management', status: style !== 'Inconnu' ? 'A approfondir' : 'A documenter', detail: 'Style declare : ' + style + '. Rencontrer les managers cles individuellement.' },
            { area: 'Turnover', status: turnover > 20 ? 'Alerte' : turnover > 12 ? 'Vigilance' : 'Sain', detail: 'Turnover estime ' + turnover + '% (' + (turnover > 20 ? 'risque de fuite des talents post-acquisition' : 'dans les normes du secteur') + ').' },
            { area: 'Personnes cles', status: keyPeople ? 'A securiser' : 'A identifier', detail: keyPeople ? 'Prevoir des clauses de non-depart et bonus de retention.' : 'Cartographier les competences critiques et leur detention.' },
            { area: 'Alignement vision/valeurs', status: 'A evaluer', detail: 'Organiser des entretiens croises entre dirigeants et equipes cadres.' },
            { area: 'Culture d entreprise', status: 'A evaluer', detail: 'Comparer les pratiques (rituels, decision, teletravail) avec ' + (employees > 50 ? 'une organisation formalisee' : 'une culture fondee sur le dirigeant') + '.' },
            { area: 'Competences cles', status: 'A cartographier', detail: 'Matrice de competences : identifier les single points of failure.' },
            { area: 'Dialogue social', status: 'A verifier', detail: 'Historique des conflits, accords collectifs, IRP actives.' }
        ];
        var alerts = checks.filter(function (c) { return c.status === 'Alerte'; }).length;
        var score = clamp(85 - alerts * 20 - (turnover > 15 ? 10 : 0));

        return {
            summary: 'Due diligence humaine de ' + (data.targetName || 'la cible') + ' - Score culture/equipes : ' + score + '/100',
            context: 'Grille de verification culturelle et humaine de la cible.',
            score: score,
            checks: checks,
            alerts: alerts,
            recommendations: [
                'Ne jamais negliger la due diligence humaine : cause n 1 d echec des integrations',
                'Prevoir un plan de retention des personnes cles avant le closing',
                employees > 50 ? 'Anticiper les obligations liees aux institutions representant le personnel' : 'Prevoir des entretiens individuels avec chaque collaborateur cle'
            ]
        };
    }

    /* 5. PLAN DES 100 PREMIERS JOURS */
    function generatePlan100Days(data) {
        var scope = (data.integrationScope || 'partiel').toLowerCase();
        var objectives = (data.objectives || '').toLowerCase();
        var targetName = data.targetName || 'la cible';

        var phases = [
            {
                phase: 'Jours 1-30 : Stabiliser',
                priorities: [
                    'Annoncer le projet aux equipes des deux entreprises (meme message, meme jour)',
                    'Retenir les personnes cles (entretiens individuels, bonus de retention)',
                    'Cartographier les processus critiques et les dependances clients',
                    'Constituer l equipe d integration (PMO dedie)'
                ],
                kpis: ['Taux de retention des personnes cles (%)', 'Score de climat social (enquete flash)', 'Nombre de reunions d equipe tenues']
            },
            {
                phase: 'Jours 31-60 : Aligner',
                priorities: [
                    'Valider l organigramme cible et les roles',
                    'Aligner les processus commerciaux et le pipeline clients',
                    scope.indexOf('complet') !== -1 ? 'Lancer l harmonisation des outils et SI' : 'Identifier les quick wins operationnels',
                    'Definir les rituels de communication (comite hebdo, newsletter)'
                ],
                kpis: ['Pipeline commercial unifie (EUR)', 'Taux d adoption des nouveaux processus (%)', 'Nombre de quick wins livres']
            },
            {
                phase: 'Jours 61-100 : Accelerer',
                priorities: [
                    'Livrer les 3 premiers quick wins visibles par tous',
                    objectives.indexOf('synerg') !== -1 ? 'Lancer le plan de capture des synergies' : 'Fixer les objectifs de performance annee 1',
                    'Formaliser le plan d integration 12 mois (suite des 100 jours)',
                    'Revue de performance avec les managers cles'
                ],
                kpis: ['Quick wins livres / planifies', 'EBITDA pro-forma vs budget', 'Turnover cumule depuis closing']
            }
        ];

        return {
            summary: 'Plan des 100 premiers jours pour l integration de ' + targetName + ' (perimetre : ' + scope + ')',
            context: 'Roadmap d integration post-acquisition structuree en 3 phases.',
            score: 80,
            phases: phases,
            communicationRituals: [
                'Comite d integration hebdomadaire (dirigeants + PMO)',
                'Point d equipe mensuel en presentiel dans chaque entite',
                'Newsletter integration bimensuelle',
                'Session questions/reponses ouverte tous les 15 jours'
            ],
            recommendations: [
                'Les 100 premiers jours sont decisifs : surcommuniquer plutot que sous-communiquer',
                'Prioriser la retention des personnes cles avant tout le reste',
                'Fixer des KPI mesurables des le jour 1 et les suivre chaque semaine'
            ]
        };
    }

    /* 6. AUTO-DIAGNOSTIC INTERNE */
    function generateSelfDiagnostic(data) {
        var employees = num(data.employees, 0);
        var revenue = num(data.revenue, 0);
        var margin = num(data.margin, 8);
        var sectorInfo = getSectorDataSafe(data.sector);

        var dimensions = [
            { label: 'Ressources humaines', score: clamp(40 + Math.min(30, employees) + (data.hrResources ? 20 : 0)), strengths: employees > 10 ? 'Equipe en place' : null, weaknesses: employees <= 10 ? 'Effectif reduit : dependance aux fondateurs' : null },
            { label: 'Ressources financieres', score: clamp(35 + margin * 2 + (revenue > (sectorInfo.avgRevenue || 1000000) ? 20 : 0)), strengths: margin > 10 ? 'Marge saine' : null, weaknesses: margin < 5 ? 'Marge faible : capacite d investissement limitee' : null },
            { label: 'Ressources materielles', score: clamp(50 + (revenue > 1000000 ? 15 : 0)), strengths: null, weaknesses: 'Etat des equipements/outils a auditer' },
            { label: 'Ressources immaterielles', score: clamp(data.intangibleAssets ? 70 : 40), strengths: data.intangibleAssets ? 'Actifs immateriels documentes (marque, process, clientele)' : null, weaknesses: data.intangibleAssets ? null : 'Marque/brevets/process non formalises' }
        ];
        var score = clamp(dimensions.reduce(function (s, d) { return s + d.score; }, 0) / dimensions.length);

        return {
            summary: 'Auto-diagnostic interne de ' + (data.companyName || 'votre entreprise') + ' - Score global : ' + score + '/100',
            context: 'Diagnostic des ressources et competences internes (alimente le SWOT).',
            score: score,
            dimensions: dimensions,
            strengths: dimensions.filter(function (d) { return d.strengths; }).map(function (d) { return d.strengths; }),
            weaknesses: dimensions.filter(function (d) { return d.weaknesses; }).map(function (d) { return d.weaknesses; }),
            swotFeed: {
                strengths: dimensions.filter(function (d) { return d.strengths; }).map(function (d) { return d.label + ' : ' + d.strengths; }),
                weaknesses: dimensions.filter(function (d) { return d.weaknesses; }).map(function (d) { return d.label + ' : ' + d.weaknesses; })
            },
            recommendations: [
                score < 55 ? 'Consolider les fondamentaux internes avant une croissance externe' : 'Base interne solide : la croissance externe est envisageable',
                'Formaliser les processus et actifs immateriels (valorisation a la revente)',
                'Completer avec une analyse SWOT pour consolider le positionnement'
            ]
        };
    }

    /* 7. ANALYSE DE LA CHAINE DE VALEUR */
    function generateValueChain(data) {
        var primary = (data.primaryActivities || '').split(/[;\n]/).map(function (s) { return s.trim(); }).filter(Boolean);
        var support = (data.supportActivities || '').split(/[;\n]/).map(function (s) { return s.trim(); }).filter(Boolean);
        var mainCosts = num(data.mainCosts, 0);
        var sectorInfo = getSectorDataSafe(data.sector);

        var valueActivities = primary.map(function (act, i) {
            var lower = act.toLowerCase();
            return {
                activity: act,
                type: 'Principale',
                valueContribution: clamp(75 - i * 8),
                efficiency: clamp(60 + (i % 3) * 10),
                comment: (lower.indexOf('vent') !== -1 || lower.indexOf('commerc') !== -1) ? 'Activite creatrice de valeur : a renforcer' : 'A auditer pour gains d efficacite'
            };
        });
        var supportActivities = support.map(function (act, i) {
            return {
                activity: act,
                type: 'Soutien',
                valueContribution: clamp(45 + i * 5),
                efficiency: clamp(55 + (i % 4) * 8),
                comment: 'Potentiel de mutualisation/externalisation a etudier'
            };
        });

        return {
            summary: 'Chaine de valeur de ' + (data.companyName || 'votre entreprise') + ' : ' + primary.length + ' activites principales, ' + support.length + ' activites de soutien',
            context: 'Decomposition des activites principales et de soutien (Porter).',
            score: valueActivities.length ? clamp(valueActivities.reduce(function (s, a) { return s + a.efficiency; }, 0) / valueActivities.length) : 60,
            primaryActivities: valueActivities,
            supportActivities: supportActivities,
            costFocus: mainCosts > 0 ? 'Poste de couts principal analyse : ' + fmtEur(mainCosts) : null,
            recommendations: [
                'Prioriser les investissements sur les activites a forte contribution de valeur',
                'Externaliser ou mutualiser les activites de soutien a faible efficacite',
                sectorInfo.avgMargin ? 'Marge moyenne du secteur ' + sectorInfo.avgMargin + ' : comparer vos postes de couts' : 'Benchmarker vos couts avec le secteur'
            ]
        };
    }

    /* 8. MATRICE DE PRIORISATION (Impact / Effort) */
    function generateActionMatrix(data) {
        var actions = (data.actions || '').split(/[;\n]/).map(function (s) { return s.trim(); }).filter(Boolean);
        var goal = data.strategicGoal || '';
        var goalWord = goal ? goal.toLowerCase().split(' ')[0] : '';

        var keywordsHighImpact = ['client', 'vente', 'marge', 'croissance', 'offre', 'recrute', 'digit', 'process', 'automat'];
        var matrix = actions.map(function (action, i) {
            var lower = action.toLowerCase();
            var impact = clamp(55 + keywordsHighImpact.reduce(function (s, k) { return s + (lower.indexOf(k) !== -1 ? 12 : 0); }, 0) + (goalWord && lower.indexOf(goalWord) !== -1 ? 10 : 0));
            var effort = clamp(35 + (i % 4) * 15 + (lower.indexOf('digit') !== -1 || lower.indexOf('si ') !== -1 ? 20 : 0));
            var quadrant = impact >= 60 ? (effort >= 60 ? 'Projets majeurs (fort impact, gros effort)' : 'Quick wins (fort impact, faible effort)') : (effort >= 60 ? 'A eviter (faible impact, gros effort)' : 'Remplissages (faible impact, faible effort)');
            return { action: action, impact: impact, effort: effort, quadrant: quadrant };
        });
        matrix.sort(function (a, b) { return (b.impact - b.effort) - (a.impact - a.effort); });

        return {
            summary: matrix.length + ' actions priorisees' + (goal ? ' par rapport a l objectif : ' + goal : ''),
            context: 'Matrice Impact / Effort pour structurer le plan d action interne.',
            score: 75,
            matrix: matrix,
            priorityOrder: matrix.map(function (m, i) { return (i + 1) + '. ' + m.action + ' (impact ' + m.impact + ', effort ' + m.effort + ')'; }),
            recommendations: [
                'Commencer par les Quick wins : visibilite rapide et confiance de l equipe',
                'Planifier les Projets majeurs avec des jalons et des ressources dediees',
                'Eliminer ou differer les actions a faible impact et gros effort'
            ]
        };
    }

    /* 9. DIAGNOSTIC DE PREPARATION A LA CROISSANCE */
    function generateGrowthReadiness(data) {
        var processes = num(data.processes, 40);
        var it = (data.itSystem || '').toLowerCase();
        var team = boolText(data.managementTeam);
        var revenue = num(data.revenue, 0);
        var employees = num(data.employees, 0);

        var itScore = it.indexOf('oui') === 0 ? 80 : it.indexOf('partiel') === 0 ? 55 : 35;
        var foundations = [
            { label: 'Processus internes', score: clamp(processes), gap: processes < 60 ? 'Documenter les processus cles (objectif : 70%)' : null },
            { label: 'Systeme d information', score: clamp(itScore), gap: it.indexOf('oui') !== 0 ? 'Structurer le SI (ERP/CRM) pour absorber la croissance' : null },
            { label: 'Equipe de management', score: team ? 80 : 40, gap: team ? null : 'Renforcer l equipe de management (deleguer le quotidien)' },
            { label: 'Capacite financiere', score: clamp(revenue > 2000000 ? 75 : revenue > 500000 ? 55 : 35), gap: revenue <= 500000 ? 'Consolider la rentabilite avant de diversifier' : null },
            { label: 'Taille et structure', score: clamp(employees >= 20 ? 75 : 50), gap: employees < 20 ? 'Structurer les fonctions support avant une acquisition' : null }
        ];
        var score = clamp(foundations.reduce(function (s, f) { return s + f.score; }, 0) / foundations.length);
        var gaps = foundations.filter(function (f) { return f.gap; }).map(function (f) { return { area: f.label, action: f.gap }; });

        return {
            summary: 'Preparation a la croissance de ' + (data.companyName || 'votre entreprise') + ' - Score : ' + score + '/100',
            context: 'Fondations internes necessaires pour soutenir une croissance externe.',
            score: score,
            foundations: foundations,
            gaps: gaps,
            ready: score >= 65 && gaps.length <= 1,
            recommendations: score >= 65
                ? ['Fondations solides : la croissance externe peut etre engagee', 'Maintenir l excellence operationnelle pendant le processus']
                : ['Combler les manques listes avant de vous lancer', 'Refaire ce diagnostic apres 3-6 mois de travail interne']
        };
    }

    /* 10. SIMULATEUR D IMPACT ORGANISATIONNEL */
    function generateOrgImpact(data) {
        var employees = num(data.employees, 0);
        var revenue = num(data.revenue, 0);
        var margin = num(data.margin, 8);
        var type = data.decisionType || 'Autre';
        var decision = (data.decision || '').toLowerCase();

        var profiles = {
            'Nouvelle offre': { rev: 0.08, prod: 3, mgmt: 8, margin: 1 },
            'Reorganisation': { rev: -0.02, prod: 8, mgmt: 15, margin: 1.5 },
            'Recrutement': { rev: 0.05, prod: 4, mgmt: -5, margin: -0.5 },
            'Investissement': { rev: 0.06, prod: 6, mgmt: 5, margin: -1 }
        };
        var p = profiles[type] || { rev: 0.03, prod: 3, mgmt: 5, margin: 0.5 };
        if (decision.indexOf('digit') !== -1 || decision.indexOf('automat') !== -1) { p.prod += 4; }

        var revAfter = revenue * (1 + p.rev / 100);
        var prodBefore = employees ? revenue / employees : 0;
        var prodAfter = employees ? revAfter / employees : 0;
        var impacts = [
            { kpi: 'Chiffre d affaires (12 mois)', before: revenue, after: revAfter, delta: revAfter - revenue, unit: 'EUR' },
            { kpi: 'Marge nette', before: margin, after: margin + p.margin, delta: p.margin, unit: '%' },
            { kpi: 'Productivite (CA/employe)', before: prodBefore, after: prodAfter, delta: prodAfter - prodBefore, unit: 'EUR' },
            { kpi: 'Charge manageriale (temps de direction)', before: 100, after: 100 + p.mgmt, delta: p.mgmt, unit: '%' }
        ];

        return {
            summary: 'Impact estime de la decision (' + type + ') sur ' + (data.companyName || 'votre entreprise') + ' : ' + (impacts[0].delta >= 0 ? '+' : '') + fmtEur(impacts[0].delta) + ' de CA sur 12 mois',
            context: 'Lien entre decision interne et consequences chiffrees (KPI internes).',
            score: clamp(60 + p.rev * 5 + p.prod),
            decisionType: type,
            impacts: impacts,
            recommendations: [
                'Valider les hypotheses avec un pilote a petite echelle avant de generaliser',
                'Suivre les KPI impactes mensuellement pendant 6 mois',
                p.mgmt > 10 ? 'Charge manageriale en forte hausse : prevoir du soutien temporaire a la direction' : 'Surveiller la charge manageriale pendant la transition'
            ]
        };
    }

    /* REGISTRE ET EXPORT */
    var EXTENDED_GENERATORS = {
        target_screening: generateTargetScreening,
        pre_acquisition_checklist: generatePreAcquisitionChecklist,
        synergy_simulator: generateSynergySimulator,
        hr_due_diligence: generateHrDueDiligence,
        plan_100_days: generatePlan100Days,
        self_diagnostic: generateSelfDiagnostic,
        value_chain: generateValueChain,
        action_matrix: generateActionMatrix,
        growth_readiness: generateGrowthReadiness,
        org_impact_simulator: generateOrgImpact
    };

    window.EXTENDED_ANALYSIS_TYPES = Object.keys(EXTENDED_GENERATORS);

    window.generateExtendedAnalysis = function (type, data) {
        var normalizedType = String(type || '').toLowerCase().trim();
        var fn = EXTENDED_GENERATORS[normalizedType];
        if (!fn) {
            var companyName = data.companyName || 'votre entreprise';
            return { summary: 'Analyse ' + type + ' pour ' + companyName, context: 'Analyse personnalisee.', recommendations: ['Completer les informations'], score: 50 };
        }
        return fn(data);
    };

    console.log('%c[Analysis-Extensions] 10 outils etendus charges (croissance externe + diagnostic interne)', 'color: #17a2b8; font-weight: bold;');
})();
