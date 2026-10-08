# DPAI Local AI Package
"""
Package pour l'IA locale DPAI.

Ce package fournit une IA 100% locale qui fonctionne sans modèle externe.
"""

from .ai_core import DPAILocalAI, extract_from_dpai_files
from .chat import DPAIChatInterface

__version__ = "1.0.0"
__author__ = "DPAI"
__description__ = "IA locale 100% Python sans dépendance externe"

__all__ = ["DPAILocalAI", "DPAIChatInterface", "extract_from_dpai_files"]
