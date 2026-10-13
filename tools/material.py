# -*- coding: utf-8 -*-
"""Localização do acervo de referência (PDFs-fonte e históricos, FORA do repositório).

A variável de ambiente OASIS_MATERIAL aponta para a raiz do acervo, a pasta que
contém os `Material Referência <curso> <matriz>/`. Os scripts que tinham um caminho
fixo de outra máquina passam a montar o padrão a partir dela. Sem a variável, o
script que depende do padrão encerra com uma mensagem clara, em vez de abrir um
caminho que não existe.
"""
import os
import sys


def raiz():
    """Raiz do acervo (OASIS_MATERIAL) ou None se a variável não está definida."""
    return os.environ.get("OASIS_MATERIAL") or None


def no_acervo(*partes):
    """Caminho de algo dentro do acervo, ou None sem OASIS_MATERIAL."""
    base = raiz()
    return os.path.join(base, *partes) if base else None


def padrao_ou_sair(arquivo, *partes):
    """Resolve o PDF padrão de um script que aceita o caminho como argumento opcional.

    `arquivo` é o que o usuário passou (sys.argv) ou None. Sem ele, usa o acervo.
    """
    if arquivo:
        return arquivo
    candidato = no_acervo(*partes)
    if candidato is None:
        sys.exit(
            "Informe o PDF como argumento ou defina OASIS_MATERIAL com a raiz do acervo "
            "(a pasta que contém os 'Material Referência …/')."
        )
    return candidato
