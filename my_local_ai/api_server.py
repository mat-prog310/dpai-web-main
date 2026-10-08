#!/usr/bin/env python3
"""
API Server pour l'IA Locale DPAI
Ce serveur permet d'appeler l'IA locale DPAI depuis le site web
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import json
from datetime import datetime

# Ajouter le chemin du projet au path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ai_core import DPAILocalAI

app = Flask(__name__)
CORS(app)  # Autoriser toutes les origines pour le développement

# Initialiser l'IA DPAI
print("Initialisation de l'IA DPAI...")
try:
    dpai_ai = DPAILocalAI()
    print("✅ IA DPAI initialisée avec succès")
except Exception as e:
    print(f"❌ Erreur lors de l'initialisation: {e}")
    dpai_ai = None

# Charger les données d'entraînement supplémentaires
try:
    print("Chargement des données DPAI...")
    
    # Charger les cas d'école
    ecole_cases_path = os.path.join('data', 'dpai_ecole_cases.json')
    if os.path.exists(ecole_cases_path):
        with open(ecole_cases_path, 'r', encoding='utf-8') as f:
            ecole_cases = json.load(f)
        
        # Convertir les cas d'école en format Q/R pour l'entraînement
        for case in ecole_cases:
            questions = [
                f"Raconte moi le cas {case.get('id', '')} {case.get('title', '')}",
                f"Quelles sont les leçons du cas {case.get('id', '')} ?",
                f"Explique moi le cas {case.get('title', '')}",
                f"Quelle est la méthodologie utilisée dans le cas {case.get('id', '')} ?",
                f"Quels sont les résultats du cas {case.get('id', '')} ?"
            ]
            
            for question in questions:
                answer = f"""**Cas {case.get('id', '')}: {case.get('title', '')}**

**Contexte:** {case.get('context', {}).get('description', case.get('problem', 'Non spécifié'))}

**Problématique:** {case.get('problem', 'Non spécifié')}

**Méthodologie DPAI:**
{chr(10).join([f"- {item}" for item in case.get('dpai_solution', {}).get('methodology', [])])}

**Découvertes clés:**
{chr(10).join([f"- {item}" for item in case.get('dpai_solution', {}).get('key_findings', [])])}

**Résultats:**
{chr(10).join([f"- {key}: {value}" for key, value in case.get('results', {}).items()])}

**Leçons apprises:**
{chr(10).join([f"- {item}" for item in case.get('lessons_learned', [])])}

**Recommandations:** {case.get('dpai_solution', {}).get('recommendation', 'Non spécifié')}

**Source:** Cas d'école DPAI - {case.get('category', 'Non spécifié')} - {case.get('type', 'Non spécifié')}"""
                
                dpai_ai.learn(question, answer, tags=[
                    'ecole_case', case.get('id', ''), case.get('category', ''), case.get('type', '')
                ])
    
    print("✅ Cas d'école chargés")
    
    # Charger les autres fichiers de données
    data_files = [
        'dpai_cases.json',
        'training_data.json',
        'm_and_a_knowledge.json',
        'm_and_a_best_practices.json',
        'due_diligence_checklists.json',
        'sector_analysis.json',
        'sector_benchmarks.json',
        'financial_analysis.json',
        'company_profiles.json'
    ]
    
    for data_file in data_files:
        file_path = os.path.join('data', data_file)
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Traitement spécifique pour chaque type de fichier
            if isinstance(data, list):
                for item in data:
                    question = item.get('question', item.get('instruction', ''))
                    answer = item.get('answer', item.get('output', ''))
                    if question and answer:
                        tags = item.get('tags', [])
                        dpai_ai.learn(question, answer, tags=tags)
            elif isinstance(data, dict):
                for key, value in data.items():
                    if isinstance(value, dict) and 'question' in value and 'answer' in value:
                        dpai_ai.learn(value['question'], value['answer'], tags=[key])
                    elif isinstance(value, list):
                        for item in value:
                            if isinstance(item, dict):
                                question = item.get('question', item.get('instruction', ''))
                                answer = item.get('answer', item.get('output', ''))
                                if question and answer:
                                    dpai_ai.learn(question, answer, tags=[key])
            
            print(f"✅ {data_file} chargé")
    
    print("✅ Toutes les données DPAI chargées")
    
    # Sauvegarder le modèle entraîné
    try:
        dpai_ai.save_model()
        print("✅ Modèle sauvegardé")
    except Exception as e:
        print(f"⚠️ Impossible de sauvegarder le modèle: {e}")
    
except Exception as e:
    print(f"❌ Erreur lors du chargement des données: {e}")


