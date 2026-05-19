import random
from typing import List

# Hindu mythology inspired default player names
PLAYER_NAME_POOL: List[str] = [
    "Shiva",
    "Vishnu",
    "Hanuman",
    "Krishna",
    "Rama",
    "Ganesha",
    "Kartikeya",
    "Narayana",
    "Rudra",
    "Mahadev",
    "Parashurama",
    "Indra",
    "Surya",
    "Agni",
    "Varuna",
    "Vayu",
    "Yama",
    "Lakshmi",
    "Saraswati",
    "Durga",
]


def get_random_name() -> str:
    """Pick a random name from the mythology pool."""
    return random.choice(PLAYER_NAME_POOL)


def ensure_unique_name(desired_name: str, existing_names: List[str]) -> str:
    """
    If desired_name is not in existing_names, return it as-is.
    Otherwise append _2, _3, etc. until unique.
    """
    if desired_name not in existing_names:
        return desired_name

    counter = 2
    while f"{desired_name}_{counter}" in existing_names:
        counter += 1
    return f"{desired_name}_{counter}"
