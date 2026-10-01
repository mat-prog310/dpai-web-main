#!/usr/bin/env python3
"""
SCRIPT D'ENTRAÎNEMENT POUR FINE-TUNER UN MODÈLE MISTRAL AVEC VOS DONNÉES DPAI

Ce script permet de:
1. Préparer vos données d'entraînement (exemples d'analyses DPAI)
2. Fine-tuner un modèle Mistral (7B ou plus) avec vos données
3. Sauvegarder le modèle entraîné pour une utilisation avec l'API Mistral

Prérequis:
- Python 3.8+
- pip install transformers peft datasets torch accelerate bitsandbytes
- Compte Mistral AI avec accès à l'API
- Clé API Mistral dans la variable d'environnement MISTRAL_API_KEY

Utilisation:
    python train-model.py
"""

import json
import os
from datetime import datetime
from typing import List, Dict, Any

# =============================================================================
# CONFIGURATION
# =============================================================================

# Chemin vers vos données d'entraînement (à adapter)
TRAINING_DATA_PATH = "./functions/src/training-data.js"

# Nom du modèle de base (à changer si besoin)
BASE_MODEL = "mistralai/Mistral-7B-v0.1"

# Nom du modèle fine-tuné (sera créé)
FINE_TUNED_MODEL = f"ft:mistral-7b:dpai-advisor-v1:{datetime.now().strftime('%Y%m%d')}"

# Répertoire de sortie
OUTPUT_DIR = "./fine-tuned-models"

# =============================================================================
# DONNÉES D'ENTRAÎNEMENT
# =============================================================================

# Exemple de données au format Mistral (messages)
SAMPLE_TRAINING_DATA = [
    {
        "messages": [
            {"role": "user", "content": "Réalise une analyse SWOT pour TechCorp (EdTech, 5M€ CA, 1M€ EBITDA)"},
            {"role": "assistant", "content": "## 📊 Analyse SWOT pour TechCorp (Secteur : EdTech)\n\n**Contexte :** TechCorp est une PME française de l'EdTech avec 5M€ de CA et 1M€ d'EBITDA.\n\n### 🔵 **Forces**\n1. **Marge brute de 85%** → **Impact** : Rentabilité supérieure à la moyenne du secteur (70%).\n2. **95% de revenus récurrents** → **Impact** : Stabilité financière.\n3. **Partenariat exclusif avec Microsoft Azure** → **Impact** : Réduction de 15% des coûts cloud.\n\n### 🟠 **Faiblesses**\n1. **Dépendance à un client (30% du CA)** → **Risque** : -3M€/an en cas de perte.\n2. **Faible notoriété en Europe** → **Risque** : Limite la croissance internationale.\n\n### 🟢 **Opportunités**\n1. **Croissance du marché (+12-15%)** → **Potentiel** : +1M€-2M€/an.\n2. **Faiblesse de SchoolMint en France** → **Potentiel** : Acquisition possible.\n\n### 🔴 **Menaces**\n1. **Microsoft lance un concurrent** → **Impact** : -2M€ de CA.\n2. **Réglementation éducative** → **Impact** : Risque de changement des subventions.\n\n### 💡 **Recommandations Stratégiques (DPAI)**\n1. **Diversifier le portefeuille clients** → **Action** : Cibler les écoles privées → **ROI** : +2M€/an.\n2. **Déposer un brevet** → **Action** : Protéger la technologie → **ROI** : Éviter -5M€/an.\n\n**Prochaines étapes :**\n- Valider la Due Diligence financière\n- Identifier 3 cibles potentielles"}
        ]
    },
    {
        "messages": [
            {"role": "user", "content": "Analyse Porter 5 Forces pour un SaaS B2B avec 10M€ de CA"},
            {"role": "assistant", "content": "## 📊 Analyse Porter 5 Forces pour [SaaS B2B]\n\n### 1️⃣ **Pouvoir de négociation des clients**\n- **Niveau** : Élevé\n- **Explication** : Clients professionnels avec budget important mais exigeants\n- **Impact** : Pression sur les prix\n- **Recommandation DPAI** : Proposer des contrats longs (2-3 ans)\n\n### 2️⃣ **Pouvoir de négociation des fournisseurs**\n- **Niveau** : Faible\n- **Explication** : Nombreux fournisseurs cloud (AWS, GCP, Azure)\n- **Impact** : Coûts maîtrisés\n\n### 3️⃣ **Menace des nouveaux entrants**\n- **Niveau** : Modéré\n- **Barrières** : Coûts de développement, réseau de distribution\n- **Risque** : Concurrence accrue\n\n### 4️⃣ **Menace des produits de substitution**\n- **Niveau** : Faible\n- **Alternatives** : Solutions internes des clients\n\n### 5️⃣ **Intensité de la rivalité**\n- **Niveau** : Élevé\n- **Concurrence** : Salesforce, HubSpot, SAP\n- **Recommandation DPAI** : Se différencier par le service client\n\n**Synthèse :** Force concurrentielle globale : Modérée\n**Prochaines étapes :** Lancer une campagne de fidélisation"}
        ]
    }
]

