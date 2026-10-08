#!/usr/bin/env python3
"""
DPAI Local AI Core - Moteur d'IA 100% local sans modle externe

Ce module implmente une IA qui:
1. Comprend les questions grce  la vectorisation
2. Trouve les rponses les plus pertinentes dans les donnes d'entranement
3. Apprend de nouvelles interactions
4. Fonctionne entirement en local

Technologies: TF-IDF, Similarit cosine, Apprentissage par mmorisation
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
            data_dir: Dossier contenant les donnes d'entranement
            models_dir: Dossier pour sauvegarder les modles entrans
        """
        self.data_dir = Path(data_dir)
        self.models_dir = Path(models_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.models_dir.mkdir(exist_ok=True)
        
        # Donnes d'entranement
        self.training_data: List[Dict[str, Any]] = []
        
        # Modle de vectorisation
        self.vectorizer: Optional[TfidfVectorizer] = None
        self.vectorized_questions: Optional[np.ndarray] = None
        self.vectorized_contexts: Optional[np.ndarray] = None
        
        # Mmoire des conversations
        self.conversations: List[Dict[str, Any]] = []
        
        # Configuration
        self.config = {
            "model_name": "dpai_local_v1",
            "max_history": 100,
            "similarity_threshold": 0.3,
            "min_response_length": 50,
            "use_context": True,
            "learning_enabled": True
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
                print(f"  Impossible de charger la config: {e}")
    
    def _save_config(self):
        """Sauvegarde la configuration"""
        config_path = self.models_dir / "config.json"
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(self.config, f, indent=2, ensure_ascii=False)
    
    def load_training_data(self, file_path: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Charge les donnes d'entranement depuis un fichier JSON
        
        Args:
            file_path: Chemin vers le fichier (sinon utilise data/training_data.json)
        
        Returns:
            Liste des exemples d'entranement
        """
        if file_path is None:
            # Chercher dans le dossier data
            data_file = self.data_dir / "training_data.json"
            if not data_file.exists():
                # Crer des donnes par dfaut bases sur tes exemples DPAI
                print(" Cration des donnes d'entranement par dfaut...")
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
            print(f" Charg {len(self.training_data)} exemples d'entranement depuis {data_file}")
            return self.training_data
            
        except FileNotFoundError:
            print(f" Fichier non trouv: {data_file}")
            return []
        except json.JSONDecodeError as e:
            print(f" Erreur JSON dans {data_file}: {e}")
            return []
        except Exception as e:
            print(f" Erreur lors du chargement: {e}")
            return []
    
    def _normalize_training_item(self, item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Normalise un item de donnes d'entranement pour notre format"""
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
                    "answer": "",  # Rponse vide,  complter
                    "source": "partial",
                    "tags": []
                }
        
        if normalized and normalized["question"] and normalized["answer"]:
            return normalized
        return None
    
    def _create_default_data(self):
        """Cre des donnes d'entranement par dfaut bases sur ton expertise DPAI"""
        default_data = [
            {
                "question": "Quelle est la mthodologie DPAI pour valoriser une entreprise SaaS avec 10M de CA et 3M d'EBITDA ?",
                "answer": "Chez DPAI, pour une entreprise SaaS avec ces caractristiques, nous utilisons une approche en 3 tapes :\n\n1. Analyse sectorielle : Dans le SaaS franais, les multiples moyens sont de 10-15x l'EBITDA. Avec 3M d'EBITDA, la fourchette de base est donc 30M - 45M.\n\n2. Ajustements spcifiques :\n   - Croissance : Si +20%/an  +2-3x le multiple  60M - 90M.\n   - Rtention clients : Si >90%  +1x le multiple.\n   - Marge brute : Si >80%  +0.5x le multiple.\n\n3. Recommandation finale : Pour une SaaS franaise avec ces mtriques, nous recommandons une valorisation entre 50M et 70M, selon la qualit du CA (rcurrent vs ponctuel).\n\nProchaine tape : Valider avec une Due Diligence financire pour confirmer la qualit des revenus.",
                "source": "dpai_default",
                "tags": ["valuation", "saas", "methodology"]
            },
            {
                "question": "Quels sont les piges  viter dans une ngociation de rachat d'une PME industrielle ?",
                "answer": "Voici les 5 piges majeurs que nous identifions chez DPAI lors du rachat d'une PME industrielle, avec nos solutions :\n\n1. Sous-estimer les cots de restructuration :\n   - Pige : Les PME industrielles ont souvent des processus obsoltes.\n   - Impact : Cots cachs de 500k  2M.\n   - Solution DPAI : Audit technique AVANT l'offre finale.\n\n2. Ignorer la culture d'entreprise :\n   - Pige : Culture forte et rsistante au changement.\n   - Impact : Rsistance au changement  chec de l'intgration.\n   - Solution DPAI : Immersion pr-acquisition (1 semaine) + ateliers de co-construction.\n\n3. Mauvaise valuation des stocks :\n   - Pige : Stocks sous-valus ou survalus.\n   - Impact : Dcalage de 10-20% sur la valorisation.\n   - Solution DPAI : Inventory audit par un expert sectoriel.\n\n4. Clauses de garantie de passif insuffisantes :\n   - Pige : Dettes fiscales ou sociales non dclares.\n   - Impact : Responsabilit pour l'acheteur.\n   - Solution DPAI : Garantie de passif sur 24 mois + rtention de 10% du prix sur compte squestre.\n\n5. Plan d'intgration trop optimiste :\n   - Pige : Sous-estimer le temps ncessaire.\n   - Impact : Pertes de productivit de 15-30%.\n   - Solution DPAI : Plan en 5 phases (3-6-12-18-24 mois) avec des KPI clairs.\n\nRecommandation DPAI : Budget : Prvoir 5-10% du prix d'achat pour les cots d'intgration.",
                "source": "dpai_default",
                "tags": ["negotiation", "pme", "industrial", "acquisition"]
            },
            {
                "question": "Comment structurer un LBO pour une acquisition  20M ?",
                "answer": "Chez DPAI, nous structurons les LBO pour les PME/ETI franaises selon ce modle test et optimis :\n\nStructure Type pour 20M (LBO Classique):\n| Poste | Montant () | % |\n|-------|-------------|---|\n| Prix d'achat | 20 000 000 | 100% |\n| Fonds propres | 5 000 000 | 25% |\n| Dette senior | 12 000 000 | 60% |\n| Dette mezzanine | 3 000 000 | 15% |\n| Total | 20 000 000 | 100% |\n\nDtail des Sources de Financement:\n1. Fonds propres (25%):\n   - Apport personnel : 1M-2M (10-15%)\n   - Private Equity : 3M-4M (15-20%)\n   - Explication : Les banques exigent un ratio dette/fonds propres  4x.\n\n2. Dette senior (60%):\n   - Taux : 4-6%\n   - Dure : 5-7 ans\n   - Garanties : Actifs de la cible + caution personnelle.\n\n3. Dette mezzanine (15%):\n   - Taux : 8-12% (intrt + warrant)\n   - Dure : 5-8 ans\n   - Avantage : Complte le financement sans diluer davantage.\n\nParamtres Cls  Ngocier:\n| Paramtre | Valeur Standard | Recommandation DPAI |\n|-----------|-----------------|----------------------|\n| Leverage Ratio | 4-6x | Max 5x |\n| Taux dette senior | 4-6% | Ngocier <5% |\n| Dure dette | 5-7 ans | 7 ans |\n\nRecommandations DPAI :\n- Ngocier un earn-out : 10% du prix (2M) sur 3 ans si objectifs atteints\n- Prvoir un cash buffer : 1M pour les imprvus\n- Choisir une dette senior amortissable",
                "source": "dpai_default",
                "tags": ["lbo", "financing", "structure", "acquisition"]
            },
            {
                "question": "Ralise une analyse SWOT pour une entreprise EdTech appele TechCorp avec 5M de CA et 1M d'EBITDA",
                "answer": "## Analyse SWOT pour TechCorp (Secteur : EdTech)\n\nContexte : TechCorp est une PME franaise de l'EdTech avec 5M de CA, 1M d'EBITDA (20% de marge) et 50 employs.\n\n### Forces\n1. Marge brute leve (85%)  Impact : Rentabilit suprieure  la moyenne du secteur (70%).\n2. 95% de revenus rcurrents  Impact : Stabilit financire.\n3. Partenariat exclusif avec Microsoft Azure  Impact : Rduction de 15% des cots cloud.\n\n### Faiblesses\n1. Dpendance  un client (30% du CA)  Risque : -3M/an en cas de perte.\n    Solution DPAI : Diversifier le portefeuille clients en ciblant les collges et lyces.\n2. Pas de brevet sur le produit phare  Risque : Copie par des concurrents.\n    Solution DPAI : Budget de 50k pour dposer un brevet sous 6 mois.\n\n### Opportunits\n1. Croissance du march EdTech (+12-15%/an)  Potentiel : +1M-2M de CA/an.\n2. Faiblesse de SchoolMint sur le march franais  Potentiel : Acquisition possible.\n3. Subventions BPI France pour l'innovation  Potentiel : 500k de financement.\n\n### Menaces\n1. Microsoft lance un concurrent direct  Impact : -2M de CA.\n    Solution DPAI : Surveiller via notre outil de veille concurrentielle.\n2. RGPD 2.0 en 2025  Impact : Cot de conformit estim  200k/an.\n3. Inflation des cots cloud (+15% en 2024)  Impact : -500k/an.\n\n### Recommandations Stratgiques (DPAI)\n1. Diversifier le portefeuille clients  ROI estim : +2M de CA/an.\n2. Dposer un brevet  ROI estim : viter une perte de 5M/an.\n3. Optimiser les cots cloud  ROI estim : -200k/an.\n4. Lancer une campagne de marketing B2B  ROI estim : +1M de CA/an.",
                "source": "dpai_default",
                "tags": ["swot", "edtech", "analysis", "strategy"]
            },
            {
                "question": "Analyse les 5 Forces de Porter pour un SaaS B2B avec 10M de CA",
                "answer": "## Analyse Porter 5 Forces pour SaaS B2B (CA : 10M)\n\n1. Pouvoir de ngociation des clients :\n   - Niveau : lev\n   - Explication : Clients professionnels avec budget important mais exigeants\n   - Impact : Pression sur les prix\n   - Recommandation DPAI : Proposer des contrats longs (2-3 ans)\n\n2. Pouvoir de ngociation des fournisseurs :\n   - Niveau : Faible\n   - Explication : Nombreux fournisseurs cloud (AWS, GCP, Azure)\n   - Impact : Cots matriss\n\n3. Menace des nouveaux entrants :\n   - Niveau : Modr\n   - Barrires : Cots de dveloppement, rseau de distribution\n   - Risque : Concurrence accrue\n\n4. Menace des produits de substitution :\n   - Niveau : Faible\n   - Alternatives : Solutions internes des clients\n\n5. Intensit de la rivalit :\n   - Niveau : lev\n   - Concurrence : Salesforce, HubSpot, SAP\n   - Recommandation DPAI : Se diffrencier par le service client\n\nSynthse : Force concurrentielle globale : Modre\nProchaines tapes : Lancer une campagne de fidlisation",
                "source": "dpai_default",
                "tags": ["porter", "analysis", "saas", "b2b", "strategy"]
            }
        ]
        
        # Sauvegarder
        with open(self.data_dir / "training_data.json", 'w', encoding='utf-8') as f:
            json.dump(default_data, f, indent=2, ensure_ascii=False)
        
        print(f" Donnes par dfaut cres: {len(default_data)} exemples")
    
    def train(self, save_model: bool = True) -> bool:
        """
        Entrane le modle d'IA sur les donnes charges
        
        Args:
            save_model: Si True, sauvegarde le modle entran
        
        Returns:
            True si l'entranement a russi
        """
        if not self.training_data:
            print(" Aucune donne d'entranement charge. Utilisez load_training_data() d'abord.")
            return False
        
        print(f" Dbut de l'entranement sur {len(self.training_data)} exemples...")
        
        try:
            # Extraire questions et rponses
            questions = [item["question"] for item in self.training_data]
            answers = [item["answer"] for item in self.training_data]
            
            # Crer le contexte pour chaque question (question + tags + source)
            contexts = []
            for item in self.training_data:
                context_parts = [item["question"]]
                if item.get("tags"):
                    context_parts.extend(item["tags"])
                if item.get("source"):
                    context_parts.append(item["source"])
                contexts.append(" ".join(context_parts))
            
            # Initialiser et adapter le vectoriseur TF-IDF
            # Liste de stop words franaises courantes
            french_stop_words = [
                'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'est', 'en', 'pour', 'par',
                'sur', 'avec', 'au', 'aux', 'ce', 'cette', 'ces', 'qui', 'que', 'dont', 'o', 'se',
                'ne', 'pas', 'plus', 'sont', 'ont', 't', 'tre', 'avoir', 'a', '', 'il', 'elle',
                'on', 'nous', 'vous', 'ils', 'elles', 'son', 'sa', 'ses', 'mon', 'ma', 'mes', 'ton',
                'ta', 'tes', 'notre', 'votre', 'leur', 'leurs', 'ceux', 'celles', 'celui', 'celle',
                'd', 'l', 'qu', 'm', 't', 's', 'n', 'j', 'c', 'dans', 'suivant', 'suivante'
            ]
            self.vectorizer = TfidfVectorizer(
                max_features=10000,
                stop_words=french_stop_words,
                ngram_range=(1, 3),
                min_df=2,
                max_df=0.8
            )
            
            # Vectoriser les questions et les contextes
            self.vectorized_questions = self.vectorizer.fit_transform(questions)
            self.vectorized_contexts = self.vectorizer.transform(contexts)
            
            print(f" Entranement termin!")
            print(f"   - Vocabulaire: {len(self.vectorizer.get_feature_names_out())} termes")
            print(f"   - Vecteurs: {self.vectorized_questions.shape}")
            
            if save_model:
                self.save_model()
            
            return True
            
        except Exception as e:
            print(f" Erreur lors de l'entranement: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def save_model(self):
        """Sauvegarde le modle entran sur le disque"""
        if not self.vectorizer or not self.vectorized_questions:
            print(" Aucun modle  sauvegarder. Entranez d'abord le modle.")
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
            
            print(f" Modle sauvegard: {model_path}")
            return True
            
        except Exception as e:
            print(f" Erreur lors de la sauvegarde: {e}")
            return False
    
    def load_model(self):
        """Charge un modle entran depuis le disque"""
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
            
            print(f" Modle charg: {model_path}")
            print(f"   - Exemples d'entranement: {len(self.training_data)}")
            return True
            
        except Exception as e:
            print(f" Erreur lors du chargement du modle: {e}")
            return False
    
    def _preprocess_text(self, text: str) -> str:
        """Prtraite le texte pour la vectorisation"""
        # Nettoyer le texte
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)  # Supprimer la ponctuation
        text = re.sub(r'\s+', ' ', text)  # Supprimer les espaces multiples
        text = text.strip()
        return text
    
    def find_most_similar(self, question: str, k: int = 3, use_context: bool = True) -> List[Dict[str, Any]]:
        """
        Trouve les rponses les plus similaires  une question
        
        Args:
            question: La question de l'utilisateur
            k: Nombre de rsultats  retourner
            use_context: Si True, utilise les contextes pour la similarit
        
        Returns:
            Liste des rsultats classs par similarit
        """
        if not self.vectorizer:
            print(" Aucun modle charg. Entranez ou chargez un modle d'abord.")
            return []
        
        # Vectoriser la question
        question_vector = self.vectorizer.transform([question])
        
        # Calculer la similarit
        if use_context and self.vectorized_contexts is not None:
            similarities = cosine_similarity(question_vector, self.vectorized_contexts)[0]
        else:
            similarities = cosine_similarity(question_vector, self.vectorized_questions)[0]
        
        # Obtenir les indices des top k
        top_k_indices = np.argsort(similarities)[::-1][:k]
        
        # Crer les rsultats
        results = []
        for idx in top_k_indices:
            similarity = float(similarities[idx])
            if similarity < self.config["similarity_threshold"]:
                continue  # Ignorer les rsultats peu pertinents
            
            results.append({
                "question": self.training_data[idx]["question"],
                "answer": self.training_data[idx]["answer"],
                "similarity": similarity,
                "source": self.training_data[idx].get("source", "unknown"),
                "tags": self.training_data[idx].get("tags", []),
                "index": idx
            })
        
        return results
    
    def generate_response(self, question: str, use_history: bool = True, learning: bool = True) -> Dict[str, Any]:
        """
        Gnre une rponse  une question
        
        Args:
            question: La question de l'utilisateur
            use_history: Si True, utilise l'historique des conversations
            learning: Si True, apprend de cette interaction
        
        Returns:
            Dictionnaire avec la rponse et les mtadonnes
        """
        start_time = datetime.now()
        
        # Nettoyer la question
        clean_question = self._preprocess_text(question)
        
        # Rechercher les rponses similaires
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
            # Aucune rponse similaire trouve
            response_data["response"] = (
                "Dsol, je n'ai pas trouv de rponse  votre question dans mes donnes d'entranement. "
                "Pourriez-vous reformuler ou me fournir plus de dtails?"
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
            
            # Ajouter des informations sur les autres rsultats
            if len(similar_results) > 1:
                response_data["alternative_answers"] = [
                    {"answer": r["answer"][:200] + "..." if len(r["answer"]) > 200 else r["answer"],
                     "similarity": r["similarity"]}
                    for r in similar_results[1:]
                ]
        
        # Ajouter  l'historique
        if use_history:
            self.conversations.append({
                "question": question,
                "response": response_data["response"],
                "timestamp": start_time.isoformat(),
                "confidence": response_data["confidence"],
                "source": response_data["source"]
            })
            
            # Limiter l'historique
            if len(self.conversations) > self.config["max_history"]:
                self.conversations = self.conversations[-self.config["max_history"]:]
        
        # Apprendre de cette interaction (si la rponse tait bonne)
        if learning and response_data["confidence"] > 0.5:
            self.learn(question, response_data["response"])
        
        response_data["processing_time"] = (datetime.now() - start_time).total_seconds()
        response_data["conversation_id"] = len(self.conversations) - 1 if use_history else None
        
        return response_data
    
    def learn(self, question: str, answer: str, source: str = "user", tags: List[str] = None):
        """
        Ajoute une nouvelle paire question/rponse aux donnes d'entranement
        
        Args:
            question: La question
            answer: La rponse
            source: Source de l'apprentissage
            tags: Tags pour catgoriser
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
        
        # Re-entraner le modle (incrmental)
        print(f" Apprentissage: Nouvelle paire Q/R ajoute")
        
        # Re-vectoriser juste la nouvelle question
        if self.vectorizer:
            new_question_vec = self.vectorizer.transform([question])
            if self.vectorized_questions is not None:
                self.vectorized_questions = np.vstack([self.vectorized_questions, new_question_vec])
            
            # Re-vectoriser le contexte
            context = f"{question} {' '.join(tags or [])} {source}"
            new_context_vec = self.vectorizer.transform([context])
            if self.vectorized_contexts is not None:
                self.vectorized_contexts = np.vstack([self.vectorized_contexts, new_context_vec])
        
        # Sauvegarder les donnes mises  jour
        with open(self.data_dir / "training_data.json", 'w', encoding='utf-8') as f:
            json.dump(self.training_data, f, indent=2, ensure_ascii=False)
        
        # Sauvegarder le modle mis  jour
        self.save_model()
        
        return True
    
    def get_conversation_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Rcupre l'historique des conversations"""
        return self.conversations[-limit:] if limit else self.conversations
    
    def clear_history(self):
        """Efface l'historique des conversations"""
        self.conversations = []
        print(" Historique des conversations effac")
    
    def get_stats(self) -> Dict[str, Any]:
        """Rcupre les statistiques du modle"""
        return {
            "training_data_count": len(self.training_data),
            "vocabulary_size": len(self.vectorizer.get_feature_names_out()) if self.vectorizer else 0,
            "vectorized_shape": self.vectorized_questions.shape if self.vectorized_questions is not None else None,
            "conversations_count": len(self.conversations),
            "model_name": self.config["model_name"],
            "similarity_threshold": self.config["similarity_threshold"],
            "max_history": self.config["max_history"]
        }
    
    def reset(self):
        """Rinitialise le modle"""
        self.training_data = []
        self.vectorizer = None
        self.vectorized_questions = None
        self.vectorized_contexts = None
        self.conversations = []
        print(" Modle rinitialis")


# =============================================================================
# FONCTIONS UTILITAIRES
# =============================================================================

def extract_from_dpai_files(ai_core: DPAILocalAI, dpai_data_path: str):
    """
    Extrait les donnes d'entranement depuis les fichiers DPAI existants
    
    Args:
        ai_core: Instance de DPAILocalAI
        dpai_data_path: Chemin vers les donnes DPAI (JSON ou JS)
    """
    print(f"  Extraction des donnees depuis {dpai_data_path}...")
    
    try:
        # Si c'est un fichier JS, le convertir en JSON
        if dpai_data_path.endswith('.js'):
            import re
            with open(dpai_data_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Extraire le tableau de donnes
            # Format: module.exports = [...]; ou export default [...];
            match = re.search(r'module\.exports\s*=\s*(\[.*?\])', content, re.DOTALL)
            if match:
                json_str = match.group(1)
                # Nettoyer pour en faire du JSON valide
                json_str = json_str.replace("SECTOR_DATA.", '"').replace(".growth", '"').replace(".ebitdaMultiple", '"')
                json_str = re.sub(r'(\w+):', r'"\1":', json_str)
                data = json.loads(json_str)
            else:
                print(" Impossible d'extraire les donnes du fichier JS")
                return False
        else:
            with open(dpai_data_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        
        # Ajouter les donnes au core
        existing_count = len(ai_core.training_data)
        for item in data:
            normalized = ai_core._normalize_training_item(item)
            if normalized:
                ai_core.training_data.append(normalized)
        
        new_count = len(ai_core.training_data) - existing_count
        print(f" {new_count} nouveaux exemples ajouts depuis {dpai_data_path}")
        
        # Sauvegarder
        with open(ai_core.data_dir / "training_data.json", 'w', encoding='utf-8') as f:
            json.dump(ai_core.training_data, f, indent=2, ensure_ascii=False)
        
        return True
        
    except Exception as e:
        print(f" Erreur lors de l'extraction: {e}")
        import traceback
        traceback.print_exc()
        return False


# =============================================================================
# EXEMPLE D'UTILISATION
# =============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print(" DPAI LOCAL AI - Test du Moteur")
    print("=" * 80)
    
    # Initialiser
    ai = DPAILocalAI()
    
    # Charger les donnes
    print("\n1. Chargement des donnes d'entranement...")
    ai.load_training_data()
    
    # Entraner
    print("\n2. Entranement du modle...")
    ai.train()
    
    # Tester
    print("\n3. Test avec des questions...")
    
    test_questions = [
        "Comment valoriser une entreprise SaaS avec 10M de CA ?",
        "Quels sont les piges dans le rachat d'une PME industrielle ?",
        "Peux-tu faire une analyse SWOT pour TechCorp ?",
        "Comment structurer un LBO pour 20M ?",
        "Quelle est la mthodologie DPAI pour l'EdTech ?"
    ]
    
    for question in test_questions:
        print(f"\n Question: {question}")
        response = ai.generate_response(question, use_history=False, learning=False)
        print(f" Rponse: {response['response'][:200]}...")
        print(f" Confiance: {response['confidence']:.2%}")
        print(f"  Temps: {response['processing_time']:.3f}s")
    
    # Statistiques
    print("\n4. Statistiques du modle:")
    stats = ai.get_stats()
    for key, value in stats.items():
        print(f"   {key}: {value}")
    
    print("\n" + "=" * 80)
    print(" Test termin!")
    print("=" * 80)
