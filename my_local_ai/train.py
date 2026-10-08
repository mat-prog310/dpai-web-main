#!/usr/bin/env python3
"""
DPAI Local AI - Script d'Entraînement

Ce script permet de:
1. Charger les données d'entraînement depuis tes fichiers DPAI existants
2. Convertir les données au format attendu par l'IA
3. Entraîner le modèle
4. Sauvegarder le modèle entraîné

Utilisation:
    python train.py                          # Entraînement avec données par défaut
    python train.py --from-dpai ../functions/data/dpai-training-data.json
    python train.py --from-js ../functions/src/training-data.js
    python train.py --all                    # Charge tous les fichiers DPAI trouvés
"""

import sys
import os
import json
import argparse
from pathlib import Path
from typing import List, Dict, Any

# Ajouter le dossier parent au path
sys.path.insert(0, str(Path(__file__).parent))

from ai_core import DPAILocalAI, extract_from_dpai_files


def find_dpai_files(root_dir: Path) -> List[Path]:
    """Trouve tous les fichiers DPAI pertinents dans une arborescence"""
    dpai_files = []
    
    # Extensions à rechercher
    extensions = ['*.json', '*.js']
    
    # Mots-clés à rechercher dans les noms de fichiers
    keywords = ['training', 'data', 'ai', 'dpai', 'model']
    
    # Parcourir l'arborescence
    for ext in extensions:
        for file_path in root_dir.rglob(ext):
            file_name = file_path.name.lower()
            
            # Vérifier si le fichier contient un mot-clé
            if any(keyword in file_name for keyword in keywords):
                dpai_files.append(file_path)
    
    return dpai_files


def load_all_dpai_data(ai_core: DPAILocalAI, root_dir: Path) -> int:
    """Charge toutes les données DPAI trouvées"""
    dpai_files = find_dpai_files(root_dir)
    
    if not dpai_files:
        print("❌ Aucun fichier DPAI trouvé dans l'arborescence")
        return 0
    
    print(f"🔍 Trouvé {len(dpai_files)} fichiers DPAI potentiels:")
    for i, file_path in enumerate(dpai_files, 1):
        print(f"  {i}. {file_path.relative_to(root_dir)}")
    print()
    
    # Charger chaque fichier
    initial_count = len(ai_core.training_data)
    loaded_count = 0
    
    for file_path in dpai_files:
        print(f"📥 Chargement de {file_path.relative_to(root_dir)}...")
        try:
            success = extract_from_dpai_files(ai_core, str(file_path))
            if success:
                loaded_count += len(ai_core.training_data) - initial_count
                initial_count = len(ai_core.training_data)
                print(f"   ✅ {len(ai_core.training_data) - initial_count} exemples ajoutés")
            else:
                print(f"   ⚠️  Impossible de charger {file_path}")
        except Exception as e:
            print(f"   ❌ Erreur avec {file_path}: {e}")
    
    return loaded_count