# =============================================================================
# CHARGEMENT DES DONNÉES
# =============================================================================

def charger_donnees_entrainement() -> List[Dict[str, Any]]:
    """Charge les données d'entraînement depuis le fichier JS ou utilise les exemples"""
    try:
        # Essayer de lire depuis le fichier JS
        if os.path.exists(TRAINING_DATA_PATH):
            print(f"✅ Chargement des données depuis {TRAINING_DATA_PATH}")
            with open(TRAINING_DATA_PATH, 'r', encoding='utf-8') as f:
                content = f.read()
                # Extraire les données (format : module.exports = [...]) 
                # Cette extraction est basique, à améliorer si nécessaire
                start = content.find('[')
                end = content.rfind(']') + 1
                if start != -1 and end != -1:
                    data_str = content[start:end]
                    # Remplacer les fonctions par des valeurs
                    data_str = data_str.replace("SECTOR_DATA.", '"').replace(".growth", '"').replace(".ebitdaMultiple", '"')
                    # Ajouter des guillemets autour des clés
                    import re
                    data_str = re.sub(r'(\w+):', r'"\1":', data_str)
                    return json.loads(data_str)
    except Exception as e:
        print(f"⚠️ Impossible de charger {TRAINING_DATA_PATH}: {e}")
    
    print("⚠️ Utilisation des données d'exemple")
    return SAMPLE_TRAINING_DATA

# =============================================================================
# PRÉPARATION DES DONNÉES
# =============================================================================

