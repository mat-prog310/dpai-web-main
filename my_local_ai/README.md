# DPAI Local AI

 Une IA 100% locale en Python qui comprend, analyse et répond à tes questions **sans utiliser de modèle externe**. Parfaite pour tester localement et intégrer ton expertise DPAI.

## 🚀 Fonctionnalités

- **Compréhension locale** : Analyse les questions grâce à la vectorisation TF-IDF
- **Réponses intelligentes** : Trouve les meilleures réponses dans tes données d'entraînement
- **Apprentissage continu** : Ajoute de nouvelles connaissances au fil des conversations
- **Mémoire des conversations** : Se souvient du contexte des échanges
- **100% offline** : Aucun appel à des API externes, tout fonctionne sur ta machine
- **Intégration facile** : Conçu pour s'intégrer avec tes données DPAI existantes

## 📁 Structure

```
my_local_ai/
├── ai_core.py      # Moteur principal de l'IA
├── chat.py         # Interface terminal interactive
├── train.py        # Script d'entraînement
├── requirements.txt # Dépendances Python
├── data/           # Données d'entraînement
│   └── training_data.json
└── models/         # Modèles entraînés sauvegardés
```

## 🛠️ Installation

### 1. Prérequis

- Python 3.8 ou supérieur
- pip (gestionnaire de packages Python)

### 2. Installer les dépendances

```bash
cd my_local_ai
pip install -r requirements.txt
```

### 3. (Optionnel) Installer dans un environnement virtuel

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate    # Windows
pip install -r requirements.txt
```

## 🎯 Utilisation

### Mode interactif (recommandé pour tester)

```bash
python chat.py
```

Cela lance un chat interactif où tu peux poser des questions à ton IA.

### Poser une question directe

```bash
python chat.py --question "Comment valoriser une entreprise SaaS avec 10M€ de CA ?"
```

### Charger tes données DPAI existantes

```bash
# Depuis un fichier JSON
python train.py --from-dpai ../functions/data/dpai-training-data.json

# Depuis un fichier JS
python train.py --from-js ../functions/src/training-data.js

# Charger TOUS les fichiers DPAI du projet
python train.py --all
```

### Entraîner le modèle

```bash
# Entraînement avec données par défaut
python train.py

# Entraînement après avoir chargé des données
python train.py --train
```

### Évaluer le modèle

```bash
python chat.py --eval
```

### Ajouter manuellement des données d'entraînement

```bash
python chat.py --add "Quelle est la méthodologie DPAI ?" "Notre méthodologie..." --tags "methodology,dpai"
```

## 📚 Données d'Entraînement

### Format des données

Les données d'entraînement sont stockées au format JSON avec ce structure :

```json
[
    {
        "question": "Quelle est la méthodologie DPAI pour valoriser une entreprise ?",
        "answer": "Chez DPAI, nous utilisons une approche en 3 étapes...",
        "source": "dpai_default",
        "tags": ["valuation", "methodology"]
    },
    {
        "instruction": "Analyse SWOT pour TechCorp",
        "input": "",
        "output": "## Analyse SWOT...",
        "source": "dpai_training",
        "tags": ["swot", "analysis"]
    }
]
```

Le système accepte plusieurs formats :
- `{"question": "...", "answer": "..."}`
- `{"instruction": "...", "input": "...", "output": "..."}`
- `{"messages": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}`

### Charger tes données DPAI

Le script `train.py` peut automatiquement convertir tes fichiers existants :

```bash
# Convertir un fichier JS vers le format d'entraînement
python train.py --convert ../functions/src/training-data.js data/my_data.json

# Fusionner plusieurs fichiers
python train.py --merge file1.json file2.json data/merged.json
```

## 🤖 Fonctionnement Technique

### Vectorisation

L'IA utilise **TF-IDF (Term Frequency-Inverse Document Frequency)** pour transformer les questions en vecteurs numériques. Cela permet de :

1. Comprendre le sens des mots
2. Identifier les mots importants
3. Comparer les questions par similarité

### Recherche de Réponses

Pour chaque question :
1. La question est vectorisée
2. On calcule la **similarité cosine** avec toutes les questions d'entraînement
3. On retourne la réponse associée à la question la plus similaire

### Apprentissage

Lorsque l'IA répond avec une confiance > 50%, elle peut apprendre automatiquement :
- Ajoute la nouvelle paire question/réponse à ses données
- Re-vectorise et met à jour son modèle
- Sauvegarde les nouvelles connaissances

## 🎯 Exemples de Questions

Essaie ces questions avec ton IA :

```bash
# Valorisation
python chat.py --question "Comment valoriser une entreprise SaaS avec 10M€ de CA et 3M€ d'EBITDA ?"

# Analyse stratégique
python chat.py --question "Réalise une analyse SWOT pour une EdTech avec 5M€ de CA"

# Négociation
python chat.py --question "Quels sont les pièges à éviter dans une négociation de rachat d'une PME industrielle ?"

