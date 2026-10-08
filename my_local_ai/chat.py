#!/usr/bin/env python3
"""
DPAI Local AI - Interface Terminal

Interface en ligne de commande pour interagir avec votre IA locale.
Fonctionnalités:
- Mode conversation interactif
- Mode questions/réponses direct
- Apprentissage en temps réel
- Gestion des données d'entraînement
- Statistiques et diagnostics
"""

import sys
import os
import json
import argparse
from pathlib import Path
from typing import Optional

# Ajouter le dossier parent au path pour importer ai_core
sys.path.insert(0, str(Path(__file__).parent))

from ai_core import DPAILocalAI


class DPAIChatInterface:
    """Interface de chat pour l'IA locale DPAI"""
    
    def __init__(self, data_dir: str = "data", models_dir: str = "models"):
        """
        Initialise l'interface de chat
        
        Args:
            data_dir: Dossier des données
            models_dir: Dossier des modèles
        """
        self.ai = DPAILocalAI(data_dir, models_dir)
        self.colors = {
            "reset": "\033[0m",
            "bold": "\033[1m",
            "red": "\033[91m",
            "green": "\033[92m",
            "yellow": "\033[93m",
            "blue": "\033[94m",
            "magenta": "\033[95m",
            "cyan": "\033[96m",
            "white": "\033[97m"
        }
    
    def print_colored(self, text: str, color: str = "white", **kwargs):
        """Affiche du texte en couleur"""
        if kwargs.get("bold", False):
            text = self.colors["bold"] + text
        print(f"{self.colors.get(color, '')}{text}{self.colors['reset']}", **{k: v for k, v in kwargs.items() if k != "bold"})
    
    def print_header(self, title: str):
        """Affiche un en-tête stylisé"""
        print()
        self.print_colored("=" * 80, "cyan")
        self.print_colored(f"  {title}", "cyan", bold=True)
        self.print_colored("=" * 80, "cyan")
        print()
    
    def print_divider(self):
        """Affiche un séparateur"""
        self.print_colored("-" * 80, "gray")
    
    def load_dpai_data(self, dpai_file: str):
        """Charge les données depuis les fichiers DPAI existants"""
        from ai_core import extract_from_dpai_files
        
        self.print_header("Chargement des données DPAI")
        
        # Chemin complet
        dpai_path = Path(dpai_file)
        if not dpai_path.exists():
            self.print_colored(f"❌ Fichier non trouvé: {dpai_file}", "red")
            return False
        
        success = extract_from_dpai_files(self.ai, str(dpai_path))
        
        if success:
            self.print_colored("✅ Données chargées avec succès!", "green")
            # Re-entraîner
            self.print_colored("🚀 Ré-entraînement du modèle...", "yellow")
            self.ai.train()
            return True
        else:
            self.print_colored("❌ Échec du chargement des données", "red")
            return False
    
    def train_from_file(self, file_path: str):
        """Entraîne le modèle avec un fichier spécifique"""
        self.print_header("Entraînement avec fichier personnalisé")
        
        self.ai.load_training_data(file_path)
        self.ai.train()
        
        self.print_colored(f"✅ Modèle entraîné avec {len(self.ai.training_data)} exemples", "green")
    
    def interactive_chat(self):
        """Mode chat interactif"""
        self.print_header("DPAI Local AI - Mode Chat")
        
        print("💡 Conseils:")
        self.print_colored("  - Tapez votre question pour obtenir une réponse", "blue")
        self.print_colored("  - Tapez '/quit' ou '/exit' pour quitter", "blue")
        self.print_colored("  - Tapez '/help' pour plus d'options", "blue")
        self.print_colored("  - Tapez '/stats' pour voir les statistiques", "blue")
        self.print_colored("  - Tapez '/history' pour voir l'historique", "blue")
        self.print_colored("  - Tapez '/clear' pour effacer l'historique", "blue")
        self.print_colored("  - Tapez '/learn' pour activer/désactiver l'apprentissage", "blue")
        print()
        
        while True:
            try:
                # Afficher le prompt
                learning_status = "ON" if self.ai.config["learning_enabled"] else "OFF"
                user_input = input(f"💬 Vous ({learning_status}): ").strip()
                
                if not user_input:
                    continue
                
                # Commandes spéciales
                if user_input.lower() in ['/quit', '/exit', 'quit', 'exit']:
                    self.print_colored("👋 Au revoir!", "green")
                    break
                
                if user_input.lower() in ['/help', 'help', '?']:
                    self._show_help()
                    continue
                
                if user_input.lower() in ['/stats', 'stats']:
                    self._show_stats()
                    continue
                
                if user_input.lower() in ['/history', 'history']:
                    self._show_history()
                    continue
                
                if user_input.lower() in ['/clear', 'clear']:
                    self.ai.clear_history()
                    self.print_colored("✅ Historique effacé", "green")
                    continue
                
                if user_input.lower() in ['/learn', 'learn']:
                    self.ai.config["learning_enabled"] = not self.ai.config["learning_enabled"]
                    learning_status = "activé" if self.ai.config["learning_enabled"] else "désactivé"
                    self.print_colored(f"✅ Apprentissage {learning_status}", "green")
                    continue
                
                if user_input.lower() in ['/train', 'train']:
                    self.ai.train()
                    self.print_colored("✅ Modèle ré-entraîné", "green")
                    continue
                
                # Traiter la question
                response = self.ai.generate_response(
                    user_input,
                    use_history=True,
                    learning=self.ai.config["learning_enabled"]
                )
                
                # Afficher la réponse
                self._display_response(response)
                
            except KeyboardInterrupt:
                print()
                self.print_colored("👋 Au revoir!", "green")
                break
            except Exception as e:
                self.print_colored(f"❌ Erreur: {e}", "red")
    
    def _display_response(self, response: dict):
        """Affiche une réponse de manière formatée"""
        print()
        
        # Réponse principale
        self.print_colored("🤖 DPAI AI:", "green", bold=True)
        print(f"{response['response']}")
        print()
        
        # Métadonnées
        self.print_colored(f"✅ Confiance: {response['confidence']:.1%}", "blue")
        self.print_colored(f"⏱️  Temps: {response['processing_time']:.3f}s", "blue")
        
        if response.get("source"):
            self.print_colored(f"📚 Source: {response['source']}", "yellow")
        
        if response.get("tags"):
            tags_str = ", ".join(response["tags"])
            self.print_colored(f"🏷️  Tags: {tags_str}", "yellow")
        
        # Alternatives si elles existent
        if response.get("alternative_answers"):
            print()
            self.print_colored("🔄 Réponses alternatives:", "magenta")
            for i, alt in enumerate(response["alternative_answers"], 1):
                self.print_colored(f"  {i}. {alt['answer']}... (confiance: {alt['similarity']:.1%})", "magenta")
        
        print()
        self.print_divider()
    
    def _show_help(self):
        """Affiche l'aide"""
        self.print_header("Aide - Commandes disponibles")
        
        commands = [
            ("Quitter", ["/quit", "/exit", "quit", "exit"]),
            ("Aide", ["/help", "help", "?"]),
            ("Statistiques", ["/stats", "stats"]),
            ("Historique", ["/history", "history"]),
            ("Effacer historique", ["/clear", "clear"]),
            ("Apprentissage", ["/learn", "learn"]),
            ("Ré-entraîner", ["/train", "train"]),
        ]
        
        for title, cmds in commands:
            self.print_colored(f"{title}:", "green", bold=True)
            if isinstance(cmds, list):
                print(f"  {', '.join(cmds)}")
            else:
                print(f"  {cmds}")
        
        print()
        self.print_colored("💡 Pour poser une question, tapez simplement votre question.", "blue")
        print()
    
    def _show_stats(self):
        """Affiche les statistiques"""
        stats = self.ai.get_stats()
        
        self.print_header("Statistiques du Modèle")
        
        self.print_colored("Données d'entraînement:", "green", bold=True)
        self.print_colored(f"  - Nombre d'exemples: {stats['training_data_count']}", "blue")
        self.print_colored(f"  - Taille du vocabulaire: {stats['vocabulary_size']}", "blue")
        
        if stats['vectorized_shape']:
            self.print_colored(f"  - Forme des vecteurs: {stats['vectorized_shape']}", "blue")
        
        self.print_colored("Conversations:", "green", bold=True)
        self.print_colored(f"  - Nombre: {stats['conversations_count']}", "blue")
        self.print_colored(f"  - Historique max: {stats['max_history']}", "blue")
        
        self.print_colored("Configuration:", "green", bold=True)
        self.print_colored(f"  - Seuil de similarité: {stats['similarity_threshold']:.1%}", "blue")
        self.print_colored(f"  - Apprentissage: {'ON' if self.ai.config['learning_enabled'] else 'OFF'}", "blue")
        
        print()
    
    def _show_history(self):
        """Affiche l'historique des conversations"""
        history = self.ai.get_conversation_history(limit=20)
        
        if not history:
            self.print_colored("ℹ️  Aucun historique de conversation", "yellow")
            return
        
        self.print_header("Historique des Conversations")
        
        for i, conv in enumerate(history, 1):
            self.print_colored(f"{i}. Question: {conv['question'][:100]}...", "blue")
            self.print_colored(f"   Réponse: {conv['response'][:150]}...", "green")
            self.print_colored(f"   Confiance: {conv['confidence']:.1%} | Source: {conv['source']}", "yellow")
            print()
    
    def ask_question(self, question: str):
        """Pose une question et affiche la réponse"""
        self.print_header("Mode Question/Réponse")
        
        response = self.ai.generate_response(
            question,
            use_history=True,
            learning=self.ai.config["learning_enabled"]
        )
        
        self._display_response(response)
    
    def evaluate_model(self):
        """Évalue le modèle avec des questions de test"""
        self.print_header("Évaluation du Modèle")
        
        # Questions de test basées sur ton domaine
        test_questions = [
            "Quelle est la méthodologie DPAI pour valoriser une entreprise SaaS ?",
            "Quels sont les pièges dans une négociation de rachat ?",
            "Comment structurer un LBO pour une acquisition ?",
            "Peux-tu faire une analyse SWOT ?",
            "Quelle est l'analyse Porter 5 Forces ?"
        ]
        
        print("📋 Questions de test:")
        for i, q in enumerate(test_questions, 1):
            print(f"  {i}. {q}")
        print()
        
        results = []
        for question in test_questions:
            response = self.ai.generate_response(question, use_history=False, learning=False)
            results.append({
                "question": question,
                "confidence": response["confidence"],
                "has_answer": bool(response["response"])
            })
        
        # Statistiques
        avg_confidence = sum(r["confidence"] for r in results) / len(results)
        all_answered = all(r["has_answer"] for r in results)
        
        self.print_colored(f"Moyenne de confiance: {avg_confidence:.1%}", "green")
        self.print_colored(f"Toutes les questions ont une réponse: {all_answered}", "green")
        
        print()
        
        # Détails
        for result in results:
            status = "✅" if result["has_answer"] else "❌"
            self.print_colored(f"{status} {result['question'][:60]}... - Confiance: {result['confidence']:.1%}", "blue")
    
    def add_training_data(self, question: str, answer: str, source: str = "user", tags: str = ""):
        """Ajoute manuellement des données d'entraînement"""
        self.print_header("Ajout de Données d'Entraînement")
        
        tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
        
        success = self.ai.learn(question, answer, source, tag_list)
        
        if success:
            self.print_colored(f"✅ Nouvelle paire Q/R ajoutée et apprise", "green")
            print(f"   Question: {question[:100]}...")
            print(f"   Réponse: {answer[:100]}...")
            if tag_list:
                print(f"   Tags: {', '.join(tag_list)}")
        else:
            self.print_colored("❌ Échec de l'ajout", "red")
    
    def export_conversation(self, file_path: str):
        """Exporte l'historique des conversations"""
        history = self.ai.get_conversation_history()
        
        if not history:
            self.print_colored("ℹ️  Aucun historique à exporter", "yellow")
            return
        
        export_path = Path(file_path)
        with open(export_path, 'w', encoding='utf-8') as f:
            json.dump(history, f, indent=2, ensure_ascii=False)
        
        self.print_colored(f"✅ Conversations exportées vers {export_path}", "green")
    
    def import_training_data(self, file_path: str):
        """Importe des données d'entraînement"""
        self.print_header("Import de Données d'Entraînement")
        
        try:
            self.ai.load_training_data(file_path)
            self.ai.train()
            self.print_colored(f"✅ {len(self.ai.training_data)} exemples importés et modèle entraîné", "green")
        except Exception as e:
            self.print_colored(f"❌ Erreur lors de l'import: {e}", "red")