@app.route('/api/health', methods=['GET'])
def health_check():
    """Vérifier la santé de l'API IA locale"""
    if dpai_ai is None:
        return jsonify({
            'healthy': False,
            'error': 'IA non initialisée',
            'model': None,
            'training_samples': 0
        }), 500
    
    return jsonify({
        'healthy': True,
        'model': 'DPAI Local v1',
        'training_samples': len(dpai_ai.data),
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Endpoint pour discuter avec l'IA locale DPAI
    Format attendu: {"message": "votre question", "userId": "id_utilisateur", "conversationId": "id_conversation"}
    """
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({'error': 'Message requis'}), 400
        
        message = data['message']
        user_id = data.get('userId', 'anonymous')
        conversation_id = data.get('conversationId')
        
        if dpai_ai is None:
            return jsonify({'error': 'IA non disponible'}), 503
        
        # Ajouter le contexte DPAI si ce n'est pas déjà présent
        full_message = f"[Utilisateur: {user_id}] {message}"
        
        # Générer la réponse
        response, confidence, source = dpai_ai.generate_response(full_message)
        
        # Si la confiance est faible, ajouter une note
        if confidence < 0.5:
            response = f"{response}\n\n---\n*Note: Réponse générée avec une confiance de {confidence:.0%}. Pour de meilleurs résultats, reformulez votre question.*"
        
        return jsonify({
            'success': True,
            'response': response,
            'confidence': confidence,
            'source': source,
            'model': 'DPAI Local v1',
            'conversationId': conversation_id or user_id,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Erreur lors du chat: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/train', methods=['POST'])
def train():
    """
    Endpoint pour entraîner l'IA locale avec de nouvelles données
    Format attendu: {"question": "question", "answer": "réponse", "tags": ["tag1", "tag2"]}
    """
    try:
        data = request.get_json()
        if not data or 'question' not in data or 'answer' not in data:
            return jsonify({'error': 'Question et réponse requis'}), 400
        
        question = data['question']
        answer = data['answer']
        tags = data.get('tags', [])
        
        if dpai_ai is None:
            return jsonify({'error': 'IA non disponible'}), 503
        
        # Entraîner l'IA
        dpai_ai.learn(question, answer, tags=tags)
        
        # Sauvegarder le modèle
        try:
            dpai_ai.save_model()
        except Exception as e:
            print(f"⚠️ Impossible de sauvegarder le modèle: {e}")
        
        return jsonify({
            'success': True,
            'message': 'Modèle entraîné avec succès',
            'training_samples': len(dpai_ai.data),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Erreur lors de l'entraînement: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/stats', methods=['GET'])
def stats():
    """Récupérer les statistiques du modèle"""
    if dpai_ai is None:
        return jsonify({'error': 'IA non disponible'}), 503
    
    return jsonify({
        'training_samples': len(dpai_ai.data),
        'vectorizer_features': len(dpai_ai.vectorizer.get_feature_names_out()) if hasattr(dpai_ai, 'vectorizer') else 0,
        'model_info': {
            'type': 'TF-IDF + Similarité Cosine',
            'version': '1.0',
            'last_trained': datetime.now().isoformat()
        },
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/analyze', methods=['POST'])
def analyze():
    """
    Endpoint pour une analyse structurée (SWOT, Porter, etc.)
    Format attendu: {"type": "swot", "data": {...}}
    """
    try:
        data = request.get_json()
        if not data or 'type' not in data or 'data' not in data:
            return jsonify({'error': 'Type et data requis'}), 400
        
        analysis_type = data['type']
        analysis_data = data['data']
        
        if dpai_ai is None:
            return jsonify({'error': 'IA non disponible'}), 503
        
        # Construire la question en fonction du type d'analyse
        if analysis_type.lower() == 'swot':
            company_name = analysis_data.get('name', analysis_data.get('companyName', 'une entreprise'))
            question = f"Réalise une analyse SWOT complète pour {company_name} dans le secteur {analysis_data.get('sector', 'non spécifié')}"
        elif analysis_type.lower() == 'porter':
            company_name = analysis_data.get('name', analysis_data.get('companyName', 'une entreprise'))
            question = f"Analyse les 5 Forces de Porter pour {company_name} dans le secteur {analysis_data.get('sector', 'non spécifié')}"
        elif analysis_type.lower() == 'pestel':
            company_name = analysis_data.get('name', analysis_data.get('companyName', 'une entreprise'))
            question = f"Réalise une analyse PESTEL pour {company_name} dans le secteur {analysis_data.get('sector', 'non spécifié')}"
        elif analysis_type.lower() == 'valuation':
            company_name = analysis_data.get('name', analysis_data.get('companyName', 'une entreprise'))
            question = f"Comment valoriser {company_name} avec {analysis_data.get('revenue', '?')} de CA et {analysis_data.get('ebitda', '?')} d'EBITDA dans le secteur {analysis_data.get('sector', 'non spécifié')}?"
        else:
            question = f"Analyse {analysis_type} pour {analysis_data.get('name', 'une entreprise')}"
        
        # Obtenir la réponse
        response, confidence, source = dpai_ai.generate_response(question)
        
        return jsonify({
            'success': True,
            'result': response,
            'confidence': confidence,
            'source': source,
            'type': analysis_type,
            'model': 'DPAI Local v1',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Erreur lors de l'analyse: {e}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 Démarrage du serveur API pour l'IA Locale DPAI")
    print("="*60)
    print(f"📍 Accès: http://localhost:5002")
    print(f"🔗 Health Check: http://localhost:5002/api/health")
    print(f"💬 Chat: POST http://localhost:5002/api/chat")
    print(f"🎓 Entraînement: POST http://localhost:5002/api/train")
    print(f"📊 Statistiques: GET http://localhost:5002/api/stats")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=5002, debug=True)