def convert_to_training_format(input_path: Path, output_path: Path) -> bool:
    """Convertit un fichier au format DPAI vers le format d'entraînement"""
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Détecter le format
        if input_path.suffix == '.js':
            # Extraire le tableau
            import re
            match = re.search(r'module\.exports\s*=\s*(\[.*?\])', content, re.DOTALL)
            if match:
                json_str = match.group(1)
                # Nettoyer
                json_str = json_str.replace("SECTOR_DATA.", '"').replace(".growth", '"').replace(".ebitdaMultiple", '"')
                json_str = re.sub(r'(\w+):', r'"\1":', json_str)
                data = json.loads(json_str)
            else:
                print(f"❌ Impossible d'extraire les données de {input_path}")
                return False
        else:
            data = json.loads(content)
        
        # Convertir au format standard
        training_data = []
        ai_core = DPAILocalAI()  # Créer une instance temporaire
        
        for item in data:
            normalized = ai_core._normalize_training_item(item)
            if normalized:
                training_data.append(normalized)
        
        # Sauvegarder
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(training_data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Converti {len(training_data)} exemples vers {output_path}")
        return True
        
    except Exception as e:
        print(f"❌ Erreur de conversion: {e}")
        return False


def merge_training_files(file_paths: List[Path], output_path: Path) -> bool:
    """Fusionne plusieurs fichiers de données d'entraînement"""
    all_data = []
    seen_questions = set()
    
    for file_path in file_paths:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            for item in data:
                question = item.get("question", "")
                if question and question not in seen_questions:
                    all_data.append(item)
                    seen_questions.add(question)
            
            print(f"✅ Chargé {len(data)} exemples depuis {file_path.name}")
        except Exception as e:
            print(f"❌ Erreur avec {file_path}: {e}")
    
    # Sauvegarder
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Fusionné {len(all_data)} exemples uniques vers {output_path}")
    return True


def main():
    """Fonction principale"""
    parser = argparse.ArgumentParser(
        description="Script d'entraînement pour DPAI Local AI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples:
  python train.py                          # Entraînement avec données par défaut
  python train.py --from-dpai ../functions/data/dpai-training-data.json
  python train.py --from-js ../functions/src/training-data.js
  python train.py --all                    # Charge tous les fichiers DPAI
  python train.py --convert ../functions/src/training-data.js output.json
  python train.py --merge file1.json file2.json merged.json
        """
    )
    
    parser.add_argument(
        '--from-dpai',
        type=str,
        help='Chemin vers un fichier DPAI JSON à charger'
    )
    parser.add_argument(
        '--from-js',
        type=str,
        help='Chemin vers un fichier JS DPAI à charger'
    )
    parser.add_argument(
        '--all',
        action='store_true',
        help='Charge tous les fichiers DPAI dans le projet parent'
    )
    parser.add_argument(
        '--convert',
        nargs=2,
        metavar=('INPUT', 'OUTPUT'),
        help='Convertit un fichier vers le format d\'entraînement'
    )
    parser.add_argument(
        '--merge',
        nargs='+',
        metavar='FILE',
        help='Fusionne plusieurs fichiers de données'
    )
    parser.add_argument(
        '--train',
        action='store_true',
        help='Entraîne le modèle après chargement'
    )
    parser.add_argument(
        '--data-dir',
        type=str,
        default="data",
        help='Dossier des données'
    )
    parser.add_argument(
        '--models-dir',
        type=str,
        default="models",
        help='Dossier des modèles'
    )
    parser.add_argument(
        '--output', '-o',
        type=str,
        default=None,
        help='Fichier de sortie pour les données converties/mergeées'
    )
    parser.add_argument(
        '--model-name',
        type=str,
        default="dpai_local_v1",
        help='Nom du modèle à entraîner'
    )
    parser.add_argument(
        '--with-cases',
        action='store_true',
        help='Active l\'apprentissage automatique depuis les cas d\'école'
    )
    parser.add_argument(
        '--load-cases',
        type=str,
        default=None,
        help='Charge un fichier de cas spécifique (ex: dpai_ecole_cases.json)'
    )
    
    args = parser.parse_args()
    
    # Initialiser
    ai_core = DPAILocalAI(args.data_dir, args.models_dir)
    ai_core.config["model_name"] = args.model_name
    
    # Configurer l'apprentissage depuis les cas
    if args.with_cases:
        ai_core.config["auto_learn_from_cases"] = True
    
    # Charger un fichier de cas spécifique si demandé
    if args.load_cases:
        print(f"📚 Chargement des cas depuis {args.load_cases}...")
        ai_core.case_memory.load_cases(args.load_cases)
    
    # Traiter les arguments
    if args.convert:
        input_path = Path(args.convert[0])
        output_path = Path(args.convert[1]) if len(args.convert) > 1 else Path(args.output) if args.output else Path(args.data_dir) / "converted_training_data.json"
        convert_to_training_format(input_path, output_path)
        sys.exit(0)
    
    if args.merge:
        file_paths = [Path(f) for f in args.merge[:-1]]
        output_path = Path(args.merge[-1]) if args.merge else Path(args.output) if args.output else Path(args.data_dir) / "merged_training_data.json"
        merge_training_files(file_paths, output_path)
        sys.exit(0)
    
    # Charger les données
    print("=" * 80)
    print("  DPAI Local AI - Entrainement")
    print("=" * 80)
    print()
    
    if args.all:
        # Monter d'un niveau pour chercher dans tout le projet
        project_root = Path(__file__).parent.parent
        print(f"  Recherche de fichiers DPAI dans {project_root}...")
        loaded_count = load_all_dpai_data(ai_core, project_root)
        print(f"✅ {loaded_count} exemples chargés depuis tous les fichiers DPAI")
        # Intégrer automatiquement les cas et connaissances externes
        if ai_core.config["auto_learn_from_cases"]:
            print(f"📚 Intégration des cas d'école et connaissances externes...")
            ai_core._integrate_cases_into_training()
    elif args.from_dpai:
        success = extract_from_dpai_files(ai_core, args.from_dpai)
        if not success:
            print("❌ Échec du chargement des données")
            sys.exit(1)
        # Intégrer automatiquement les cas et connaissances externes
        if ai_core.config["auto_learn_from_cases"]:
            print(f"📚 Intégration des cas d'école et connaissances externes...")
            ai_core._integrate_cases_into_training()
    elif args.from_js:
        success = extract_from_dpai_files(ai_core, args.from_js)
        if not success:
            print("❌ Échec du chargement des données")
            sys.exit(1)
        # Intégrer automatiquement les cas et connaissances externes
        if ai_core.config["auto_learn_from_cases"]:
            print(f"📚 Intégration des cas d'école et connaissances externes...")
            ai_core._integrate_cases_into_training()
    else:
        # Charger les données par défaut
        print("ℹ️  Chargement des données par défaut...")
        ai_core.load_training_data()
        # L'intégration est déjà faite automatiquement dans load_training_data si auto_learn_from_cases est True
    
    # Afficher un résumé
    print()
    print(f"📊 Données d'entraînement chargées: {len(ai_core.training_data)} exemples")
    
    # Afficher les stats des cas si disponibles
    case_stats = ai_core.get_stats().get("case_memory_stats", {})
    if case_stats.get("total_cases", 0) > 0:
        print(f"📚 Cas d'école chargés: {case_stats.get('total_cases', 0)} cas")
    
    # Entraîner si demandé
    if args.train or not any([args.convert, args.merge]):
        print()
        print("🚀 Début de l'entraînement...")
        success = ai_core.train()
        
        if success:
            print()
            print("✅ Entraînement terminé avec succès!")
            print()
            print("Prochaines étapes:")
            print("  1. Utilisez 'python chat.py' pour discuter avec votre IA")
            print("  2. Ajoutez plus de données avec 'python train.py --from-dpai <fichier>'")
            print("  3. Entraînez à nouveau avec 'python train.py --train'")
        else:
            print()
            print("❌ Échec de l'entraînement")
            sys.exit(1)
    
    print()
    print("=" * 80)


if __name__ == "__main__":
    main()
