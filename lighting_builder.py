"""Lighting Builder: pick lighting setups and turn them into a prompt sentence.

"The lighting is soft window light, a golden rim light and a subtle haze."
"""

from typing import Any, Dict, List

from .catalog_kit import Catalog, join_list

CATEGORY_ORDER = [
    "Natural Daylight", "Golden & Blue Hour", "Window & Indoor Light", "Studio Lighting", "Dramatic & Cinematic",
    "Neon & Colored", "Warm & Cozy", "Night & Low Light", "Weather & Atmosphere", "Light Direction & Quality",
    "Color & Direction Combos", "Special Effects", "Mood & Style",
]


def _sentence(entries: List[Dict[str, Any]], pronoun: str, lead: str) -> str:
    return f"{lead or 'The lighting is'} {join_list([e['text'] for e in entries])}."


catalog = Catalog(
    key="light",
    route_base="/lighting_builder",
    data_filename="lighting_builder.json",
    default_filename="lighting_default_catalog.json",
    category_order=CATEGORY_ORDER,
    unknown_after="Mood & Style",
    sentence=_sentence,
    noun="Lighting",
)


def build_lighting(selection: Any, mode: str = "fixed", pronoun: str = "She", lead: str = "", first_only: bool = False) -> str:
    return catalog.build(selection, mode, pronoun, lead, first_only)


def setup_lighting_routes():
    catalog.setup_routes()
