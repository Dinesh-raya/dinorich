from schemas.game import GameState
from engine.game_initializer import load_board_config
from constants.game_rules import GameRules

_BOARD_CONFIG_CACHE = None

def get_board_config():
    global _BOARD_CONFIG_CACHE
    if _BOARD_CONFIG_CACHE is None:
        _BOARD_CONFIG_CACHE = {t["id"]: t for t in load_board_config()}
    return _BOARD_CONFIG_CACHE

def buy_property(game_state: GameState, player_id: str, property_id: int) -> tuple[bool, str]:
    """Attempts to buy a property for a player. Returns (success, message)."""
    if property_id not in game_state.properties:
        return False, "Not a buyable property"
        
    prop_state = game_state.properties[property_id]
    if prop_state.owner_id is not None:
        return False, "Property is already owned"
        
    config = get_board_config().get(property_id)
    if not config:
        return False, "Invalid property config"
        
    price = config.get("price", 0)
    player = game_state.room.players.get(player_id)
    if not player:
        return False, "Player not found"

    if property_id in player.properties_owned:
        return False, "Already owned"

    if player.money < price:
        return False, "Not enough money"
        
    player.money -= price
    prop_state.owner_id = player_id
    player.properties_owned.append(property_id)
    
    game_state.add_log(f"{player.name} bought {config['name']} for ₹{price}")
    return True, "Property bought successfully"

def calculate_rent(game_state: GameState, property_id: int, dice_total: int = 0) -> int:
    """Calculate rent owed when a player lands on an owned property.

    Rent varies by property type:

    **Standard Properties** (color groups):
        - Base rent from board_config rent[0].
        - If owner has a monopoly (all tiles in color group) and double_rent
          is enabled in room settings, base rent is doubled.
        - With houses/hotels, rent is taken from the rent[] array by index
          (1–4 for houses, 5 for hotel).

    **Airports** (Indian railway-station equivalents):
        - ₹25 × 2^(airports_owned − 1).
        - Owning 1 → ₹25, 2 → ₹50, 3 → ₹100, 4 → ₹200.

    **Utilities** — CUSTOM THEMATIC FORMULAS (not standard Monopoly):
        These are intentional game-design decisions, documented here
        to prevent accidental "fixes":

        *NTPC Power (tile 12)* — Exponential surge pricing:
            - 1 utility owned: dice² × 0.5
            - 2 utilities owned: dice² × 1
            Represents the exponential nature of electricity demand pricing.
            High rolls hurt much more than low rolls.

        *Jal Jeevan Water (tile 28)* — Scarcity pricing tied to alive players:
            - 1 utility owned: dice × 3 + 2 × alive_players
            - 2 utilities owned: dice × 6 + 4 × alive_players
            Represents water scarcity — rent increases as fewer players go
            bankrupt (more demand), but scales linearly with dice roll.

    Args:
        game_state: Current game state with player/property data.
        property_id: The board tile ID of the property landed on.
        dice_total: Sum of both dice (required for utility rent calculation).

    Returns:
        Rent amount in ₹. Returns 0 if unowned, mortgaged, or invalid.
    """
    prop_state = game_state.properties.get(property_id)
    if not prop_state or prop_state.owner_id is None or prop_state.is_mortgaged:
        return 0

    config = get_board_config().get(property_id)
    if not config:
        return 0

    owner_id = prop_state.owner_id
    owner = game_state.room.players.get(owner_id)
    if not owner:
        return 0

    if config["type"] == "property":
        color = config["color"]
        color_group_ids = [k for k, v in get_board_config().items() if v.get("color") == color]
        has_monopoly = all(game_state.properties[k].owner_id == owner_id for k in color_group_ids)

        if prop_state.houses == 0 and prop_state.hotels == 0:
            base_rent = config["rent"][0]
            if has_monopoly and game_state.room.settings.double_rent_enabled:
                return base_rent * 2
            return base_rent
        else:
            rent_index = prop_state.houses
            if prop_state.hotels > 0:
                rent_index = 5
            return config["rent"][rent_index]

    elif config["type"] == "airport":
        # Airport rent: ₹250 × 2^(owned − 1), same as standard Monopoly railroad formula
        board = get_board_config()
        owned_airports = sum(1 for p in owner.properties_owned if board.get(p, {}).get("type") == "airport")
        return 25 * (2 ** (owned_airports - 1))

    elif config["type"] == "utility":
        board = get_board_config()
        owned_utilities = sum(1 for p in owner.properties_owned if board.get(p, {}).get("type") == "utility")
        tile_name = config.get("name", "")

        if tile_name == "NTPC Power":
            # NTPC Power — Exponential surge pricing (THEMATIC, see docstring)
            # Formula: dice² × multiplier   (5 if solo, 10 if both owned)
            multiplier = 1 if owned_utilities >= 2 else 0.5
            return int(dice_total * dice_total * multiplier)

        elif tile_name == "Jal Jeevan Water":
            # Jal Jeevan Water — Scarcity pricing (THEMATIC, see docstring)
            # Formula: dice × base + per_player × alive_players
            alive_players = sum(1 for p in game_state.room.players.values() if not p.is_bankrupt)
            if owned_utilities >= 2:
                return dice_total * 6 + 4 * alive_players
            return dice_total * 3 + 2 * alive_players

    return 0