def preparer_dataset(training_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Prépare le dataset au format attendu par Hugging Face"""
    dataset = []
    for example in training_data:
        messages = example.get("messages", [])
        if len(messages) >= 2:
            # Format pour Mistral : [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
            dataset.append({
                "messages": messages
            })
    return dataset

# =============================================================================
# FINE-TUNING AVEC PEFT (LoRA)
# =============================================================================

def fine_tuner_avec_peft(dataset: List[Dict[str, Any]]) -> str:
    """
    Fine-tune un modèle Mistral avec PEFT (LoRA)
    Nécessite : pip install transformers peft datasets torch accelerate bitsandbytes
    """
    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
        from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
        from datasets import Dataset
        import torch
        from torch.utils.data import DataLoader
        import bitsandbytes as bnb
    except ImportError as e:
        print(f"❌ Erreur d'import: {e}")
        print("📦 Installez les dépendances: pip install transformers peft datasets torch accelerate bitsandbytes")
        return ""
    
    print("🔧 Début du fine-tuning avec PEFT (LoRA)...")
    
    # 1. Charger le modèle de base en 4-bit
    print(f"📥 Chargement du modèle {BASE_MODEL}...")
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
    tokenizer.pad_token = tokenizer.eos_token
    
    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        load_in_4bit=True,
        device_map="auto",
        quantization_config=bnb.BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16
        )
    )
    
    # 2. Préparer pour le fine-tuning
    model = prepare_model_for_kbit_training(model)
    
    # 3. Configuration LoRA
    peft_config = LoraConfig(
        r=16,  # Rank
        lora_alpha=32,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"]
    )
    
    model = get_peft_model(model, peft_config)
    
    # 4. Préparer le dataset
    print("📊 Préparation du dataset...")
    dataset = Dataset.from_list(dataset)
    
    def tokenize_function(examples):
        # Tokenizer les messages
        tokenized_inputs = tokenizer(
            [msg["content"] for msg in examples["messages"] if msg["role"] == "user"],
            padding="max_length",
            truncation=True,
            max_length=512,
            return_tensors="pt"
        )
        
        labels = tokenizer(
            [msg["content"] for msg in examples["messages"] if msg["role"] == "assistant"],
            padding="max_length",
            truncation=True,
            max_length=512,
            return_tensors="pt"
        ).input_ids
        
        tokenized_inputs["labels"] = labels
        return tokenized_inputs
    
    tokenized_dataset = dataset.map(
        tokenize_function,
        batched=True,
        remove_columns=["messages"]
    )
    
    # 5. Configuration de l'entraînement
    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        learning_rate=2e-5,
        num_train_epochs=3,
        logging_steps=10,
        save_strategy="epoch",
        report_to="none",
        optim="paged_adamw_8bit"
    )
    
    # 6. Entraînement
    print("🚀 Début de l'entraînement...")
    from transformers import Trainer
    
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
        data_collator=lambda data: {
            'input_ids': torch.stack([f['input_ids'] for f in data]),
            'attention_mask': torch.stack([f['attention_mask'] for f in data]),
            'labels': torch.stack([f['labels'] for f in data])
        }
    )
    
    trainer.train()
    
    # 7. Sauvegarder le modèle
    print(f"💾 Sauvegarde du modèle fine-tuné: {FINE_TUNED_MODEL}")
    model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    
    return FINE_TUNED_MODEL

# =============================================================================
# FONCTIONS POUR MISTRAL API
# =============================================================================

def creér_fichier_entrainement(output_path: str = "./training-data.json") -> str:
    """Crée un fichier JSON avec les données d'entraînement pour Mistral API"""
    training_data = charger_donnees_entrainement()
    dataset = preparer_dataset(training_data)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Fichier créé: {output_path}")
    print(f"📊 Nombre d'exemples: {len(dataset)}")
    return output_path

# =============================================================================
# MAIN
# =============================================================================

def main():
    print("=" * 80)
    print("🚀 SCRIPT DE FINE-TUNING POUR DPAI STRATEGY")
    print("=" * 80)
    print()
    
    # 1. Charger les données
    print("1️⃣ Chargement des données d'entraînement...")
    training_data = charger_donnees_entrainement()
    print(f"   ✅ {len(training_data)} exemples chargés")
    print()
    
    # 2. Créer le fichier JSON pour Mistral API
    print("2️⃣ Création du fichier JSON pour Mistral API...")
    creér_fichier_entrainement()
    print()
    
    # 3. Fine-tuning (optionnel, nécessite du matériel)
    print("3️⃣ Fine-tuning avec PEFT (nécessite GPU ou temps d'exécution)")
    print("   ⚠️  Cette étape peut prendre plusieurs heures selon votre matériel")
    print("   💡 Pour sauter cette étape, appuyez sur Ctrl+C")
    print()
    
    try:
        dataset = preparer_dataset(training_data)
        model_path = fine_tuner_avec_peft(dataset)
        print(f"   ✅ Modèle entraîné sauvegardé: {model_path}")
    except KeyboardInterrupt:
        print("   ⏹️  Fine-tuning annulé par l'utilisateur")
    except Exception as e:
        print(f"   ❌ Erreur lors du fine-tuning: {e}")
    
    print()
    print("=" * 80)
    print("✅ SCRIPT TERMINÉ")
    print("=" * 80)
    print()
    print("Prochaines étapes:")
    print("1. Déposez votre fichier training-data.json sur Hugging Face")
    print("2. Utilisez Mistral API pour fine-tuner : https://docs.mistral.ai/")
    print("3. Intégrez le modèle entraîné dans ai-integration.js")
    print()

if __name__ == "__main__":
    main()
