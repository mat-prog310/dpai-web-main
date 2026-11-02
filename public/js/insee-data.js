// =============================================================================
// INSEE-DATA.JS - Données sectorielles INSEE pour les analyses DPAI
// Contient les benchmarks sectoriels français basés sur les données INSEE, Banque de France, Xerfi
// =============================================================================

// Mapping entre les noms de secteurs courants et les codes NAF INSEE
const SECTOR_NAF_MAPPING = {
    // Technologie
    'technologie': '62.01Z',
    'tech': '62.01Z',
    'it': '62.01Z',
    'informatique': '62.01Z',
    'logiciel': '62.01Z',
    'logiciels': '62.01Z',
    'saas': '62.01Z',
    'editeur logiciel': '62.01Z',
    'editeurs de logiciels': '62.01Z',
    'esn': '62.01Z',
    'ssii': '62.01Z',
    
    // Conseil
    'conseil': '70.22Z',
    'conseil en gestion': '70.22Z',
    'conseil stratégique': '70.22Z',
    'cabinet de conseil': '70.22Z',
    'consulting': '70.22Z',
    'conseil en organisation': '70.22Z',
    
    // Santé
    'santé': '86',
    'sante': '86',
    'pharmacie': '21.20Z',
    'pharmaceutical': '21.20Z',
    'médical': '86',
    'medical': '86',
    'biotech': '21.20Z',
    'biotechnologie': '21.20Z',
    'hôpital': '86.10Z',
    'hopital': '86.10Z',
    'cliniques': '86.10Z',
    
    // Finance
    'finance': '64',
    'banque': '64.19Z',
    'banques': '64.19Z',
    'assurance': '65',
    'assurances': '65',
    'fintech': '64.19Z',
    'gestion de patrimoine': '66.19B',
    'credit': '64.19Z',
    
    // Industrie
    'industrie': 'C',
    'industrielle': 'C',
    'manufacturière': 'C',
    'manufacturiere': 'C',
    'manufacturing': 'C',
    'automobile': '29',
    'aéronautique': '30.30Z',
    'aeronautique': '30.30Z',
    'mécanique': '28',
    'mecanique': '28',
    'agroalimentaire': '10',
    'agro-alimentaire': '10',
    
    // Retail / Distribution
    'retail': '47',
    'distribution': '47',
    'commerce': '47',
    'e-commerce': '47.91B',
    'ecommerce': '47.91B',
    'grande distribution': '47.11C',
    'supermarché': '47.11C',
    'supermarche': '47.11C',
    
    // Énergie
    'énergie': '35',
    'energie': '35',
    'électricité': '35.11Z',
    'electricite': '35.11Z',
    'gaz': '35.22Z',
    'pétrole': '19.20Z',
    'petrole': '19.20Z',
    'renouvelables': '35.13Z',
    'enr': '35.13Z',
    
    // Immobilier
    'immobilier': '68',
    'construction': '41',
    'bâtiment': '41',
    'batiment': '41',
    'promotion immobilière': '41.10A',
    'promotion immobiliere': '41.10A',
    
    // Autres services
    'tourisme': '79',
    'restauration': '56',
    'hotellerie': '55',
    'hotellerie-restauration': '55',
    'media': '58',
    'médias': '58',
    'publicité': '73.11Z',
    'publicite': '73.11Z',
    
    // Transport / Logistique
    'transport': '49',
    'logistique': '52',
    'messagerie': '53.20Z',
    
    // BTP
    'btp': '43',
    'travaux publics': '42',
    
    // Chimie
    'chimie': '20',
    'pharmacie chimique': '21',
    
    // Luxe
    'luxe': '15.20Z',
    
    // Télécoms
    'télécoms': '61',
    'telecoms': '61',
    'télécommunications': '61',
    'telecommunications': '61'
};

