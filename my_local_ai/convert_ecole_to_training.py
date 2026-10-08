#!/usr/bin/env python3
"""
Script pour convertir les cas d'école (dpai_ecole_cases.json) en format d'entraînement
compatible avec l'IA locale DPAI.

Ce script crée plusieurs questions/réponses par cas pour enrichir l'entraînement.
"""

import json
import os
from datetime import datetime

def extract_key_information(case):
    """Extraire les informations clés d'un cas pour générer des questions."""
    
    context = case.get('context', {})
    company = context.get('company', {})
    target = context.get('target', {})
    market = context.get('market', {})
    
    info = {
        'case_id': case.get('id', 'UNKNOWN'),
        'title': case.get('title', ''),
        'category': case.get('category', ''),
        'type': case.get('type', ''),
        'problem': case.get('problem', ''),
        'solution': case.get('dpai_solution', {}),
        'results': case.get('results', {}),
        'lessons': case.get('lessons_learned', []),
        'tags': case.get('tags', []),
        
        # Contexte
        'company_name': company.get('name', ''),
        'company_sector': company.get('sector', ''),
        'company_revenue': company.get('revenue', 0),
        'company_ebitda': company.get('ebitda', 0),
        
        # Cible
        'target_name': target.get('name', ''),
        'target_revenue': target.get('revenue', 0),
        'target_ebitda': target.get('ebitda', 0),
        'target_price': target.get('asking_price', 0) or target.get('acquisition_price', 0),
        
        # Marché
        'market_growth': market.get('sector_growth', 0),
        'market_multiple': market.get('average_multiple', 0)
    }
    
    return info

def format_currency(amount):
    """Formater un montant en euros."""
    if amount == 0:
        return "0€"
    try:
        return f"{amount:,.0f}€" if amount >= 1000000 else f"{amount:,.0f}€"
    except:
        return str(amount)