def mortgage_property(game_state: GameState, player_id: str, property_id: int) -> tuple[bool, str]:
    if not game_state.room.settings.mortgage_enabled:
        return False, "Mortgages are disabled in this room"
        
    prop_state = game_state.properties.get(property_id)
    if not prop_state or prop_state.owner_id != player_id:
        return False, "You do not own this property"
        
    if prop_state.is_mortgaged:
        return False, "Already mortgaged"
        
    # Official rules: ALL buildings in the color group must be sold before ANY property can be mortgaged
    board = get_board_config()
    config = board.get(property_id)
    color_group = config.get("color") if config else None
    if color_group:
        for pid, ps in game_state.properties.items():
            pc = board.get(pid)
            if pc and pc.get("color") == color_group and (ps.houses > 0 or ps.hotels > 0):
                return False, f"Must sell all buildings in the {color_group} group first"
        
    mortgage_value = config.get("mortgage", 0)
    
    prop_state.is_mortgaged = True
    game_state.room.players[player_id].money += mortgage_value
    
    game_state.add_log(f"{game_state.room.players[player_id].name} mortgaged {config['name']} for ₹{mortgage_value}")
    return True, "Mortgaged successfully"

def unmortgage_property(game_state: GameState, player_id: str, property_id: int) -> tuple[bool, str]:
    prop_state = game_state.properties.get(property_id)
    if not prop_state or prop_state.owner_id != player_id:
        return False, "You do not own this property"
        
    if not prop_state.is_mortgaged:
        return False, "Not mortgaged"
        
    config = get_board_config().get(property_id)
    unmortgage_cost = int(config.get("mortgage", 0) * 1.1) # 10% interest
    
    player = game_state.room.players[player_id]
    if player.money < unmortgage_cost:
        return False, "Not enough money"
        
    player.money -= unmortgage_cost
    prop_state.is_mortgaged = False
    
    game_state.add_log(f"{player.name} unmortgaged {config['name']} for ₹{unmortgage_cost}")
    return True, "Unmortgaged successfully"

def _get_effective_houses(prop_state) -> int:
    return prop_state.houses + 5 * prop_state.hotels