// Données sectorielles détaillées basées sur INSEE 2023-2024
const INSEE_SECTOR_DATA = {
    // ========== TECHNOLOGIE ==========
    '62.01Z': {
        nafCode: '62.01Z',
        name: 'Programmation informatique',
        sector: 'Technologie/IT',
        description: 'Édition de logiciels système et applicatifs',
        
        // Données financières (moyennes secteur France)
        avgRevenue: 2500000,        // CA moyen en €
        medianRevenue: 1200000,
        avgEbitda: 450000,         // EBITDA moyen en €
        avgEbitdaMargin: 0.18,     // Marge EBITDA (18%)
        avgGrossMargin: 0.65,      // Marge brute
        avgNetMargin: 0.12,        // Marge nette
        
        // Croissance
        growthRate2023: 0.085,     // 8.5%
        growthRate5yr: 0.10,       // 10% sur 5 ans
        forecastGrowth: 0.09,     // Prévisions 2024-2025
        
        // Ratios de valorisation
        ebitdaMultipleLow: 8,
        ebitdaMultipleMid: 12,
        ebitdaMultipleHigh: 18,
        revenueMultipleLow: 1.5,
        revenueMultipleMid: 2.5,
        revenueMultipleHigh: 4.0,
        
        // Structure financière
        avgDebtToEquity: 0.3,
        avgCurrentRatio: 1.8,
        avgROE: 0.20,
        avgROI: 0.25,
        
        // Ressources humaines
        avgEmployees: 15,
        revenuePerEmployee: 180000,
        
        // Porter 5 Forces
        supplierPower: 'Faible',
        buyerPower: 'Moyenne',
        threatNewEntrants: 'Élevée',
        threatSubstitutes: 'Moyenne',
        rivalry: 'Élevée',
        barriersToEntry: 'Élevées',
        
        // Concurrence
        competitionLevel: 'Élevée',
        numCompetitors: 'Nombreux',
        marketConcentration: 'Fragmenté',
        
        // Spécificités
        rndIntensity: 0.15,       // 15% du CA en R&D
        exportRate: 0.30,         // 30% du CA à l'export
        digitalMaturity: 0.90,
        
        // Risques
        keyRisks: [
            'Concurrence internationale intense',
            'Évolution rapide des technologies',
            'Pénurie de talents qualifiés',
            'Cybersécurité et protection des données'
        ]
    },
    
    // ========== CONSEIL ==========
    '70.22Z': {
        nafCode: '70.22Z',
        name: 'Conseil pour les affaires et autres conseils de gestion',
        sector: 'Conseil',
        description: 'Activités de conseil en gestion, stratégie et organisation',
        
        avgRevenue: 3500000,
        medianRevenue: 1500000,
        avgEbitda: 650000,
        avgEbitdaMargin: 0.22,
        avgGrossMargin: 0.60,
        avgNetMargin: 0.10,
        
        growthRate2023: 0.075,
        growthRate5yr: 0.08,
        forecastGrowth: 0.07,
        
        ebitdaMultipleLow: 6,
        ebitdaMultipleMid: 10,
        ebitdaMultipleHigh: 14,
        revenueMultipleLow: 0.8,
        revenueMultipleMid: 1.2,
        revenueMultipleHigh: 1.8,
        
        avgDebtToEquity: 0.2,
        avgCurrentRatio: 1.5,
        avgROE: 0.18,
        avgROI: 0.22,
        
        avgEmployees: 25,
        revenuePerEmployee: 150000,
        
        supplierPower: 'Faible',
        buyerPower: 'Élevée',
        threatNewEntrants: 'Faible',
        threatSubstitutes: 'Moyenne',
        rivalry: 'Élevée',
        barriersToEntry: 'Faibles',
        
        competitionLevel: 'Élevée',
        numCompetitors: 'Nombreux (Big 4 + indépendants)',
        marketConcentration: 'Modérément concentré',
        
        rndIntensity: 0.05,
        exportRate: 0.20,
        digitalMaturity: 0.85,
        
        keyRisks: [
            'Dépendance aux compétences des consultants',
            'Concurrence des grands cabinets internationaux',
            'Sensibilité à la conjoncture économique',
            'Guerre des talents'
        ]
    },
    
    // ========== SANTÉ / PHARMACIE ==========
    '21.20Z': {
        nafCode: '21.20Z',
        name: 'Fabrication de préparations pharmaceutiques',
        sector: 'Santé/Pharmacie',
        description: 'Industrie pharmaceutique',
        
        avgRevenue: 50000000,
        medianRevenue: 20000000,
        avgEbitda: 12000000,
        avgEbitdaMargin: 0.25,
        avgGrossMargin: 0.70,
        avgNetMargin: 0.15,
        
        growthRate2023: 0.065,
        growthRate5yr: 0.05,
        forecastGrowth: 0.06,
        
        ebitdaMultipleLow: 12,
        ebitdaMultipleMid: 15,
        ebitdaMultipleHigh: 20,
        revenueMultipleLow: 2.5,
        revenueMultipleMid: 3.5,
        revenueMultipleHigh: 5.0,
        
        avgDebtToEquity: 0.4,
        avgCurrentRatio: 2.0,
        avgROE: 0.25,
        avgROI: 0.30,
        
        avgEmployees: 100,
        revenuePerEmployee: 500000,
        
        supplierPower: 'Moyen',
        buyerPower: 'Faible',
        threatNewEntrants: 'Faible',
        threatSubstitutes: 'Faible',
        rivalry: 'Modérée',
        barriersToEntry: 'Très élevées',
        
        competitionLevel: 'Modérée',
        numCompetitors: 'Peu (oligopole)',
        marketConcentration: 'Très concentré',
        
        rndIntensity: 0.25,
        exportRate: 0.60,
        digitalMaturity: 0.75,
        
        keyRisks: [
            'Réglementation très stricte',
            'Coûts de R&D élevés',
            'Dépendance aux brevets',
            'Risques de contentieux sanitaires'
        ]
    },
    '86': {
        nafCode: '86',
        name: 'Activités pour la santé humaine',
        sector: 'Santé',
        description: 'Hôpitaux, cliniques, soins médicaux',
        
        avgRevenue: 8000000,
        medianRevenue: 3000000,
        avgEbitda: 1500000,
        avgEbitdaMargin: 0.20,
        avgGrossMargin: 0.50,
        avgNetMargin: 0.08,
        
        growthRate2023: 0.045,
        growthRate5yr: 0.04,
        forecastGrowth: 0.05,
        
        ebitdaMultipleLow: 8,
        ebitdaMultipleMid: 12,
        ebitdaMultipleHigh: 16,
        revenueMultipleLow: 1.0,
        revenueMultipleMid: 1.5,
        revenueMultipleHigh: 2.0,
        
        avgDebtToEquity: 0.6,
        avgCurrentRatio: 1.2,
        avgROE: 0.15,
        avgROI: 0.18,
        
        avgEmployees: 50,
        revenuePerEmployee: 160000,
        
        supplierPower: 'Moyen',
        buyerPower: 'Faible',
        threatNewEntrants: 'Faible',
        threatSubstitutes: 'Faible',
        rivalry: 'Faible',
        barriersToEntry: 'Très élevées',
        
        competitionLevel: 'Faible',
        numCompetitors: 'Peu (réglementé)',
        marketConcentration: 'Concentré',
        
        rndIntensity: 0.10,
        exportRate: 0.05,
        digitalMaturity: 0.60,
        
        keyRisks: [
            'Dépendance aux remboursements publics',
            'Réglementation complexe',
            'Pénurie de personnel soignant',
            'Responsabilité médicale'
        ]
    },
    
    // ========== FINANCE ==========
    '64.19Z': {
        nafCode: '64.19Z',
        name: 'Autres distributions de crédits',
        sector: 'Finance/Banque',
        description: 'Banques et établissements de crédit',
        
        avgRevenue: 100000000,
        medianRevenue: 50000000,
        avgEbitda: 35000000,
        avgEbitdaMargin: 0.35,
        avgGrossMargin: 0.80,
        avgNetMargin: 0.20,
        
        growthRate2023: 0.035,
        growthRate5yr: 0.02,
        forecastGrowth: 0.03,
        
        ebitdaMultipleLow: 8,
        ebitdaMultipleMid: 10,
        ebitdaMultipleHigh: 14,
        revenueMultipleLow: 0.8,
        revenueMultipleMid: 1.0,
        revenueMultipleHigh: 1.5,
        
        avgDebtToEquity: 5.0,
        avgCurrentRatio: 1.0,
        avgROE: 0.10,
        avgROI: 0.12,
        
        avgEmployees: 200,
        revenuePerEmployee: 500000,
        
        supplierPower: 'Faible',
        buyerPower: 'Élevée',
        threatNewEntrants: 'Faible',
        threatSubstitutes: 'Élevée',
        rivalry: 'Très élevée',
        barriersToEntry: 'Très élevées',
        
        competitionLevel: 'Très élevée',
        numCompetitors: 'Nombreux (oligopole)',
        marketConcentration: 'Concentré',
        
        rndIntensity: 0.15,
        exportRate: 0.10,
        digitalMaturity: 0.80,
        
        keyRisks: [
            'Réglementation bancaire stricte (Bâle III, DSP2)',
            'Concurrence des fintechs',
            'Risques de crédit et de marché',
            'Cybersécurité',
            'Taux d\'intérêt négatifs'
        ]
    },
    '65': {
        nafCode: '65',
        name: 'Assurance',
        sector: 'Finance/Assurance',
        description: 'Compagnies d\'assurance et réassurance',
        
        avgRevenue: 75000000,
        medianRevenue: 35000000,
        avgEbitda: 12000000,
        avgEbitdaMargin: 0.18,
        avgGrossMargin: 0.75,
        avgNetMargin: 0.08,
        
        growthRate2023: 0.030,
        growthRate5yr: 0.025,
        forecastGrowth: 0.03,
        
        ebitdaMultipleLow: 7,
        ebitdaMultipleMid: 10,
        ebitdaMultipleHigh: 13,
        
        avgDebtToEquity: 0.5,
        avgCurrentRatio: 1.5,
        avgROE: 0.12,
        avgROI: 0.15,
        
        avgEmployees: 150,
        revenuePerEmployee: 500000,
        
        supplierPower: 'Faible',
        buyerPower: 'Élevée',
        threatNewEntrants: 'Élevée',
        threatSubstitutes: 'Faible',
        rivalry: 'Élevée',
        barriersToEntry: 'Élevées',
        
        competitionLevel: 'Élevée',
        numCompetitors: 'Modéré (oligopole national)',
        
        keyRisks: [
            'Risques actuariels',
            'Réglementation Solvabilité II',
            'Concurrence des assurtechs',
            'Sinistres majeurs'
        ]
    },
    
    // ========== INDUSTRIE ==========
    'C': {
        nafCode: 'C',
        name: 'Industrie manufacturière',
        sector: 'Industrie manufacturière',
        description: 'Ensemble de l\'industrie manufacturière française',
        
        avgRevenue: 25000000,
        medianRevenue: 8000000,
        avgEbitda: 3500000,
        avgEbitdaMargin: 0.14,
        avgGrossMargin: 0.35,
        avgNetMargin: 0.05,
        
        growthRate2023: 0.025,
        growthRate5yr: 0.02,
        forecastGrowth: 0.03,
        
        ebitdaMultipleLow: 5,
        ebitdaMultipleMid: 7,
        ebitdaMultipleHigh: 10,
        revenueMultipleLow: 0.5,
        revenueMultipleMid: 0.8,
        revenueMultipleHigh: 1.2,
        
        avgDebtToEquity: 0.8,
        avgCurrentRatio: 1.4,
        avgROE: 0.10,
        avgROI: 0.12,
        
        avgEmployees: 80,
        revenuePerEmployee: 300000,
        
        supplierPower: 'Moyen',
        buyerPower: 'Élevée',
        threatNewEntrants: 'Faible',
        threatSubstitutes: 'Moyenne',
        rivalry: 'Élevée',
        barriersToEntry: 'Élevées',
        
        competitionLevel: 'Élevée',
        numCompetitors: 'Nombreux',
        marketConcentration: 'Fragmenté',
        
        rndIntensity: 0.10,
        exportRate: 0.40,
        digitalMaturity: 0.65,
        
        keyRisks: [
            'Concurrence internationale',
            'Coûts énergétiques élevés',
            'Dépendance aux matières premières',
            'Normes environnementales'
        ]
    },
    '29': {
        nafCode: '29',
        name: 'Industrie automobile',
        sector: 'Automobile',
        description: 'Construction automobile',
        
        avgRevenue: 100000000,
        medianRevenue: 30000000,
        avgEbitda: 8000000,
        avgEbitdaMargin: 0.08,
        avgGrossMargin: 0.20,
        avgNetMargin: 0.03,
        
        growthRate2023: -0.02,
        growthRate5yr: 0.01,
        forecastGrowth: 0.04,  // Reprise attendue avec l'électrique
        
        ebitdaMultipleLow: 4,
        ebitdaMultipleMid: 6,
        ebitdaMultipleHigh: 8,
        
        avgDebtToEquity: 1.2,
        avgCurrentRatio: 1.3,
        avgROE: 0.08,
        avgROI: 0.10,
        
        avgEmployees: 500,
        revenuePerEmployee: 200000,
        
        supplierPower: 'Élevé',
        buyerPower: 'Élevée',
        threatNewEntrants: 'Faible',
        threatSubstitutes: 'Élevée',
        rivalry: 'Très élevée',
        barriersToEntry: 'Très élevées',
        
        rndIntensity: 0.15,
        exportRate: 0.70,
        
        keyRisks: [
            'Transition vers l\'électrique',
            'Concurrence asiatique',
            'Coûts de R&D élevés',
            'Dépendance à la demande mondiale'
        ]
    },
    '10': {
        nafCode: '10',
        name: 'Industrie agroalimentaire',
        sector: 'Agroalimentaire',
        description: 'Industries alimentaires',
        
        avgRevenue: 15000000,
        medianRevenue: 5000000,
        avgEbitda: 2000000,
        avgEbitdaMargin: 0.13,
        avgGrossMargin: 0.30,
        avgNetMargin: 0.04,
        
        growthRate2023: 0.035,
        growthRate5yr: 0.03,
        forecastGrowth: 0.03,
        
        ebitdaMultipleLow: 6,
        ebitdaMultipleMid: 8,
        ebitdaMultipleHigh: 11,
        
        avgDebtToEquity: 0.6,
        avgCurrentRatio: 1.5,
        avgROE: 0.12,
        avgROI: 0.14,
        
        avgEmployees: 60,
        revenuePerEmployee: 250000,
        
        supplierPower: 'Élevé',
        buyerPower: 'Élevée',
        threatNewEntrants: 'Faible',
        threatSubstitutes: 'Faible',
        rivalry: 'Élevée',
        barriersToEntry: 'Élevées',
        
        rndIntensity: 0.08,
        exportRate: 0.30,
        
        keyRisks: [
            'Volatilité des prix des matières premières agricoles',
            'Réglementation sanitaire stricte',
            'Concurrence des produits importés',
            'Attentes des consommateurs en matière de santé'
        ]
    },
    
    // ========== RETAIL / DISTRIBUTION ==========
    '47': {
        nafCode: '47',
        name: 'Commerce de détail',
        sector: 'Distribution/Retail',
        description: 'Commerce de détail (hors automobile)',
        
        avgRevenue: 5000000,
        medianRevenue: 1500000,
        avgEbitda: 400000,
        avgEbitdaMargin: 0.08,
        avgGrossMargin: 0.25,
        avgNetMargin: 0.02,
        
        growthRate2023: 0.040,
        growthRate5yr: 0.02,
        forecastGrowth: 0.03,
        
        ebitdaMultipleLow: 5,
        ebitdaMultipleMid: 7,
        ebitdaMultipleHigh: 9,
        revenueMultipleLow: 0.3,
        revenueMultipleMid: 0.5,
        revenueMultipleHigh: 0.8,
        
        avgDebtToEquity: 0.7,
        avgCurrentRatio: 1.2,
        avgROE: 0.08,
        avgROI: 0.10,
        
        avgEmployees: 20,
        revenuePerEmployee: 250000,
        
        supplierPower: 'Élevé',
        buyerPower: 'Élevée',
        threatNewEntrants: 'Élevée',
        threatSubstitutes: 'Élevée',
        rivalry: 'Très élevée',
        barriersToEntry: 'Faibles',
        
        competitionLevel: 'Très élevée',
        numCompetitors: 'Très nombreux',
        marketConcentration: 'Modérément concentré',
        
        rndIntensity: 0.05,
        exportRate: 0.05,
        digitalMaturity: 0.70,
        
        keyRisks: [
            'Concurrence intense',
            'Marginalité faible',
            'Transformation digitale',
            'Changement des habitudes de consommation'
        ]
    },
    '47.91B': {
        nafCode: '47.91B',
        name: 'Vente à distance sur catalogue spécialisé',
        sector: 'E-commerce',
        description: 'E-commerce et vente à distance',
        
        avgRevenue: 8000000,
        medianRevenue: 2000000,
        avgEbitda: 1200000,
        avgEbitdaMargin: 0.15,
        avgGrossMargin: 0.40,
        avgNetMargin: 0.05,
        
        growthRate2023: 0.12,
        growthRate5yr: 0.15,
        forecastGrowth: 0.10,
        
        ebitdaMultipleLow: 8,
        ebitdaMultipleMid: 12,
        ebitdaMultipleHigh: 18,
        revenueMultipleLow: 1.0,
        revenueMultipleMid: 1.5,
        revenueMultipleHigh: 2.5,
        
        avgDebtToEquity: 0.4,
        avgCurrentRatio: 1.8,
        avgROE: 0.15,
        avgROI: 0.20,
        
        avgEmployees: 15,
        revenuePerEmployee: 500000,
        
        supplierPower: 'Faible',
        buyerPower: 'Élevée',
        threatNewEntrants: 'Élevée',
        threatSubstitutes: 'Élevée',
        rivalry: 'Élevée',
        barriersToEntry: 'Faibles',
        
        digitalMaturity: 0.95,
        
        keyRisks: [
            'Concurrence internationale',
            'Logistique complexe',
            'Cybersécurité',
            'Satisfaction client'
        ]
    },
    
    // ========== ÉNERGIE ==========
    '35': {
        nafCode: '35',
        name: 'Production et distribution d\'électricité, de gaz, de vapeur et d\'air conditionné',
        sector: 'Énergie/Utilities',
        description: 'Sector énergétique',
        
        avgRevenue: 50000000,
        medianRevenue: 20000000,
        avgEbitda: 10000000,
        avgEbitdaMargin: 0.20,
        avgGrossMargin: 0.40,
        avgNetMargin: 0.10,
        
        growthRate2023: 0.015,
        growthRate5yr: 0.01,
        forecastGrowth: 0.02,
        
        ebitdaMultipleLow: 8,
        ebitdaMultipleMid: 10,
        ebitdaMultipleHigh: 14,
        revenueMultipleLow: 1.0,
        revenueMultipleMid: 1.5,
        revenueMultipleHigh: 2.0,
        
        avgDebtToEquity: 2.0,
        avgCurrentRatio: 1.0,
        avgROE: 0.12,
        avgROI: 0.15,
        
        avgEmployees: 200,
        revenuePerEmployee: 250000,
        
        supplierPower: 'Faible',
        buyerPower: 'Faible',
        threatNewEntrants: 'Faible',
        threatSubstitutes: 'Moyenne',
        rivalry: 'Faible',
        barriersToEntry: 'Très élevées',
        
        competitionLevel: 'Faible',
        numCompetitors: 'Peu (oligopole)',
        marketConcentration: 'Très concentré',
        
        rndIntensity: 0.10,
        exportRate: 0.10,
        
        keyRisks: [
            'Transition énergétique',
            'Réglementation environnementale',
            'Dépendance aux infrastructures',
            'Volatilité des prix de l\'énergie'
        ]
    },
    '35.13Z': {
        nafCode: '35.13Z',
        name: 'Distribution d\'électricité',
        sector: 'Énergies renouvelables',
        description: 'Énergies renouvelables',
        
        avgRevenue: 10000000,
        medianRevenue: 3000000,
        avgEbitda: 2500000,
        avgEbitdaMargin: 0.25,
        avgGrossMargin: 0.50,
        avgNetMargin: 0.12,
        
        growthRate2023: 0.15,
        growthRate5yr: 0.18,
        forecastGrowth: 0.12,
        
        ebitdaMultipleLow: 10,
        ebitdaMultipleMid: 15,
        ebitdaMultipleHigh: 20,
        
        avgEmployees: 40,
        revenuePerEmployee: 250000,
        
        supplierPower: 'Moyen',
        buyerPower: 'Faible',
        threatNewEntrants: 'Moyenne',
        threatSubstitutes: 'Faible',
        rivalry: 'Modérée',
        barriersToEntry: 'Élevées',
        
        rndIntensity: 0.15,
        
        keyRisks: [
            'Subventions gouvernementales',
            'Technologies en évolution',
            'Concurrence des énergies fossiles'
        ]
    },
    
    // ========== IMMOBILIER ==========
    '68': {
        nafCode: '68',
        name: 'Activités immobilières',
        sector: 'Immobilier',
        description: 'Activités immobilières',
        
        avgRevenue: 12000000,
        medianRevenue: 3000000,
        avgEbitda: 3500000,
        avgEbitdaMargin: 0.28,
        avgGrossMargin: 0.60,
        avgNetMargin: 0.15,
        
        growthRate2023: 0.030,
        growthRate5yr: 0.02,
        forecastGrowth: 0.03,
        
        ebitdaMultipleLow: 10,
        ebitdaMultipleMid: 14,
        ebitdaMultipleHigh: 20,
        revenueMultipleLow: 1.5,
        revenueMultipleMid: 2.0,
        revenueMultipleHigh: 3.0,
        
        avgDebtToEquity: 1.5,
        avgCurrentRatio: 0.8,
        avgROE: 0.15,
        avgROI: 0.18,
        
        avgEmployees: 10,
        revenuePerEmployee: 1200000,
        
        supplierPower: 'Moyen',
        buyerPower: 'Élevée',
        threatNewEntrants: 'Modérée',
        threatSubstitutes: 'Faible',
        rivalry: 'Élevée',
        barriersToEntry: 'Élevées',
        
        competitionLevel: 'Élevée',
        numCompetitors: 'Nombreux',
        marketConcentration: 'Fragmenté',
        
        keyRisks: [
            'Cyclicité du marché',
            'Réglementation complexe (lois ALUR, encadrement des loyers)',
            'Taux d\'intérêt',
            'Vacance locative'
        ]
    },
    '41': {
        nafCode: '41',
        name: 'Construction de bâtiments',
        sector: 'Construction/BTP',
        description: 'Construction de bâtiments',
        
        avgRevenue: 15000000,
        medianRevenue: 4000000,
        avgEbitda: 1500000,
        avgEbitdaMargin: 0.10,
        avgGrossMargin: 0.25,
        avgNetMargin: 0.03,
        
        growthRate2023: 0.020,
        growthRate5yr: 0.01,
        forecastGrowth: 0.02,
        
        ebitdaMultipleLow: 4,
        ebitdaMultipleMid: 6,
        ebitdaMultipleHigh: 8,
        revenueMultipleLow: 0.3,
        revenueMultipleMid: 0.5,
        revenueMultipleHigh: 0.7,
        
        avgDebtToEquity: 0.5,
        avgCurrentRatio: 1.3,
        avgROE: 0.10,
        avgROI: 0.12,
        
        avgEmployees: 30,
        revenuePerEmployee: 500000,
        
        supplierPower: 'Élevé',
        buyerPower: 'Élevée',
        threatNewEntrants: 'Faible',
        threatSubstitutes: 'Faible',
        rivalry: 'Élevée',
        barriersToEntry: 'Faibles',
        
        competitionLevel: 'Élevée',
        numCompetitors: 'Très nombreux',
        
        keyRisks: [
            'Dépendance à la conjoncture économique',
            'Réglementation RE2020',
            'Pénurie de main d\'œuvre qualifiée',
            'Coûts des matières premières'
        ]
    },
    
    // ========== AUTRES SECTEURS ==========
    '79': {
        nafCode: '79',
        name: 'Services d\'agences de voyage, voyagistes, services de réservation et services connexes',
        sector: 'Tourisme',
        description: 'Tourisme et voyage',
        
        avgRevenue: 3000000,
        medianRevenue: 800000,
        avgEbitda: 300000,
        avgEbitdaMargin: 0.10,
        avgGrossMargin: 0.25,
        avgNetMargin: 0.03,
        
        growthRate2023: 0.20,  // Reprise post-Covid
        growthRate5yr: 0.05,
        forecastGrowth: 0.06,
        
        ebitdaMultipleLow: 4,
        ebitdaMultipleMid: 6,
        ebitdaMultipleHigh: 8,
        
        avgEmployees: 10,
        revenuePerEmployee: 300000,
        
        competitionLevel: 'Élevée',
        
        keyRisks: [
            'Sensibilité aux crises (sanitaires, géopolitiques)',
            'Concurrence des plateformes en ligne',
            'Saisonnalité'
        ]
    },
    '56': {
        nafCode: '56',
        name: 'Restauration',
        sector: 'Restauration',
        description: 'Restauration traditionnelle et rapide',
        
        avgRevenue: 800000,
        medianRevenue: 300000,
        avgEbitda: 80000,
        avgEbitdaMargin: 0.10,
        avgGrossMargin: 0.65,
        avgNetMargin: 0.02,
        
        growthRate2023: 0.08,
        growthRate5yr: 0.05,
        forecastGrowth: 0.06,
        
        avgEmployees: 8,
        revenuePerEmployee: 100000,
        
        competitionLevel: 'Très élevée',
        
        keyRisks: [
            'Marginalité très faible',
            'Coûts de main d\'œuvre élevés',
            'Réglementation sanitaire',
            'Concurrence intense'
        ]
    },
    '58': {
        nafCode: '58',
        name: 'Édition',
        sector: 'Médias',
        description: 'Édition de livres, journaux, magazines',
        
        avgRevenue: 2000000,
        medianRevenue: 500000,
        avgEbitda: 200000,
        avgEbitdaMargin: 0.10,
        avgGrossMargin: 0.50,
        avgNetMargin: 0.03,
        
        growthRate2023: -0.01,
        growthRate5yr: 0.01,
        forecastGrowth: 0.02,
        
        avgEmployees: 10,
        revenuePerEmployee: 200000,
        
        competitionLevel: 'Élevée',
        digitalMaturity: 0.60,
        
        keyRisks: [
            'Numérisation',
            'Baisse des ventes papier',
            'Concurrence du gratuit en ligne'
        ]
    },
    '61': {
        nafCode: '61',
        name: 'Télécommunications',
        sector: 'Télécoms',
        description: 'Télécommunications',
        
        avgRevenue: 50000000,
        medianRevenue: 15000000,
        avgEbitda: 18000000,
        avgEbitdaMargin: 0.35,
        avgGrossMargin: 0.60,
        avgNetMargin: 0.12,
        
        growthRate2023: 0.01,
        growthRate5yr: 0.00,
        forecastGrowth: 0.02,
        
        ebitdaMultipleLow: 7,
        ebitdaMultipleMid: 9,
        ebitdaMultipleHigh: 12,
        
        avgEmployees: 300,
        revenuePerEmployee: 160000,
        
        competitionLevel: 'Faible',
        numCompetitors: 'Peu (oligopole)',
        
        rndIntensity: 0.20,
        
        keyRisks: [
            'Réglementation (ARCEP)',
            'Concurrence sur les infrastructures',
            'Investissements lourds en R&D',
            'Changement technologique rapide'
        ]
    },
    '20': {
        nafCode: '20',
        name: 'Industrie chimique',
        sector: 'Chimie',
        description: 'Industrie chimique de base et spécialisée',
        
        avgRevenue: 40000000,
        medianRevenue: 12000000,
        avgEbitda: 6000000,
        avgEbitdaMargin: 0.15,
        avgGrossMargin: 0.35,
        avgNetMargin: 0.06,
        
        growthRate2023: 0.03,
        growthRate5yr: 0.02,
        forecastGrowth: 0.03,
        
        ebitdaMultipleLow: 6,
        ebitdaMultipleMid: 8,
        ebitdaMultipleHigh: 11,
        
        avgEmployees: 150,
        revenuePerEmployee: 260000,
        
        rndIntensity: 0.20,
        exportRate: 0.60,
        
        keyRisks: [
            'Réglementation environnementale stricte (REACH)',
            'Coûts de sécurité élevés',
            'Dépendance aux matières premières',
            'Risques chimiques'
        ]
    }
};

