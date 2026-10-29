"""Pose Builder: pick poses from a catalog and turn them into a prompt sentence.

Every pose text starts with a gerund or a participle so that several can be chained after "She is":
"She is standing with her hands on her hips, looking over her shoulder and smiling."
The token ``{poss}`` becomes her / his / their depending on the pronoun. The storage, presets and routes
live in :mod:`catalog_kit`.
"""

from typing import Any, Dict, List

from .catalog_kit import Catalog, join_list

CATEGORY_ORDER = [
    "Standing", "Sitting", "Lying Down", "Kneeling", "Crouching & Squatting", "Leaning", "Walking & Motion", "Dancing",
    "Yoga & Stretching", "Action & Sports", "Sensual - Standing", "Sensual - Sitting", "Sensual - Lying",
    "Sensual - Kneeling & Crawling", "Pin-Up & Boudoir", "Bedroom & Bed", "Sofa & Chairs", "Beach & Pool", "Urban & Street",
    "Home & Windows", "Hands & Arms", "Sensual - Teasing Gestures", "Head & Gaze", "View & Angle", "+18",
]

POSSESSIVE = {"She": "her", "He": "his", "They": "their"}

# Entries of these categories are complete sentences ("A woman ... a man ..."): they are not chained after
# "She is" but appended as sentences of their own, after the chained poses.
STANDALONE_CATEGORIES = {"+18"}


def _sentence(entries: List[Dict[str, Any]], pronoun: str, lead: str) -> str:
    poss = POSSESSIVE.get(pronoun, "the")
    inline = [e for e in entries if e["category"] not in STANDALONE_CATEGORIES]
    standalone = [e["text"].replace("{poss}", poss).strip() for e in entries if e["category"] in STANDALONE_CATEGORIES]
    sentences: List[str] = []
    if inline:
        joined = join_list([e["text"].replace("{poss}", poss) for e in inline])
        if not lead:
            lead = {"She": "She is", "He": "He is", "They": "They are"}.get(pronoun, "")
        sentences.append(f"{lead} {joined}." if lead else f"{joined[:1].upper()}{joined[1:]}.")
    for text in standalone:
        if text:
            sentences.append(text if text[-1] in ".!?" else text + ".")
    return " ".join(sentences)


catalog = Catalog(
    key="pose",
    route_base="/pose_builder",
    data_filename="pose_builder.json",
    default_filename="pose_default_catalog.json",
    category_order=CATEGORY_ORDER,
    unknown_after="Home & Windows",
    sentence=_sentence,
    noun="Pose",
)


def build_pose(selection: Any, mode: str = "fixed", pronoun: str = "She", lead: str = "", first_only: bool = False) -> str:
    return catalog.build(selection, mode, pronoun, lead, first_only)


def setup_pose_routes():
    catalog.setup_routes()