def can_build_house(game_state: GameState, player_id: str, property_id: int) -> tuple[bool, str]:
    """Check if a player can build a house on a property."""
    prop_state = game_state.properties.get(property_id)
    if not prop_state or prop_state.owner_id != player_id:
        return False, "You do not own this property"
    
    if prop_state.is_mortgaged:
        return False, "Cannot build on mortgaged property"

    if prop_state.hotels > 0:
        return False, "Cannot build house on property with hotel"

    config = get_board_config().get(property_id)
    if not config or config["type"] != "property":
        return False, "Not a buildable property"

    # Check if player has monopoly on color group
    color = config["color"]
    color_group_ids = [k for k, v in get_board_config().items() if v.get("color") == color]
    has_monopoly = all(game_state.properties[k].owner_id == player_id for k in color_group_ids)
    if not has_monopoly:
        return False, "You need monopoly on this color group to build"

    # Check house limit
    if prop_state.houses >= GameRules.MAX_HOUSES_PER_PROPERTY:
        return False, f"Maximum {GameRules.MAX_HOUSES_PER_PROPERTY} houses already built"
    
    # Check even building rule (cannot have more than 1 house difference between properties in same color group)
    other_props_in_group = [game_state.properties[p_id] for p_id in color_group_ids if p_id != property_id]
    current_effective = _get_effective_houses(prop_state)
    for other_prop in other_props_in_group:
        other_effective = _get_effective_houses(other_prop)
        if (current_effective + 1) - other_effective > GameRules.MAX_HOUSE_DIFFERENCE:
            return False, "Must build evenly across properties in color group"
    
    # Check if player has enough money
    house_price = GameRules.HOUSE_PRICES.get(color, 0)
    if house_price == 0:
        return False, "Invalid color group for building"
    
    player = game_state.room.players[player_id]
    if player.money < house_price:
        return False, "Not enough money"
    
    # Check bank house supply
    if game_state.houses_remaining <= 0:
        return False, "No houses available in bank - must auction"

    return True, "Can build house"

def build_house(game_state: GameState, player_id: str, property_id: int) -> tuple[bool, str]:
    """Build a house on a property."""
    can_build, message = can_build_house(game_state, player_id, property_id)
    if not can_build:
        return False, message

    config = get_board_config().get(property_id)
    color = config["color"]
    house_price = GameRules.HOUSE_PRICES.get(color, 0)

    player = game_state.room.players[player_id]
    prop_state = game_state.properties[property_id]

    # Deduct money and add house
    player.money -= house_price
    prop_state.houses += 1
    game_state.houses_remaining -= 1

    game_state.add_log(f"{player.name} built a house on {config['name']} for ₹{house_price}")
    return True, "House built successfully"

def can_build_hotel(game_state: GameState, player_id: str, property_id: int) -> tuple[bool, str]:
    """Check if a player can build a hotel on a property."""
    prop_state = game_state.properties.get(property_id)
    if not prop_state or prop_state.owner_id != player_id:
        return False, "You do not own this property"
    
    if prop_state.is_mortgaged:
        return False, "Cannot build on mortgaged property"
    
    config = get_board_config().get(property_id)
    if not config or config["type"] != "property":
        return False, "Not a buildable property"
    
    # Check if player has monopoly on color group
    color = config["color"]
    color_group_ids = [k for k, v in get_board_config().items() if v.get("color") == color]
    has_monopoly = all(game_state.properties[k].owner_id == player_id for k in color_group_ids)
    if not has_monopoly:
        return False, "You need monopoly on this color group to build"
    
    # Check hotel limit
    if prop_state.hotels >= GameRules.MAX_HOTELS_PER_PROPERTY:
        return False, "Maximum 1 hotel already built"
    
    # Check if property has 4 houses
    if prop_state.houses < GameRules.HOUSES_BEFORE_HOTEL:
        return False, f"Need {GameRules.HOUSES_BEFORE_HOTEL} houses before building hotel"
    
    # Check even building rule for hotels (all properties in group must have at least HOUSES_BEFORE_HOTEL houses)
    other_props_in_group = [game_state.properties[p_id] for p_id in color_group_ids if p_id != property_id]
    for other_prop in other_props_in_group:
        if other_prop.hotels == 0 and other_prop.houses < GameRules.HOUSES_BEFORE_HOTEL:
            return False, f"All properties in color group must have at least {GameRules.HOUSES_BEFORE_HOTEL} houses before building hotel"
    
    # Check bank hotel supply
    if game_state.hotels_remaining <= 0:
        return False, "No hotels available in bank - must auction"

    # Check if player has enough money
    house_price = GameRules.HOUSE_PRICES.get(color, 0)
    hotel_price = house_price * GameRules.HOTEL_PRICE_MULTIPLIER

    player = game_state.room.players[player_id]
    if player.money < hotel_price:
        return False, "Not enough money"

    return True, "Can build hotel"