def generate_questions_and_answers(case):
    """Générer plusieurs questions/réponses à partir d'un cas d'école."""
    
    info = extract_key_information(case)
    questions_answers = []
    
    # 1. Question sur le contexte général
    qa1 = {
        "question": f"Peux-tu me raconter le cas {info['case_id']} : {info['title']} ?",
        "answer": f"""Cas DPAI {info['case_id']} : {info['title']}

**Contexte :**
{info['problem']}

**Entreprise :** {info['company_name']} ({info['company_sector']}, CA: {format_currency(info['company_revenue'])}, EBITDA: {format_currency(info['company_ebitda'])})

**Cible :** {info['target_name']} (CA: {format_currency(info['target_revenue'])}, EBITDA: {format_currency(info['target_ebitda'])}, Prix: {format_currency(info['target_price'])})

**Solution DPAI :**
{info['solution'].get('recommendation', 'Voir méthodologie complète')}

**Résultats :** {info['results'].get('outcome', 'Voir détails complets')}

**Leçons apprises :**
{chr(10).join([f"- {lesson}" for lesson in info['lessons'][:3]])}""",
        "source": "dpai_ecole_case",
        "tags": info['tags'] + ["cas_ecole", info['case_id'].lower()]
    }
    questions_answers.append(qa1)
    
    
    # 2. Question sur les leçons apprises
    if info['lessons']:
        qa2 = {
            "question": f"Quelles sont les leçons apprises du cas {info['case_id']} ({info['title']}) ?",
            "answer": f"""Leçons du cas DPAI {info['case_id']} : {info['title']}

{chr(10).join([f"{i+1}. {lesson}" for i, lesson in enumerate(info['lessons'])])}""",
            "source": "dpai_ecole_case",
            "tags": info['tags'] + ["lecons", "cas_ecole", info['case_id'].lower()]
        }
        questions_answers.append(qa2)
    
    
    # 3. Question sur la méthodologie DPAI
    solution = info['solution']
    if solution.get('methodology'):
        methodology_text = chr(10).join([f"- {step}" for step in solution['methodology']])
        qa3 = {
            "question": f"Comment DPAI a résolu le problème dans le cas {info['case_id']} ({info['title']}) ?",
            "answer": f"""Méthodologie DPAI pour le cas {info['case_id']} : {info['title']}

**Problème :** {info['problem']}

**Méthodologie appliquée :**
{methodology_text}

**Outils utilisés :**
{chr(10).join([f"- {tool}" for tool in solution.get('tools_used', [])])}

**Budget :** {solution.get('budget', 'Non spécifié')}
**Délai :** {solution.get('timeline', 'Non spécifié')}""",
            "source": "dpai_ecole_case",
            "tags": info['tags'] + ["methodologie", "cas_ecole", info['case_id'].lower()]
        }
        questions_answers.append(qa3)
    
    
    # 4. Question sur les résultats
    results = info['results']
    if results.get('financial') or results.get('strategic'):
        financial = results.get('financial', {})
        strategic = results.get('strategic', [])
        
        answer_parts = []
        if financial:
            answer_parts.append("**Résultats financiers :**")
            for k, v in financial.items():
                if isinstance(v, (int, float)):
                    answer_parts.append(f"- {k.replace('_', ' ').title()}: {format_currency(v)}")
                else:
                    answer_parts.append(f"- {k.replace('_', ' ').title()}: {v}")
        
        if strategic:
            answer_parts.append("**Résultats stratégiques :**")
            answer_parts.extend([f"- {s}" for s in strategic])
        
        qa4 = {
            "question": f"Quels sont les résultats du cas {info['case_id']} ({info['title']}) ?",
            "answer": chr(10).join(answer_parts),
            "source": "dpai_ecole_case",
            "tags": info['tags'] + ["resultats", "cas_ecole", info['case_id'].lower()]
        }
        questions_answers.append(qa4)
    
    
    # 5. Question spécifique par secteur
    if info['company_sector']:
        sector = info['company_sector'].lower()
        qa5 = {
            "question": f"Peux-tu me donner un exemple de cas DPAI dans le secteur {info['company_sector']} ?",
            "answer": f"""Exemple de cas DPAI dans le {info['company_sector']} : {info['title']} ({info['case_id']})

**Entreprise :** {info['company_name']} (CA: {format_currency(info['company_revenue'])}, EBITDA: {format_currency(info['company_ebitda'])})

**Problématique :** {info['problem'][:200]}...

**Solution :** {info['solution'].get('recommendation', 'Voir méthodologie')}

**Résultat :** {info['results'].get('outcome', 'Voir détails')}

Pour plus de détails, demande le cas complet {info['case_id']}.""",
            "source": "dpai_ecole_case",
            "tags": info['tags'] + ["secteur", sector, "exemple", "cas_ecole"]
        }
        questions_answers.append(qa5)
    
    
    # 6. Question spécifique par type d'opération
    if info['type']:
        op_type = info['type'].lower()
        qa6 = {
            "question": f"Comment DPAI gère les opérations de {info['type']} ? Donne un exemple concret.",
            "answer": f"""DPAI et les {info['type']} : Exemple du cas {info['case_id']} ({info['title']})

**Contexte :** {info['problem'][:150]}...

**Approche DPAI :**
{chr(10).join([f"- {step}" for step in info['solution'].get('methodology', [])[:3]])}

**Résultat :** {info['results'].get('outcome', 'Voir détails')}

**Leçon clé :** {info['lessons'][0] if info['lessons'] else 'Voir leçons complètes'}""",
            "source": "dpai_ecole_case",
            "tags": info['tags'] + ["type", op_type, "exemple", "cas_ecole"]
        }
        questions_answers.append(qa6)
    
    
    return questions_answers