// Secteurs par défaut si non trouvé dans le mapping
const DEFAULT_SECTORS = {
    'default': {
        nafCode: 'default',
        name: 'Secteur non spécifié',
        sector: 'Général',
        description: 'Secteur non identifié dans notre base de données',
        
        avgRevenue: 2000000,
        medianRevenue: 800000,
        avgEbitda: 250000,
        avgEbitdaMargin: 0.12,
        avgGrossMargin: 0.40,
        avgNetMargin: 0.05,
        
        growthRate2023: 0.03,
        growthRate5yr: 0.02,
        forecastGrowth: 0.03,
        
        ebitdaMultipleLow: 5,
        ebitdaMultipleMid: 7,
        ebitdaMultipleHigh: 10,
        revenueMultipleLow: 0.5,
        revenueMultipleMid: 0.8,
        revenueMultipleHigh: 1.2,
        
        avgDebtToEquity: 0.6,
        avgCurrentRatio: 1.5,
        avgROE: 0.12,
        avgROI: 0.15,
        
        avgEmployees: 15,
        revenuePerEmployee: 150000,
        
        supplierPower: 'Moyen',
        buyerPower: 'Moyenne',
        threatNewEntrants: 'Moyenne',
        threatSubstitutes: 'Moyenne',
        rivalry: 'Moyenne',
        barriersToEntry: 'Moyennes',
        
        competitionLevel: 'Modérée',
        
        rndIntensity: 0.08,
        exportRate: 0.20,
        digitalMaturity: 0.60,
        
        keyRisks: [
            'Incertitude économique',
            'Concurrence',
            'Évolution réglementaire'
        ]
    }
};

