"""Environment Builder: pick places and scene details and turn them into a prompt sentence.

Places ("a cozy cabin by the lake") come first; the details (time of day, weather, season, atmosphere) are written
as adjuncts ("at sunset", "in the rain") and follow after a comma:
"The scene is set in a cozy cabin by the lake, at sunset and surrounded by fog."
"""

from typing import Any, Dict, List

from .catalog_kit import Catalog, join_list

MODIFIER_CATEGORIES = {"Time of Day", "Weather & Sky", "Season", "Atmosphere & Details"}

CATEGORY_ORDER = [
    "Home & Interior", "Luxury & Hotels", "Bathroom & Spa", "Cafés, Bars & Restaurants", "Work, Study & Studios",
    "Studio Backdrops", "Beach & Coast", "Forests & Woods", "Mountains & Canyons", "Lakes, Rivers & Waterfalls",
    "Fields & Gardens", "Desert & Savanna", "Snow & Ice", "Jungle & Tropics", "City & Street", "Transport",
    "Culture & Historic", "Fantasy & Sci-Fi", "Time of Day", "Weather & Sky", "Season", "Atmosphere & Details",
]


def _sentence(entries: List[Dict[str, Any]], pronoun: str, lead: str) -> str:
    places = [e["text"] for e in entries if e["category"] not in MODIFIER_CATEGORIES]
    details = [e["text"] for e in entries if e["category"] in MODIFIER_CATEGORIES]
    body = join_list(places)
    if details:
        body = f"{body}, {join_list(details)}" if body else join_list(details)
    if not lead:
        lead = "The scene is set in" if places else "The scene is"
    return f"{lead} {body}."


catalog = Catalog(
    key="env",
    route_base="/environment_builder",
    data_filename="environment_builder.json",
    default_filename="environment_default_catalog.json",
    category_order=CATEGORY_ORDER,
    unknown_after="Fantasy & Sci-Fi",
    sentence=_sentence,
    noun="Environment",
)


def build_environment(selection: Any, mode: str = "fixed", pronoun: str = "She", lead: str = "", first_only: bool = False) -> str:
    return catalog.build(selection, mode, pronoun, lead, first_only)


def setup_environment_routes():
    catalog.setup_routes()