# Financement
python chat.py --question "Comment structurer un LBO pour une acquisition à 20M€ ?"

# Analyse concurrentielle
python chat.py --question "Analyse les 5 Forces de Porter pour un SaaS B2B"
```

## 🔧 Personnalisation

### Modifier le seuil de similarité

Dans `ai_core.py`, modifie :

```python
self.config["similarity_threshold"] = 0.3  # Par défaut : 0.3
```

Un seuil plus bas (ex: 0.2) donnera plus de réponses mais potentiellement moins pertinentes.
Un seuil plus élevé (ex: 0.5) sera plus strict.

### Ajouter des stop words

Modifie le vectoriseur TF-IDF dans `train()` :

```python
self.vectorizer = TfidfVectorizer(
    stop_words=['french', 'le', 'la', 'les', 'de', 'des'],  # Ajoute tes propres stop words
    ...
)
```

### Changer la taille des n-grams

```python
self.vectorizer = TfidfVectorizer(
    ngram_range=(1, 2),  # 1=unigrams, 2=bigrams
    ...
)
```

## 📊 Statistiques et Diagnostics

### Voir les statistiques du modèle

```bash
python chat.py --stats
```

### Évaluer les performances

```bash
python chat.py --eval
```

Cela testera ton modèle avec des questions standard et te donnera une note de confiance moyenne.

## 💡 Conseils pour de Meilleurs Résultats

1. **Plus de données = Meilleure IA** : Ajoute autant d'exemples que possible dans `data/training_data.json`

2. **Diversifie les formulations** : Ajoute la même information avec différentes formulations de questions

3. **Utilise des tags** : Les tags aident l'IA à catégoriser et trouver les bonnes réponses

4. **Active l'apprentissage** : Dans le mode interactif, tape `/learn` pour activer l'apprentissage automatique

5. **Vérifie les réponses** : Si l'IA donne une mauvaise réponse, corrige-la avec `--add`

6. **Ré-entraîne régulièrement** : Après avoir ajouté beaucoup de données, fais `python train.py --train`

## 🔄 Mise à Jour

### Ajouter de nouvelles données

```bash
# Ajouter manuellement
python chat.py --add "Nouvelle question" "Nouvelle réponse" --tags "tag1,tag2"

# Importer un fichier
python chat.py --import data/new_data.json
```

### Ré-entraîner après modification

```bash
python train.py --train
```

## ❓ Résolution des Problèmes

### "Aucune réponse trouvée"

- **Solution** : Ajoute plus de données d'entraînement ou diminue le `similarity_threshold`

### "Réponses non pertinentes"

- **Solution** : 
  1. Ajoute plus d'exemples similaires
  2. Augmente le `similarity_threshold`
  3. Vérifie que tes questions de test ressemblent aux questions d'entraînement

### "Lent à l'entraînement"

- **Solution** : 
  - Réduis la taille des données (`max_features` dans TF-IDF)
  - Utilise un `ngram_range` plus petit (ex: `(1, 1)` au lieu de `(1, 3)`)

### "Problèmes de mémoire"

- **Solution** : 
  - Réduis `max_history` dans la configuration
  - Limite le nombre de données d'entraînement

## 📖 Documentation Technique

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                    chat.py                              │
│              (Interface utilisateur)                   │
└─────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────┐
│                    ai_core.py                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ DPAILocalAI │  │ Vectorizer   │  │ Training Data    │  │
│  │             │  │ (TF-IDF)     │  │                 │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
│                                                             │
│  - find_most_similar()                                 │
│  - generate_response()                                  │
│  - learn()                                              │
│  - train()                                             │
└─────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ data/         │   │ models/       │   │ chat.py       │
│ training_data │   │ *pkl files    │   │ (CLI)         │
│ *.json        │   │              │   │              │
└──────────────┘   └──────────────┘   └──────────────┘
```

### Algorithmes

1. **TF-IDF** : Transforme le texte en vecteurs pondérés
2. **Similarité Cosine** : Mesure la similarité entre vecteurs
3. **Apprentissage Incrémental** : Ajoute de nouvelles connaissances sans ré-entraîner complètement

### Performances

- **Temps de réponse** : < 1 seconde pour la plupart des questions
- **Mémoire** : ~10-100 Mo selon la taille des données
- **Précision** : > 80% avec de bonnes données d'entraînement

## 🤝 Contribuer

Pour améliorer cette IA :

1. **Ajoute des données** dans `data/training_data.json`
2. **Améliore les vectoriseurs** dans `ai_core.py`
3. **Ajoute des fonctionnalités** comme le traitement du langage naturel plus avancé

## 📄 Licence

Ce projet est conçu pour un usage interne DPAI. Toutes les données et la logique métier restent propriété de DPAI.

---

**Créé avec ❤️ pour DPAI**

*Une IA 100% locale, sans dépendance externe, qui comprend ton expertise.*