// Fonction pour obtenir les données sectorielles INSEE
function getSectorData(sector) {
    if (!sector) return DEFAULT_SECTORS.default;
    
    // Normaliser le secteur
    const normalizedSector = sector.toLowerCase().trim();
    
    // 1. Essayer de trouver un code NAF correspondant
    let nafCode = SECTOR_NAF_MAPPING[normalizedSector];
    
    // 2. Si pas de code NAF direct, essayer de chercher par nom de secteur
    if (!nafCode) {
        // Vérifier si le secteur est déjà un code NAF
        if (INSEE_SECTOR_DATA[normalizedSector]) {
            return INSEE_SECTOR_DATA[normalizedSector];
        }
        
        // Chercher dans les noms de secteurs
        for (const [code, data] of Object.entries(INSEE_SECTOR_DATA)) {
            if (data.name.toLowerCase().includes(normalizedSector) ||
                data.sector.toLowerCase().includes(normalizedSector) ||
                data.description.toLowerCase().includes(normalizedSector)) {
                return data;
            }
        }
    }
    
    // 3. Si on a trouvé un code NAF, retourner les données correspondantes
    if (nafCode && INSEE_SECTOR_DATA[nafCode]) {
        return INSEE_SECTOR_DATA[nafCode];
    }
    
    // 4. Retourner les valeurs par défaut
    return DEFAULT_SECTORS.default;
}

// Fonction pour obtenir un indicateur spécifique du secteur
function getSectorIndicator(sector, indicator) {
    const sectorData = getSectorData(sector);
    return sectorData[indicator];
}

// Exporter les données et fonctions
window.INSEE_DATA = INSEE_SECTOR_DATA;
window.SECTOR_NAF_MAPPING = SECTOR_NAF_MAPPING;
window.DEFAULT_SECTORS = DEFAULT_SECTORS;
window.getSectorData = getSectorData;
window.getSectorIndicator = getSectorIndicator;

console.log('%c[INSEE-Data] Données sectorielles INSEE chargées', 'color: #28a745; font-weight: bold;');
