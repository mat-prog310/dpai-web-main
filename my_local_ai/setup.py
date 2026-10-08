#!/usr/bin/env python3
"""
Script d'installation pour DPAI Local AI
"""

from setuptools import setup, find_packages
import os

# Lire le README
with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="dpai-local-ai",
    version="1.0.0",
    author="DPAI",
    author_email="",
    description="IA locale 100% Python pour DPAI - sans modèle externe",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="",
    packages=find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Intended Audience :: Developers",
        "Topic :: Artificial Intelligence",
    ],
    python_requires=">=3.8",
    install_requires=[
        "numpy>=1.21.0",
        "scikit-learn>=1.0.0",
        "scipy>=1.7.0",
    ],
    entry_points={
        "console_scripts": [
            "dpai-ai=chat:main",
            "dpai-train=train:main",
        ],
    },
    package_data={
        "my_local_ai": ["data/*.json", "models/*.pkl"],
    },
    include_package_data=True,
)
