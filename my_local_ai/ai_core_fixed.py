#!/usr/bin/env python3
"""
DPAI Local AI Core - Moteur d'IA 100% local sans modèle externe

Ce module implémente une IA qui:
1. Comprend les questions grâce à la vectorisation
2. Trouve les réponses les plus pertinentes dans les données d'entraînement
3. Apprend de nouvelles interactions
4. Fonctionne entièrement en local

Technologies: TF-IDF, Similarité cosine, Apprentissage par mémorisation
"""

import json
import os
import pickle
import re
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class DPAILocalAI:
    """Moteur principal de l'IA locale DPAI"""
    
    def __init__(self, data_dir: str = "data", models_dir: str = "models"):
        """
        Initialise l'IA locale
        
        Args:
            data_dir: Dossier contenant les données d'entraînement
            models_dir: Dossier pour sauvegarder les modèles entraînés
        """
        self.data_dir = Path(data_dir)
        self.models_dir = Path(models_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.models_dir.mkdir(exist_ok=True)
        
        # Données d'entraînement
        self.training_data: List[Dict[str, Any]] = []
        
        # Modèle de vectorisation
        self.vectorizer: Optional[TfidfVectorizer] = None
        self.vectorized_questions: Optional[np.ndarray] = None
        self.vectorized_contexts: Optional[np.ndarray] = None
        
        # Mémoire des conversations
        self.conversations: List[Dict[str, Any]] = []
        
        # Mémoire des cas DPAI
        self.case_memory = DPAICaseMemory(data_dir)
        
        # Configuration
        self.config = {
            "model_name": "dpai_local_v1",
            "max_history": 100,
            "similarity_threshold": 0.3,
            "min_response_length": 50,
            "use_context": True,
            "learning_enabled": True,
            # Configuration améliorée pour les cas
            "use_case_memory": True,
            "case_similarity_threshold": 0.4,
            "max_case_results": 3,
            "auto_learn_from_cases": True,
            "include_case_context": True
        }
        
        # Charger ou initialiser
        self._load_config()
        self.load_model()
    
    def _load_config(self):
        """Charge la configuration depuis un fichier si elle existe"""
        config_path = self.models_dir / "config.json"
        if config_path.exists():
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    self.config.update(json.load(f))
            except Exception as e:
                print(f"⚠️  Impossible de charger la config: {e}")
    
    def _save_config(self):
        """Sauvegarde la configuration"""
        config_path = self.models_dir / "config.json"
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, indent=2, ensure_ascii=False)
    
    def load_training_data(self, file_path: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Charge les données d'entraînement depuis un fichier JSON
        
        Args:
            file_path: Chemin vers le fichier (sinon utilise data/training_data.json)
        
        Returns:
            Liste des exemples d'entraînement
        """
        if file_path is None:
            # Chercher dans le dossier data
            data_file = self.data_dir / "training_data.json"
            if not data_file.exists():
                # Créer des données par défaut basées sur tes exemples DPAI
                print("📝 Création des données d'entraînement par défaut...")
                self._create_default_data()
                return self.load_training_data()
        else:
            data_file = Path(file_path)
        
        try:
            with open(data_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Normaliser le format
            normalized_data = []
            for item in data:
                normalized = self._normalize_training_item(item)
                if normalized:
                    normalized_data.append(normalized)
            
            self.training_data = normalized_data
            print(f"✅ Chargé {len(self.training_data)} exemples d'entraînement depuis {data_file}")
            
            # Intégrer les cas d'école si activé
            if self.config["auto_learn_from_cases"]:
                self._integrate_cases_into_training()
            
            return self.training_data
            
        except FileNotFoundError:
            print(f"❌ Fichier non trouvé: {data_file}")
            return []
        except json.JSONDecodeError as e:
            print(f"❌ Erreur JSON dans {data_file}: {e}")
            return []
        except Exception as e:
            print(f"❌ Erreur lors du chargement: {e}")
            return []
    
    def _normalize_training_item(self, item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Normalise un item de données d'entraînement pour notre format"""
        # Format attendu: {"instruction": "...", "input": "...", "output": "..."}
        # ou {"question": "...", "answer": "..."}
        # ou {"messages": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
        
        normalized = {}
        
        if "instruction" in item and "output" in item:
            normalized = {
                "question": item["instruction"] + (" " + item.get("input", "") if item.get("input") else ""),
                "answer": item["output"],
                "source": item.get("source", "default"),
                "tags": item.get("tags", [])
            }
        elif "question" in item and "answer" in item:
            normalized = {
                "question": item["question"],
                "answer": item["answer"],
                "source": item.get("source", "default"),
                "tags": item.get("tags", [])
            }
        elif "messages" in item and len(item["messages"]) >= 2:
            messages = item["messages"]
            user_msg = next((m for m in messages if m.get("role") == "user"), None)
            assistant_msg = next((m for m in messages if m.get("role") == "assistant"), None)
            
            if user_msg and assistant_msg:
                normalized = {
                    "question": user_msg.get("content", ""),
                    "answer": assistant_msg.get("content", ""),
                    "source": "conversation",
                    "tags": []
                }
        elif "messages" in item and len(item["messages"]) == 1:
            # Format de type {"messages": [{"content": "...", "role": "user"}]}
            msg = item["messages"][0]
            if msg.get("role") == "user":
                normalized = {
                    "question": msg.get("content", ""),
                    "answer": "",  # Réponse vide, à compléter
                    "source": "partial",
                    "tags": []
                }
        
        if normalized and normalized["question"] and normalized["answer"]:
            return normalized
        return None
    
    def _load_external_knowledge(self):
        """Charge les fichiers de connaissances externes depuis le dossier data/"""
        knowledge_files = [
            "external_knowledge.json",
            "m_and_a_best_practices.json", 
            "sector_benchmarks.json",
            "due_diligence_checklists.json"
        ]
        
        loaded_count = 0
        
        for file_name in knowledge_files:
            file_path = self.data_dir / file_name
            if file_path.exists():
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        knowledge_data = json.load(f)
                    
                    if isinstance(knowledge_data, list):
                        for item in knowledge_data:
                            normalized = self._normalize_training_item(item)
                            if normalized and not self._question_exists(normalized["question"]):
                                # Ajouter la source si non présente
                                if "source" not in normalized:
                                    normalized["source"] = f"external_knowledge_{file_name.replace('.json', '')}"
                                elif normalized.get("source") == "default":
                                    normalized["source"] = f"external_knowledge_{file_name.replace('.json', '')}"
                                
                                self.training_data.append(normalized)
                                loaded_count += 1
                    
                    print(f"✅ Chargé {len(knowledge_data) if isinstance(knowledge_data, list) else 1} éléments depuis {file_name}")
                except Exception as e:
                    print(f"⚠️  Erreur lors du chargement de {file_name}: {e}")
        
        if loaded_count > 0:
            print(f"📚 Intégration de {loaded_count} paires Q/R depuis les fichiers de connaissances externes")
        
        return loaded_count
    
    def _integrate_cases_into_training(self):
        """Intègre automatiquement les cas d'école et les connaissances externes dans les données d'entraînement"""
        # D'abord charger les connaissances externes
        external_count = self._load_external_knowledge()
        
        # Puis intégrer les cas d'école
        if not self.case_memory.cases:
            return
        
        print(f"📚 Intégration de {len(self.case_memory.cases)} cas d'école...")
        
        for case in self.case_memory.cases:
            case_id = case.get("id", "UNKNOWN")
            title = case.get("title", "")
            
            q1 = f"Raconte le cas {case_id} : {title}"
            a1 = self.case_memory.get_case_summary(case_id)
            
            q2 = f"Quelles sont les leçons du cas {case_id} ?"
            lessons = case.get("lessons_learned", [])
            a2 = f"Leçons du cas {case_id} ({title}):\n\n" + "\n".join([f"{i+1}. {l}" for i, l in enumerate(lessons)])
            
            q3 = f"Quel était le problème dans le cas {case_id} ?"
            problem = case.get("problem", "Non spécifié")
            a3 = f"Problématique du cas {case_id} ({title}):\n\n{problem}"
            
            q4 = f"Comment DPAI a résolu le problème dans le cas {case_id} ?"
            solution = case.get("dpai_solution", {})
            methodology = "\n".join([f"- {m}" for m in solution.get("methodology", [])])
            recommendation = solution.get("recommendation", "Non spécifiée")
            a4 = f"Solution DPAI pour le cas {case_id} ({title}):\n\n{methodology}\n\n**Recommandation:** {recommendation}"
            
            for q, a in [(q1, a1), (q2, a2), (q3, a3), (q4, a4)]:
                if not self._question_exists(q):
                    self.training_data.append({
                        "question": q,
                        "answer": a,
                        "source": "dpai_case_memory",
                        "tags": ["case_study", case_id.lower()] + case.get("tags", [])
                    })
        
        case_added = len([d for d in self.training_data if d.get('source') == 'dpai_case_memory'])
        total_added = case_added + external_count
        print(f"✅ {total_added} paires Q/R ajoutées ({case_added} depuis les cas, {external_count} depuis les connaissances externes)")
    
    def _question_exists(self, question: str) -> bool:
        for item in self.training_data:
            if item.get("question") == question:
                return True
        return False
    
    def _create_default_data(self):
        """Crée des données d'entraînement par défaut basées sur ton expertise DPAI"""
        default_data = [
            {
                "question": "Quelle est la méthodologie DPAI pour valoriser une entreprise SaaS avec 10M€ de CA et 3M€ d'EBITDA ?",
                "answer": "Chez DPAI, pour une entreprise SaaS avec ces caractéristiques, nous utilisons une approche en 3 étapes :\n\n1. Analyse sectorielle : Dans le SaaS français, les multiples moyens sont de 10-15x l'EBITDA. Avec 3M€ d'EBITDA, la fourchette de base est donc 30M€ - 45M€.\n\n2. Ajustements spécifiques :\n   - Croissance : Si +20%/an → +2-3x le multiple → 60M€ - 90M€.\n   - Rétention clients : Si >90% → +1x le multiple.\n   - Marge brute : Si >80% → +0.5x le multiple.\n\n3. Recommandation finale : Pour une SaaS française avec ces métriques, nous recommandons une valorisation entre 50M€ et 70M€, selon la qualité du CA (récurrent vs ponctuel).\n\nProchaine étape : Valider avec une Due Diligence financière pour confirmer la qualité des revenus.",
                "source": "dpai_default",
                "tags": ["valuation", "saas", "methodology"]
            },
            {
                "question": "Quels sont les pièges à éviter dans une négociation de rachat d'une PME industrielle ?",
                "answer": "Voici les 5 pièges majeurs que nous identifions chez DPAI lors du rachat d'une PME industrielle, avec nos solutions :\n\n1. Sous-estimer les coûts de restructuration :\n   - Piège : Les PME industrielles ont souvent des processus obsolètes.\n   - Impact : Coûts cachés de 500k€ à 2M€.\n   - Solution DPAI : Audit technique AVANT l'offre finale.\n\n2. Ignorer la culture d'entreprise :\n   - Piège : Culture forte et résistante au changement.\n   - Impact : Résistance au changement → échec de l'intégration.\n   - Solution DPAI : Immersion pré-acquisition (1 semaine) + ateliers de co-construction.\n\n3. Mauvaise évaluation des stocks :\n   - Piège : Stocks sous-évalués ou surévalués.\n   - Impact : Décalage de 10-20% sur la valorisation.\n   - Solution DPAI : Inventory audit par un expert sectoriel.\n\n4. Clauses de garantie de passif insuffisantes :\n   - Piège : Dettes fiscales ou sociales non déclarées.\n   - Impact : Responsabilité pour l'acheteur.\n   - Solution DPAI : Garantie de passif sur 24 mois + rétention de 10% du prix sur compte séquestre.\n\n5. Plan d'intégration trop optimiste :\n   - Piège : Sous-estimer le temps nécessaire.\n   - Impact : Pertes de productivité de 15-30%.\n   - Solution DPAI : Plan en 5 phases (3-6-12-18-24 mois) avec des KPI clairs.\n\nRecommandation DPAI : Budget : Prévoir 5-10% du prix d'achat pour les coûts d'intégration.",
                "source": "dpai_default",
                "tags": ["negotiation", "pme", "industrial", "acquisition"]
            },
            {
                "question": "Comment structurer un LBO pour une acquisition à 20M€ ?",
                "answer": "Chez DPAI, nous structurons les LBO pour les PME/ETI françaises selon ce modèle testé et optimisé :\n\nStructure Type pour 20M€ (LBO Classique):\n| Poste | Montant (€) | % |\n|-------|-------------|---|\n| Prix d'achat | 20 000 000 | 100% |\n| Fonds propres | 5 000 000 | 25% |\n| Dette senior | 12 000 000 | 60% |\n| Dette mezzanine | 3 000 000 | 15% |\n| Total | 20 000 000 | 100% |\n\nDétail des Sources de Financement:\n1. Fonds propres (25%):\n   - Apport personnel : 1M€-2M€ (10-15%)\n   - Private Equity : 3M€-4M€ (15-20%)\n   - Explication : Les banques exigent un ratio dette/fonds propres ≤ 4x.\n\n2. Dette senior (60%):\n   - Taux : 4-6%\n   - Durée : 5-7 ans\n   - Garanties : Actifs de la cible + caution personnelle.\n\n3. Dette mezzanine (15%):\n   - Taux : 8-12% (intérêt + warrant)\n   - Durée : 5-8 ans\n   - Avantage : Complète le financement sans diluer davantage.\n\nParamètres Clés à Négocier:\n| Paramètre | Valeur Standard | Recommandation DPAI |\n|-----------|-----------------|----------------------|\n| Leverage Ratio | 4-6x | Max 5x |\n| Taux dette senior | 4-6% | Négocier <5% |\n| Durée dette | 5-7 ans | 7 ans |\n\nRecommandations DPAI :\n- Négocier un earn-out : 10% du prix (2M€) sur 3 ans si objectifs atteints\n- Prévoir un cash buffer : 1M€ pour les imprévus\n- Choisir une dette senior amortissable",
                "source": "dpai_default",
                "tags": ["lbo", "financing", "structure", "acquisition"]
            },
            {
                "question": "Réalise une analyse SWOT pour une entreprise EdTech appelée TechCorp avec 5M€ de CA et 1M€ d'EBITDA",
                "answer": "## Analyse SWOT pour TechCorp (Secteur : EdTech)\n\nContexte : TechCorp est une PME française de l'EdTech avec 5M€ de CA, 1M€ d'EBITDA (20% de marge) et 50 employés.\n\n### Forces\n1. Marge brute élevée (85%) → Impact : Rentabilité supérieure à la moyenne du secteur (70%).\n2. 95% de revenus récurrents → Impact : Stabilité financière.\n3. Partenariat exclusif avec Microsoft Azure → Impact : Réduction de 15% des coûts cloud.\n\n### Faiblesses\n1. Dépendance à un client (30% du CA) → Risque : -3M€/an en cas de perte.\n   → Solution DPAI : Diversifier le portefeuille clients en ciblant les collèges et lycées.\n2. Pas de brevet sur le produit phare → Risque : Copie par des concurrents.\n   → Solution DPAI : Budget de 50k€ pour déposer un brevet sous 6 mois.\n\n### Opportunités\n1. Croissance du marché EdTech (+12-15%/an) → Potentiel : +1M€-2M€ de CA/an.\n2. Faiblesse de SchoolMint sur le marché français → Potentiel : Acquisition possible.\n3. Subventions BPI France pour l'innovation → Potentiel : 500k€ de financement.\n\n### Menaces\n1. Microsoft lance un concurrent direct → Impact : -2M€ de CA.\n   → Solution DPAI : Surveiller via notre outil de veille concurrentielle.\n2. RGPD 2.0 en 2025 → Impact : Coût de conformité estimé à 200k€/an.\n3. Inflation des coûts cloud (+15% en 2024) → Impact : -500k€/an.\n\n### Recommandations Stratégiques (DPAI)\n1. Diversifier le portefeuille clients → ROI estimé : +2M€ de CA/an.\n2. Déposer un brevet → ROI estimé : Éviter une perte de 5M€/an.\n3. Optimiser les coûts cloud → ROI estimé : -200k€/an.\n4. Lancer une campagne de marketing B2B → ROI estimé : +1M€ de CA/an.",
                "source": "dpai_default",
                "tags": ["swot", "edtech", "analysis", "strategy"]
            },
            {
                "question": "Analyse les 5 Forces de Porter pour un SaaS B2B avec 10M€ de CA",
                "answer": "## Analyse Porter 5 Forces pour SaaS B2B (CA : 10M€)\n\n1. Pouvoir de négociation des clients :\n   - Niveau : Élevé\n   - Explication : Clients professionnels avec budget important mais exigeants\n   - Impact : Pression sur les prix\n   - Recommandation DPAI : Proposer des contrats longs (2-3 ans)\n\n2. Pouvoir de négociation des fournisseurs :\n   - Niveau : Faible\n   - Explication : Nombreux fournisseurs cloud (AWS, GCP, Azure)\n   - Impact : Coûts maîtrisés\n\n3. Menace des nouveaux entrants :\n   - Niveau : Modéré\n   - Barrières : Coûts de développement, réseau de distribution\n   - Risque : Concurrence accrue\n\n4. Menace des produits de substitution :\n   - Niveau : Faible\n   - Alternatives : Solutions internes des clients\n\n5. Intensité de la rivalité :\n   - Niveau : Élevé\n   - Concurrence : Salesforce, HubSpot, SAP\n   - Recommandation DPAI : Se différencier par le service client\n\nSynthèse : Force concurrentielle globale : Modérée\nProchaines étapes : Lancer une campagne de fidélisation",
                "source": "dpai_default",
                "tags": ["porter", "analysis", "saas", "b2b", "strategy"]
            }
        ]
        
        # Sauvegarder
        with open(self.data_dir / "training_data.json", 'w', encoding='utf-8') as f:
            json.dump(default_data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Données par défaut créées: {len(default_data)} exemples")
    
    def train(self, save_model: bool = True) -> bool:
        """
        Entraîne le modèle d'IA sur les données chargées
        
        Args:
            save_model: Si True, sauvegarde le modèle entraîné
        
        Returns:
            True si l'entraînement a réussi
        """
        if not self.training_data:
            print("❌ Aucune donnée d'entraînement chargée. Utilisez load_training_data() d'abord.")
            return False
        
        print(f"🚀 Début de l'entraînement sur {len(self.training_data)} exemples...")
        
        try:
            # Extraire questions et réponses
            questions = [item["question"] for item in self.training_data]
            answers = [item["answer"] for item in self.training_data]
            
            # Créer le contexte pour chaque question (question + tags + source)
            contexts = []
            for item in self.training_data:
                context_parts = [item["question"]]
                if item.get("tags"):
                    context_parts.extend(item["tags"])
                if item.get("source"):
                    context_parts.append(item["source"])
                contexts.append(" ".join(context_parts))
            
            # Initialiser et adapter le vectoriseur TF-IDF
            # Liste de stop words françaises courantes
            french_stop_words = [
                'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'est', 'en', 'pour', 'par',
                'sur', 'avec', 'au', 'aux', 'ce', 'cette', 'ces', 'qui', 'que', 'dont', 'où', 'se',
                'ne', 'pas', 'plus', 'sont', 'ont', 'été', 'être', 'avoir', 'a', 'à', 'il', 'elle',
                'on', 'nous', 'vous', 'ils', 'elles', 'son', 'sa', 'ses', 'mon', 'ma', 'mes', 'ton',
                'ta', 'tes', 'notre', 'votre', 'leur', 'leurs', 'ceux', 'celles', 'celui', 'celle',
                'd', 'l', 'qu', 'm', 't', 's', 'n', 'j', 'c', 'dans', 'suivant', 'suivante'
            ]
            self.vectorizer = TfidfVectorizer(
                max_features=10000,
                stop_words=french_stop_words,
                ngram_range=(1, 3),
                min_df=1,
                max_df=0.95
            )
            
            # Vectoriser les questions et les contextes
            self.vectorized_questions = self.vectorizer.fit_transform(questions)
            self.vectorized_contexts = self.vectorizer.transform(contexts)
            
            print(f"✅ Entraînement terminé!")
            print(f"   - Vocabulaire: {len(self.vectorizer.get_feature_names_out())} termes")
            print(f"   - Vecteurs: {self.vectorized_questions.shape}")
            
            if save_model:
                self.save_model()
            
            return True
            
        except Exception as e:
            print(f"❌ Erreur lors de l'entraînement: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def save_model(self):
        """Sauvegarde le modèle entraîné sur le disque"""
        if self.vectorizer is None or self.vectorized_questions is None:
            print("   Aucun modele a sauvegarder. Entrainez d'abord le modele.")
            return False
        
        try:
            model_path = self.models_dir / f"{self.config['model_name']}.pkl"
            
            # Sauvegarder le vectoriseur et les vecteurs
            with open(model_path, 'wb') as f:
                pickle.dump({
                    'vectorizer': self.vectorizer,
                    'vectorized_questions': self.vectorized_questions,
                    'vectorized_contexts': self.vectorized_contexts,
                    'training_data': self.training_data,
                    'config': self.config
                }, f)
            
            print(f"✅ Modèle sauvegardé: {model_path}")
            return True
            
        except Exception as e:
            print(f"❌ Erreur lors de la sauvegarde: {e}")
            return False
    
    def load_model(self):
        """Charge un modèle entraîné depuis le disque"""
        model_path = self.models_dir / f"{self.config['model_name']}.pkl"
        
        if not model_path.exists():
            print(f"   Aucun modele trouve a {model_path}. Un nouveau modele sera cree.")
            return False
        
        try:
            with open(model_path, 'rb') as f:
                data = pickle.load(f)
            
            self.vectorizer = data['vectorizer']
            self.vectorized_questions = data['vectorized_questions']
            self.vectorized_contexts = data['vectorized_contexts']
            self.training_data = data['training_data']
            self.config.update(data.get('config', {}))
            
            print(f"✅ Modèle chargé: {model_path}")
            print(f"   - Exemples d'entraînement: {len(self.training_data)}")
            return True
            
        except Exception as e:
            print(f"❌ Erreur lors du chargement du modèle: {e}")
            return False
    
    def _preprocess_text(self, text: str) -> str:
        """Prétraite le texte pour la vectorisation"""
        # Nettoyer le texte
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)  # Supprimer la ponctuation
        text = re.sub(r'\s+', ' ', text)  # Supprimer les espaces multiples
        text = text.strip()
        return text
    
    def find_most_similar(self, question: str, k: int = 3, use_context: bool = True) -> List[Dict[str, Any]]:
        """
        Trouve les réponses les plus similaires à une question
        
        Args:
            question: La question de l'utilisateur
            k: Nombre de résultats à retourner
            use_context: Si True, utilise les contextes pour la similarité
        
        Returns:
            Liste des résultats classés par similarité
        """
        if not self.vectorizer:
            print("❌ Aucun modèle chargé. Entraînez ou chargez un modèle d'abord.")
            return []
        
        # Vérifier si la question concerne un cas spécifique
        case_match = self._extract_case_id(question)
        if case_match and self.config["use_case_memory"]:
            case_id = case_match.group(1).upper()
            case = self.case_memory.find_case_by_id(case_id)
            if case:
                summary = self.case_memory.get_case_summary(case_id)
                return [{
                    "question": f"Cas DPAI {case_id}: {case.get('title', '')}",
                    "answer": summary,
                    "similarity": 0.99,
                    "source": "dpai_case_memory",
                    "tags": ["case_study", case_id.lower()] + case.get("tags", []),
                    "case_id": case_id,
                    "is_case": True
                }]
        
        # Recherche dans l'IA de base
        question_vector = self.vectorizer.transform([question])
        
        if use_context and self.vectorized_contexts is not None:
            similarities = cosine_similarity(question_vector, self.vectorized_contexts)[0]
        else:
            similarities = cosine_similarity(question_vector, self.vectorized_questions)[0]
        
        top_k_indices = np.argsort(similarities)[::-1][:k]
        
        results = []
        for idx in top_k_indices:
            similarity = float(similarities[idx])
            if similarity < self.config["similarity_threshold"]:
                continue
            
            results.append({
                "question": self.training_data[idx]["question"],
                "answer": self.training_data[idx]["answer"],
                "similarity": similarity,
                "source": self.training_data[idx].get("source", "unknown"),
                "tags": self.training_data[idx].get("tags", []),
                "index": idx
            })
        
        # Ajouter des résultats depuis la mémoire des cas si activé
        if self.config["use_case_memory"]:
            case_results = self._find_similar_cases(question, k=2)
            results.extend(case_results)
        
        # Trier par similarité
        results.sort(key=lambda x: x["similarity"], reverse=True)
        
        return results[:k]
    
    def _extract_case_id(self, question: str) -> Optional[Any]:
        match = re.search(r'(case[-\s]?\d+)', question, re.IGNORECASE)
        return match
    
    def _find_similar_cases(self, question: str, k: int = 2) -> List[Dict[str, Any]]:
        relevant_cases = self.case_memory.search_cases(question, limit=k)
        results = []
        for case in relevant_cases:
            case_id = case.get("id", "UNKNOWN")
            summary = self.case_memory.get_case_summary(case_id)
            similarity = self._estimate_case_similarity(question, case)
            if similarity >= self.config["case_similarity_threshold"]:
                results.append({
                    "question": f"Cas DPAI {case_id}: {case.get('title', '')}",
                    "answer": summary,
                    "similarity": float(similarity),
                    "source": "dpai_case_memory",
                    "tags": ["case_study", case_id.lower()] + case.get("tags", []),
                    "case_id": case_id,
                    "is_case": True
                })
        return results
    
    def _estimate_case_similarity(self, question: str, case: Dict[str, Any]) -> float:
        query_lower = question.lower()
        score = 0.0
        if query_lower in case.get("title", "").lower():
            score += 0.3
        if query_lower in case.get("category", "").lower():
            score += 0.2
        if query_lower in case.get("type", "").lower():
            score += 0.2
        if query_lower in case.get("problem", "").lower():
            score += 0.4
        for tag in case.get("tags", []):
            if query_lower in tag.lower():
                score += 0.2
                break
        context = case.get("context", {})
        if isinstance(context, dict):
            for key, value in context.items():
                if isinstance(value, dict):
                    for k, v in value.items():
                        if query_lower in str(v).lower():
                            score += 0.1
                elif query_lower in str(value).lower():
                    score += 0.1
        return min(score, 1.0)
    
    def generate_response(self, question: str, use_history: bool = True, learning: bool = True) -> Dict[str, Any]:
        """
        Génère une réponse à une question
        
        Args:
            question: La question de l'utilisateur
            use_history: Si True, utilise l'historique des conversations
            learning: Si True, apprend de cette interaction
        
        Returns:
            Dictionnaire avec la réponse et les métadonnées
        """
        start_time = datetime.now()
        
        # Nettoyer la question (supprimer "Tu:", "tu:", etc.)
        clean_question = question.replace("Tu:", "").replace("tu:", "").replace("Tu ", "").replace("tu ", "").strip()
        clean_question = self._preprocess_text(clean_question)
        
        # Rechercher les réponses similaires
        similar_results = self.find_most_similar(clean_question, k=3)
        
        response_data = {
            "question": question,
            "timestamp": start_time.isoformat(),
            "similar_results": similar_results,
            "response": "",
            "confidence": 0.0,
            "source": "",
            "tags": []
        }
        
        if not similar_results:
            # Aucune réponse similaire trouvée
            response_data["response"] = (
                "Désolé, je n'ai pas trouvé de réponse à votre question dans mes données d'entraînement. "
                "Pourriez-vous reformuler ou me fournir plus de détails?"
            )
            response_data["confidence"] = 0.0
            response_data["source"] = "none"
        else:
            # Utiliser la meilleure correspondance
            best_result = similar_results[0]
            response_data["response"] = best_result["answer"]
            response_data["confidence"] = best_result["similarity"]
            response_data["source"] = best_result["source"]
            response_data["tags"] = best_result["tags"]
            
            # Ajouter des informations sur les autres résultats
            if len(similar_results) > 1:
                response_data["alternative_answers"] = [
                    {"answer": r["answer"][:200] + "..." if len(r["answer"]) > 200 else r["answer"],
                     "similarity": r["similarity"]}
                    for r in similar_results[1:]
                ]
        
        # Ajouter à l'historique
        if use_history:
            conversation_entry = {
                "question": question,
                "response": response_data["response"],
                "timestamp": start_time.isoformat(),
                "confidence": response_data["confidence"],
                "source": response_data["source"]
            }
            
            # Ajouter l'ID du cas si c'est une réponse de cas
            if response_data.get("case_id"):
                conversation_entry["case_id"] = response_data["case_id"]
            elif similar_results and len(similar_results) > 0:
                best = similar_results[0]
                if best.get("case_id"):
                    conversation_entry["case_id"] = best["case_id"]
            
            self.conversations.append(conversation_entry)
            
            # Limiter l'historique
            if len(self.conversations) > self.config["max_history"]:
                self.conversations = self.conversations[-self.config["max_history"]:]
        
        # Enregistrer dans la mémoire des cas si c'est une interaction avec un cas
        if response_data.get("case_id") and self.config["use_case_memory"]:
            case_id = response_data["case_id"]
            self.case_memory.record_interaction(
                case_id, 
                question, 
                response_data["response"], 
                response_data["confidence"]
            )
        
        # Ajouter des informations sur les cas pertinents
        if self.config["include_case_context"]:
            relevant_cases = self.case_memory.search_cases(question, limit=2)
            if relevant_cases:
                response_data["case_context"] = {
                    "relevant_cases": [
                        {
                            "id": c.get("id"),
                            "title": c.get("title"),
                            "sector": c.get("category"),
                            "type": c.get("type")
                        }
                        for c in relevant_cases
                    ]
                }
        
        # Apprendre de cette interaction (si la réponse était bonne)
        if learning and response_data["confidence"] > 0.5:
            self.learn(question, response_data["response"])
        
        response_data["processing_time"] = (datetime.now() - start_time).total_seconds()
        response_data["conversation_id"] = len(self.conversations) - 1 if use_history else None
        
        return response_data
    
    # =============================================================================
    # METHODES POUR LA MEMOIRE DES CAS
    # =============================================================================
    
    def get_case_summary(self, case_id: str) -> str:
        """Obtenir un résumé d'un cas"""
        return self.case_memory.get_case_summary(case_id)
    
    def find_related_cases(self, question: str, limit: int = 3) -> List[Dict[str, Any]]:
        """Trouver des cas liés à une question"""
        return self.case_memory.search_cases(question, limit)
    
    def get_case_insights(self, case_id: str) -> Dict[str, Any]:
        """Obtenir les insights d'un cas"""
        case = self.case_memory.find_case_by_id(case_id)
        if not case:
            return {"error": "Cas non trouvé"}
        return {
            "case_id": case_id,
            "title": case.get("title", ""),
            "sector": case.get("category", ""),
            "operation_type": case.get("type", ""),
            "key_findings": case.get("dpai_solution", {}).get("key_findings", []),
            "tools_used": case.get("dpai_solution", {}).get("tools_used", []),
            "lessons": case.get("lessons_learned", [])
        }
    
    def get_all_cases(self) -> List[Dict[str, Any]]:
        """Obtenir tous les cas"""
        return self.case_memory.cases
    
    def get_cases_by_sector(self, sector: str) -> List[Dict[str, Any]]:
        """Obtenir les cas par secteur"""
        return self.case_memory.find_cases_by_sector(sector)
    
    def get_cases_by_type(self, op_type: str) -> List[Dict[str, Any]]:
        """Obtenir les cas par type d'opération"""
        return self.case_memory.find_cases_by_type(op_type)
    
    def learn_from_case(self, case_id: str) -> bool:
        """Apprendre spécifiquement d'un cas"""
        case = self.case_memory.find_case_by_id(case_id)
        if not case:
            return False
        
        case_id = case.get("id", "UNKNOWN")
        title = case.get("title", "")
        
        pairs = [
            (f"Raconte le cas {case_id}", self.case_memory.get_case_summary(case_id)),
            (f"Quelles sont les leçons du cas {case_id} ?", 
             "\n".join([f"{i+1}. {l}" for i, l in enumerate(case.get("lessons_learned", []))])),
            (f"Quel était le problème dans le cas {case_id} ?", case.get("problem", "Non spécifié")),
            (f"Comment DPAI a résolu le cas {case_id} ?", 
             "\n".join([f"- {m}" for m in case.get("dpai_solution", {}).get("methodology", [])])),
        ]
        
        for q, a in pairs:
            self.learn(q, a, source="dpai_case_memory", tags=["case_study", case_id.lower()])
        
        return True
    
    def learn_from_all_cases(self) -> bool:
        """Apprendre de tous les cas d'école"""
        for case in self.case_memory.cases:
            case_id = case.get("id", "UNKNOWN")
            self.learn_from_case(case_id)
        return True
    
    def learn(self, question: str, answer: str, source: str = "user", tags: List[str] = None):
        """
        Ajoute une nouvelle paire question/réponse aux données d'entraînement
        
        Args:
            question: La question
            answer: La réponse
            source: Source de l'apprentissage
            tags: Tags pour catégoriser
        """
        if not self.config["learning_enabled"]:
            return False
        
        new_item = {
            "question": question,
            "answer": answer,
            "source": source,
            "tags": tags or []
        }
        
        self.training_data.append(new_item)
        
        # Re-entraîner le modèle (incrémental)
        print(f"📚 Apprentissage: Nouvelle paire Q/R ajoutée")
        
        # Re-vectoriser juste la nouvelle question
        if self.vectorizer:
            from scipy.sparse import vstack as sparse_vstack, csr_matrix
            new_question_vec = self.vectorizer.transform([question])
            # Convertir en format sparse si nécessaire
            if self.vectorized_questions is not None:
                # S'assurer que les deux sont au même format
                if not hasattr(self.vectorized_questions, 'toarray'):
                    self.vectorized_questions = csr_matrix(self.vectorized_questions)
                if not hasattr(new_question_vec, 'toarray'):
                    new_question_vec = csr_matrix(new_question_vec)
                self.vectorized_questions = sparse_vstack([self.vectorized_questions, new_question_vec])
            else:
                self.vectorized_questions = new_question_vec
            
            # Re-vectoriser le contexte
            context = f"{question} {' '.join(tags or [])} {source}"
            new_context_vec = self.vectorizer.transform([context])
            if self.vectorized_contexts is not None:
                if not hasattr(self.vectorized_contexts, 'toarray'):
                    self.vectorized_contexts = csr_matrix(self.vectorized_contexts)
                if not hasattr(new_context_vec, 'toarray'):
                    new_context_vec = csr_matrix(new_context_vec)
                self.vectorized_contexts = sparse_vstack([self.vectorized_contexts, new_context_vec])
            else:
                self.vectorized_contexts = new_context_vec
        
        # Sauvegarder les données mises à jour
        with open(self.data_dir / "training_data.json", 'w', encoding='utf-8') as f:
            json.dump(self.training_data, f, indent=2, ensure_ascii=False)
        
        # Sauvegarder le modèle mis à jour
        self.save_model()
        
        return True
    
    def get_conversation_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Récupère l'historique des conversations"""
        return self.conversations[-limit:] if limit else self.conversations
    
    def clear_history(self):
        """Efface l'historique des conversations"""
        self.conversations = []
        print("🧹 Historique des conversations effacé")
    
    def get_stats(self) -> Dict[str, Any]:
        """Récupère les statistiques du modèle"""
        base_stats = {
            "training_data_count": len(self.training_data),
            "vocabulary_size": len(self.vectorizer.get_feature_names_out()) if self.vectorizer else 0,
            "vectorized_shape": self.vectorized_questions.shape if self.vectorized_questions is not None else None,
            "conversations_count": len(self.conversations),
            "model_name": self.config["model_name"],
            "similarity_threshold": self.config["similarity_threshold"],
            "max_history": self.config["max_history"]
        }
        
        # Ajouter les stats des cas
        if self.case_memory.stats:
            base_stats["case_memory_stats"] = self.case_memory.stats
        
        return base_stats
    
    def reset(self):
        """Réinitialise le modèle"""
        self.training_data = []
        self.vectorizer = None
        self.vectorized_questions = None
        self.vectorized_contexts = None
        self.conversations = []
        print("🔄 Modèle réinitialisé")


# =============================================================================
# FONCTIONS UTILITAIRES
# =============================================================================

def extract_from_dpai_files(ai_core: DPAILocalAI, dpai_data_path: str):
    """
    Extrait les données d'entraînement depuis les fichiers DPAI existants
    
    Args:
        ai_core: Instance de DPAILocalAI
        dpai_data_path: Chemin vers les données DPAI (JSON ou JS)
    """
    print(f"  Extraction des donnees depuis {dpai_data_path}...")
    
    try:
        # Si c'est un fichier JS, le convertir en JSON
        if dpai_data_path.endswith('.js'):
            import re
            with open(dpai_data_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Extraire le tableau de données
            # Format: module.exports = [...]; ou export default [...];
            match = re.search(r'module\.exports\s*=\s*(\[.*?\])', content, re.DOTALL)
            if match:
                json_str = match.group(1)
                # Nettoyer pour en faire du JSON valide
                json_str = json_str.replace("SECTOR_DATA.", '"').replace(".growth", '"').replace(".ebitdaMultiple", '"')
                json_str = re.sub(r'(\w+):', r'"\1":', json_str)
                data = json.loads(json_str)
            else:
                print("❌ Impossible d'extraire les données du fichier JS")
                return False
        else:
            with open(dpai_data_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        
        # Ajouter les données au core
        existing_count = len(ai_core.training_data)
        for item in data:
            normalized = ai_core._normalize_training_item(item)
            if normalized:
                ai_core.training_data.append(normalized)
        
        new_count = len(ai_core.training_data) - existing_count
        print(f"✅ {new_count} nouveaux exemples ajoutés depuis {dpai_data_path}")
        
        # Sauvegarder
        with open(ai_core.data_dir / "training_data.json", 'w', encoding='utf-8') as f:
            json.dump(ai_core.training_data, f, indent=2, ensure_ascii=False)
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de l'extraction: {e}")
        import traceback
        traceback.print_exc()
        return False


# =============================================================================
# MEMOIRE DES CAS DPAI
# =============================================================================

class DPAICaseMemory:
    """Système de mémoire des cas d'école DPAI"""
    
    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.cases: List[Dict[str, Any]] = []
        self.cases_by_id: Dict[str, Dict[str, Any]] = {}
        self.cases_by_sector: Dict[str, List[Dict[str, Any]]] = {}
        self.cases_by_type: Dict[str, List[Dict[str, Any]]] = {}
        self.cases_by_tag: Dict[str, List[Dict[str, Any]]] = {}
        self.case_interactions: List[Dict[str, Any]] = []
        self.stats: Dict[str, Any] = {}
        self.load_cases()
    
    def load_cases(self, file_path: Optional[str] = None) -> bool:
        if file_path is None:
            possible_paths = [
                self.data_dir / "dpai_ecole_cases.json",
                self.data_dir / "cases" / "dpai_ecole_cases.json",
                Path("dpai_ecole_cases.json"),
            ]
            for path in possible_paths:
                if path.exists():
                    file_path = str(path)
                    break
            else:
                return False
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                self.cases = json.load(f)
            self._index_cases()
            self._calculate_stats()
            print(f"✅ Cas chargés: {len(self.cases)} cas d'école")
            return True
        except Exception as e:
            return False
    
    def _index_cases(self):
        self.cases_by_id = {case["id"]: case for case in self.cases}
        self.cases_by_sector = {}
        self.cases_by_type = {}
        self.cases_by_tag = {}
        
        for case in self.cases:
            sector = case.get("category", "unknown")
            if sector not in self.cases_by_sector:
                self.cases_by_sector[sector] = []
            self.cases_by_sector[sector].append(case)
            
            op_type = case.get("type", "unknown")
            if op_type not in self.cases_by_type:
                self.cases_by_type[op_type] = []
            self.cases_by_type[op_type].append(case)
            
            for tag in case.get("tags", []):
                if tag not in self.cases_by_tag:
                    self.cases_by_tag[tag] = []
                self.cases_by_tag[tag].append(case)
    
    def _calculate_stats(self):
        self.stats = {
            "total_cases": len(self.cases),
            "sectors": list(self.cases_by_sector.keys()),
            "types": list(self.cases_by_type.keys()),
            "all_tags": list(self.cases_by_tag.keys()),
            "cases_by_difficulty": {},
            "total_lessons": 0,
            "total_budget": 0,
            "avg_roi": 0
        }
        
        total_roi = 0
        roi_count = 0
        
        for case in self.cases:
            difficulty = case.get("difficulty", "unknown")
            self.stats["cases_by_difficulty"][difficulty] = self.stats["cases_by_difficulty"].get(difficulty, 0) + 1
            
            solution = case.get("dpai_solution", {})
            budget_str = solution.get("budget", "")
            if budget_str:
                budget_num = self._extract_number(budget_str)
                if budget_num:
                    self.stats["total_budget"] += budget_num
            
            results = case.get("results", {})
            financial = results.get("financial", {})
            roi_str = financial.get("roi", "")
            if roi_str:
                roi_num = self._extract_percentage(roi_str)
                if roi_num:
                    total_roi += roi_num
                    roi_count += 1
            
            self.stats["total_lessons"] += len(case.get("lessons_learned", []))
        
        if roi_count > 0:
            self.stats["avg_roi"] = total_roi / roi_count
        self.stats["total_budget_formatted"] = f"{self.stats['total_budget']:,.0f}€"
    
    def _extract_number(self, text: str) -> Optional[float]:
        match = re.search(r'[\d\s,]+', text)
        if match:
            num_str = match.group().replace(' ', '').replace(',', '')
            try:
                return float(num_str)
            except ValueError:
                pass
        return None
    
    def _extract_percentage(self, text: str) -> Optional[float]:
        match = re.search(r'([\d.]+)%', text)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                pass
        match = re.search(r'([\d.]+)', text)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                pass
        return None
    
    def find_case_by_id(self, case_id: str) -> Optional[Dict[str, Any]]:
        return self.cases_by_id.get(case_id)
    
    def find_cases_by_sector(self, sector: str) -> List[Dict[str, Any]]:
        return self.cases_by_sector.get(sector.lower(), [])
    
    def find_cases_by_type(self, op_type: str) -> List[Dict[str, Any]]:
        return self.cases_by_type.get(op_type.lower(), [])
    
    def find_cases_by_tag(self, tag: str) -> List[Dict[str, Any]]:
        return self.cases_by_tag.get(tag.lower(), [])
    
    def search_cases(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        query_lower = query.lower()
        results = []
        
        for case in self.cases:
            score = 0
            if query_lower in case.get("title", "").lower():
                score += 3
            if query_lower in case.get("category", "").lower():
                score += 2
            if query_lower in case.get("type", "").lower():
                score += 2
            if query_lower in case.get("problem", "").lower():
                score += 3
            for tag in case.get("tags", []):
                if query_lower in tag.lower():
                    score += 2
                    break
            
            context = case.get("context", {})
            if isinstance(context, dict):
                for key, value in context.items():
                    if isinstance(value, dict):
                        for k, v in value.items():
                            if query_lower in str(v).lower():
                                score += 1
                    elif query_lower in str(value).lower():
                        score += 1
            
            if score > 0:
                results.append({"case": case, "score": score, "id": case.get("id", "UNKNOWN")})
        
        results.sort(key=lambda x: x["score"], reverse=True)
        return [r["case"] for r in results[:limit]]
    
    def get_case_summary(self, case_id: str) -> str:
        case = self.find_case_by_id(case_id)
        if not case:
            return f"❌ Cas {case_id} non trouvé"
        
        context = case.get("context", {})
        company = context.get("company", {})
        target = context.get("target", {})
        
        summary_parts = [
            f"## Cas DPAI : {case.get('title', case_id)}",
            f"**ID:** {case_id} | **Secteur:** {case.get('category', 'N/A')} | **Type:** {case.get('type', 'N/A')}",
            f"**Difficulté:** {case.get('difficulty', 'N/A')}",
            "",
            "### Contexte",
            f"- **Entreprise:** {company.get('name', 'N/A')} ({company.get('sector', 'N/A')})",
            f"  - CA: {self._format_currency(company.get('revenue', 0))}",
            f"  - EBITDA: {self._format_currency(company.get('ebitda', 0))}",
            f"  - Employés: {company.get('employees', 'N/A')}",
        ]
        
        if target:
            summary_parts.append("")
            summary_parts.append("### Cible")
            summary_parts.append(f"- **Nom:** {target.get('name', 'N/A')}")
            summary_parts.append(f"- **CA:** {self._format_currency(target.get('revenue', 0))}")
            summary_parts.append(f"- **EBITDA:** {self._format_currency(target.get('ebitda', 0))}")
            summary_parts.append(f"- **Prix:** {self._format_currency(target.get('asking_price', target.get('acquisition_price', 0)))}")
        
        summary_parts.extend([
            "",
            "### Problématique",
            f"{case.get('problem', 'Non spécifié')}",
            "",
            "### Solution DPAI",
            f"- **Méthodologie:** {', '.join(case.get('dpai_solution', {}).get('methodology', []))}",
            f"- **Outils:** {', '.join(case.get('dpai_solution', {}).get('tools_used', []))}",
            f"- **Budget:** {case.get('dpai_solution', {}).get('budget', 'N/A')}",
            f"- **Recommandation:** {case.get('dpai_solution', {}).get('recommandation', 'N/A')}",
        ])
        
        results = case.get("results", {})
        financial = results.get("financial", {})
        strategic = results.get("strategic", [])
        
        if financial or strategic:
            summary_parts.append("")
            summary_parts.append("### Résultats")
            if financial:
                summary_parts.append("#### Financiers")
                for k, v in financial.items():
                    if isinstance(v, (int, float)):
                        summary_parts.append(f"- **{k.replace('_', ' ').title()}:** {self._format_currency(v)}")
                    else:
                        summary_parts.append(f"- **{k.replace('_', ' ').title()}:** {v}")
            if strategic:
                summary_parts.append("#### Stratégiques")
                for s in strategic:
                    summary_parts.append(f"- {s}")
            summary_parts.append(f"- **Outcome:** {results.get('outcome', 'N/A')}")
        
        lessons = case.get("lessons_learned", [])
        if lessons:
            summary_parts.append("")
            summary_parts.append("### Leçons Apprises")
            for i, lesson in enumerate(lessons, 1):
                summary_parts.append(f"{i}. {lesson}")
        
        return "\n".join(summary_parts)
    
    def _format_currency(self, amount: Any) -> str:
        if amount is None or amount == 0:
            return "N/A"
        try:
            amount = float(amount)
            if amount >= 1_000_000:
                return f"{amount/1_000_000:.1f}M€"
            elif amount >= 1_000:
                return f"{amount/1_000:.0f}k€"
            else:
                return f"{amount:.0f}€"
        except (ValueError, TypeError):
            return str(amount)
    
    def record_interaction(self, case_id: str, question: str, response: str, confidence: float) -> bool:
        interaction = {
            "timestamp": datetime.now().isoformat(),
            "case_id": case_id,
            "question": question,
            "response": response,
            "confidence": confidence
        }
        self.case_interactions.append(interaction)
        if len(self.case_interactions) > 500:
            self.case_interactions = self.case_interactions[-500:]
        return True


# =============================================================================
# EXEMPLE D'UTILISATION
# =============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("🧠 DPAI LOCAL AI - Test du Moteur")
    print("=" * 80)
    
    # Initialiser
    ai = DPAILocalAI()
    
    # Charger les données
    print("\n1. Chargement des données d'entraînement...")
    ai.load_training_data()
    
    # Entraîner
    print("\n2. Entraînement du modèle...")
    ai.train()
    
    # Tester
    print("\n3. Test avec des questions...")
    
    test_questions = [
        "Comment valoriser une entreprise SaaS avec 10M€ de CA ?",
        "Quels sont les pièges dans le rachat d'une PME industrielle ?",
        "Peux-tu faire une analyse SWOT pour TechCorp ?",
        "Comment structurer un LBO pour 20M€ ?",
        "Quelle est la méthodologie DPAI pour l'EdTech ?"
    ]
    
    for question in test_questions:
        print(f"\n💬 Question: {question}")
        response = ai.generate_response(question, use_history=False, learning=False)
        print(f"💡 Réponse: {response['response'][:200]}...")
        print(f"✅ Confiance: {response['confidence']:.2%}")
        print(f"⏱️  Temps: {response['processing_time']:.3f}s")
    
    # Statistiques
    print("\n4. Statistiques du modèle:")
    stats = ai.get_stats()
    for key, value in stats.items():
        print(f"   {key}: {value}")
    
    print("\n" + "=" * 80)
    print("✅ Test terminé!")
    print("=" * 80)