def convert_all_cases(input_file, output_file):
    """Convertir tous les cas du fichier d'entrée en format d'entraînement."""
    
    print(f"Lecture du fichier : {input_file}")
    
    # Lire le fichier des cas d'école
    with open(input_file, 'r', encoding='utf-8') as f:
        cases = json.load(f)
    
    print(f"Nombre de cas trouvés : {len(cases)}")
    
    # Générer les questions/réponses
    all_qa = []
    for case in cases:
        case_id = case.get('id', 'UNKNOWN')
        print(f"Traitement du cas {case_id}...")
        
        qa_list = generate_questions_and_answers(case)
        all_qa.extend(qa_list)
        
        print(f"  → {len(qa_list)} questions/réponses générées")
    
    # Écrire le fichier de sortie
    output_data = {
        "generated_from": os.path.basename(input_file),
        "generated_date": datetime.now().isoformat(),
        "total_qa_pairs": len(all_qa),
        "original_cases": len(cases),
        "qa_pairs": all_qa
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nFichier généré : {output_file}")
    print(f"Nombre total de paires Q/R : {len(all_qa)}")
    print(f"Ratio : {len(all_qa) / len(cases):.1f} paires par cas")
    
    return output_file

def merge_with_existing(output_file, existing_files):
    """Fusionner avec les fichiers existants."""
    
    # Lire le fichier généré
    with open(output_file, 'r', encoding='utf-8') as f:
        new_data = json.load(f)
    
    all_qa = new_data.get('qa_pairs', [])
    
    # Lire les fichiers existants
    for existing_file in existing_files:
        if os.path.exists(existing_file):
            print(f"Fusion avec : {existing_file}")
            with open(existing_file, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
            
            # Extraire les paires Q/R
            if isinstance(existing_data, list):
                all_qa.extend(existing_data)
            elif isinstance(existing_data, dict):
                if 'qa_pairs' in existing_data:
                    all_qa.extend(existing_data['qa_pairs'])
                else:
                    # Format ancien
                    all_qa.extend(existing_data)
    
    # Sauvegarder le fichier fusionné
    merged_file = output_file.replace('.json', '_merged.json')
    
    merged_data = {
        "generated_from": new_data.get('generated_from', ''),
        "generated_date": datetime.now().isoformat(),
        "total_qa_pairs": len(all_qa),
        "sources": [
            new_data.get('generated_from', ''),
            *existing_files
        ],
        "qa_pairs": all_qa
    }
    
    with open(merged_file, 'w', encoding='utf-8') as f:
        json.dump(merged_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nFichier fusionné : {merged_file}")
    print(f"Nombre total de paires Q/R après fusion : {len(all_qa)}")
    
    return merged_file

def convert_to_simple_format(input_file, output_file):
    """Convertir en format simple (liste de dict) compatible avec l'IA."""
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    qa_pairs = data.get('qa_pairs', [])
    
    # Convertir en format simple
    simple_format = []
    for qa in qa_pairs:
        simple_qa = {
            "question": qa.get('question', ''),
            "answer": qa.get('answer', ''),
            "source": qa.get('source', 'dpai_ecole_case'),
            "tags": qa.get('tags', [])
        }
        simple_format.append(simple_qa)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(simple_format, f, indent=2, ensure_ascii=False)
    
    print(f"Fichier au format simple : {output_file}")
    print(f"Nombre de paires : {len(simple_format)}")
    
    return output_file

if __name__ == "__main__":
    # Chemins des fichiers
    INPUT_FILE = "data/dpai_ecole_cases.json"
    OUTPUT_FILE = "data/dpai_ecole_training.json"
    SIMPLE_OUTPUT = "data/dpai_ecole_simple.json"
    
    # Convertir les cas
    convert_all_cases(INPUT_FILE, OUTPUT_FILE)
    
    # Convertir en format simple
    convert_to_simple_format(OUTPUT_FILE, SIMPLE_OUTPUT)
    
    # Fusionner avec les fichiers existants
    existing_files = [
        "data/dpai_cases.json",
        "data/training_data.json",
        "data/dpai_methodology.json"
    ]
    
    # Créer aussi une version fusionnée
    MERGED_OUTPUT = "data/training_data_merged.json"
    merge_with_existing(OUTPUT_FILE, existing_files)
    
    print("\n✅ Conversion terminée avec succès !")
    print(f"   - Fichier détaillé : {OUTPUT_FILE}")
    print(f"   - Fichier simple : {SIMPLE_OUTPUT}")
    print(f"   - Fichier fusionné : {MERGED_OUTPUT}")