def main():
    """Fonction principale"""
    parser = argparse.ArgumentParser(
        description="DPAI Local AI - Interface Terminal",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples d'utilisation:
  python chat.py                    # Mode interactif
  python chat.py --question "Comment valoriser une SaaS ?"
  python chat.py --eval             # Évaluer le modèle
  python chat.py --load-dpai ../functions/data/dpai-training-data.json
  python chat.py --add "question" "réponse" --tags "tag1,tag2"
        """
    )
    
    parser.add_argument(
        '--interactive', '-i',
        action='store_true',
        help='Mode chat interactif (par défaut)'
    )
    parser.add_argument(
        '--question', '-q',
        type=str,
        help='Pose une question directe'
    )
    parser.add_argument(
        '--eval', '-e',
        action='store_true',
        help='Évalue le modèle avec des questions de test'
    )
    parser.add_argument(
        '--add', '-a',
        nargs=2,
        metavar=('QUESTION', 'ANSWER'),
        help='Ajoute une paire question/réponse aux données d\'entraînement'
    )
    parser.add_argument(
        '--tags', '-t',
        type=str,
        default="",
        help='Tags pour la nouvelle donnée (séparés par des virgules)'
    )
    parser.add_argument(
        '--source', '-s',
        type=str,
        default="user",
        help='Source de la nouvelle donnée'
    )
    parser.add_argument(
        '--load-dpai',
        type=str,
        help='Charge les données depuis un fichier DPAI (JSON ou JS)'
    )
    parser.add_argument(
        '--load', '-l',
        type=str,
        help='Charge un fichier de données d\'entraînement personnalisé'
    )
    parser.add_argument(
        '--export',
        type=str,
        help='Exporte l\'historique des conversations vers un fichier'
    )
    parser.add_argument(
        '--stats',
        action='store_true',
        help='Affiche les statistiques du modèle'
    )
    parser.add_argument(
        '--data-dir',
        type=str,
        default="data",
        help='Dossier des données (par défaut: data)'
    )
    parser.add_argument(
        '--models-dir',
        type=str,
        default="models",
        help='Dossier des modèles (par défaut: models)'
    )
    
    args = parser.parse_args()
    
    # Initialiser l'interface
    chat = DPAIChatInterface(args.data_dir, args.models_dir)
    
    # Traiter les arguments
    if args.load_dpai:
        chat.load_dpai_data(args.load_dpai)
    elif args.load:
        chat.train_from_file(args.load)
    
    if args.add:
        question, answer = args.add
        chat.add_training_data(question, answer, args.source, args.tags)
    
    if args.question:
        chat.ask_question(args.question)
    elif args.eval:
        chat.evaluate_model()
    elif args.stats:
        chat._show_stats()
    elif args.export:
        chat.export_conversation(args.export)
    elif not any([args.interactive, args.add, args.question, args.eval, args.stats, args.export]):
        # Par défaut, mode interactif
        chat.interactive_chat()
    
    # Si on a fait une action qui n'est pas interactive, afficher un message
    if not args.interactive and any([args.add, args.question, args.eval, args.stats, args.export]):
        print()


if __name__ == "__main__":
    main()