def build_hotel(game_state: GameState, player_id: str, property_id: int) -> tuple[bool, str]:
    """Build a hotel on a property (replaces 4 houses)."""
    can_build, message = can_build_hotel(game_state, player_id, property_id)
    if not can_build:
        return False, message

    config = get_board_config().get(property_id)
    color = config["color"]
    house_price = GameRules.HOUSE_PRICES.get(color, 0)
    hotel_price = house_price * GameRules.HOTEL_PRICE_MULTIPLIER

    player = game_state.room.players[player_id]
    prop_state = game_state.properties[property_id]

    # Deduct money, remove 4 houses, add hotel
    player.money -= hotel_price
    game_state.houses_remaining += prop_state.houses  # Return houses to bank
    prop_state.houses = 0
    prop_state.hotels = 1
    game_state.hotels_remaining -= 1
    
    game_state.add_log(f"{player.name} built a hotel on {config['name']} for ₹{hotel_price} (replaced 4 houses)")
    return True, "Hotel built successfully"

def sell_house(game_state: GameState, player_id: str, property_id: int) -> tuple[bool, str]:
    """Sell a house from a property (half price)."""
    prop_state = game_state.properties.get(property_id)
    if not prop_state or prop_state.owner_id != player_id:
        return False, "You do not own this property"
    
    if prop_state.hotels > 0:
        return False, "Must sell hotel first"

    if prop_state.houses == 0:
        return False, "No houses to sell"
    
    config = get_board_config().get(property_id)
    color = config["color"]
    house_price = GameRules.HOUSE_PRICES.get(color, 0)
    sell_price = house_price // 2  # Half price when selling back
    
    # Check even building rule (cannot create >1 house difference)
    color_group_ids = [k for k, v in get_board_config().items() if v.get("color") == color]
    other_props_in_group = [game_state.properties[p_id] for p_id in color_group_ids if p_id != property_id]
    current_effective = _get_effective_houses(prop_state)
    for other_prop in other_props_in_group:
        other_effective = _get_effective_houses(other_prop)
        if (current_effective - 1) < other_effective - GameRules.MAX_HOUSE_DIFFERENCE:
            return False, "Cannot sell house - would create uneven development"
    
    player = game_state.room.players[player_id]
    prop_state.houses -= 1
    player.money += sell_price
    game_state.houses_remaining += 1

    game_state.add_log(f"{player.name} sold a house on {config['name']} for ₹{sell_price}")
    return True, "House sold successfully"

def sell_hotel(game_state: GameState, player_id: str, property_id: int) -> tuple[bool, str]:
    """Sell a hotel (half price, returns to 4 houses)."""
    prop_state = game_state.properties.get(property_id)
    if not prop_state or prop_state.owner_id != player_id:
        return False, "You do not own this property"

    if prop_state.hotels == 0:
        return False, "No hotel to sell"

    # Check if enough houses in bank to replace hotel
    if game_state.houses_remaining < 4:
        return False, "Not enough houses in bank to replace hotel (need 4)"

    config = get_board_config().get(property_id)
    color = config["color"]

    # Check even-building rule: 4 houses would be placed, other props need at least 3
    color_group_ids = [k for k, v in get_board_config().items() if v.get("color") == color]
    other_props_in_group = [game_state.properties[p_id] for p_id in color_group_ids if p_id != property_id]
    for other_prop in other_props_in_group:
        other_effective = _get_effective_houses(other_prop)
        if other_effective < (4 - GameRules.MAX_HOUSE_DIFFERENCE):
            return False, "Cannot sell hotel - would create uneven development (other properties need at least 3 houses)"

    house_price = GameRules.HOUSE_PRICES.get(color, 0)
    hotel_price = house_price * GameRules.HOTEL_PRICE_MULTIPLIER
    sell_price = hotel_price // 2  # Half price when selling back

    player = game_state.room.players[player_id]
    prop_state.hotels = 0
    prop_state.houses = 4  # Return to 4 houses
    player.money += sell_price
    game_state.hotels_remaining += 1  # Return hotel to bank
    game_state.houses_remaining -= 4  # Take 4 houses from bank

    game_state.add_log(f"{player.name} sold hotel on {config['name']} for ₹{sell_price} (returned to 4 houses)")
    return True, "Hotel sold successfully"
