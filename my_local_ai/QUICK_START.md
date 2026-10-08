# ⚡ Guide de Démarrage Rapide

## 1. Installer les dépendances

Ouvre un terminal dans le dossier `my_local_ai` et exécute :

```bash
pip install -r requirements.txt
```

## 2. Entraîner avec tes données DPAI

Pour charger et entraîner avec TES données existantes :

```bash
# Depuis le fichier JSON que tu as déjà
python train.py --from-dpai ..\functions\data\dpai-training-data.json

# OU depuis le fichier JS
python train.py --from-js ..\functions\src\training-data.js

# OU charge TOUT automatiquement
python train.py --all
```

## 3. Discuter avec ton IA

```bash
python chat.py
```

Tu peux poser des questions comme :
- "Comment valoriser une SaaS ?"
- "Quels sont les pièges dans un rachat ?"
- "Analyse SWOT pour TechCorp"

## 4. Commandes utiles

| Commande | Description |
|----------|-------------|
| `/quit` | Quitter le chat |
| `/help` | Voir toutes les commandes |
| `/stats` | Voir les statistiques |
| `/history` | Voir l'historique |
| `/clear` | Effacer l'historique |
| `/learn` | Activer/désactiver l'apprentissage |
| `/train` | Ré-entraîner le modèle |

## 5. Ajouter de nouvelles données

```bash
# Ajouter manuellement une question/réponse
python chat.py --add "Nouvelle question" "Ta réponse complète ici"

# Importer un fichier JSON
python chat.py --import mon_fichier.json
```

## 6. Évaluer les performances

```bash
python chat.py --eval
```

## 🎯 Exemple Complet

```bash
# 1. Installer
cd my_local_ai
pip install -r requirements.txt

# 2. Charger tes données DPAI
python train.py --all

# 3. Tester
python chat.py

# Dans le chat, tape:
"Quelle est la méthodologie DPAI pour valoriser une entreprise ?"
```

C'est parti! Ton IA est prête à comprendre et répondre selon TON expertise DPAI! 🚀
