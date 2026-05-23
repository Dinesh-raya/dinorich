"""Bot AI engine — makes decisions for automated players."""
import random
import logging
from typing import Optional

from schemas.game import GameState, PropertyState
from schemas.action import TurnState, TurnPhase
from engine.property import (
    buy_property, can_build_house, build_house,
    can_build_hotel, build_hotel, mortgage_property,
    sell_house, get_board_config,
)
from constants.game_rules import GameRules

logger = logging.getLogger(__name__)

BOT_ID_PREFIX = "bot_"


def is_bot(player_id: str) -> bool:
    return player_id.startswith(BOT_ID_PREFIX)


def get_bot_name(index: int) -> str:
    names = ["Dino-Bot Alpha", "Dino-Bot Beta", "Dino-Bot Gamma", "Dino-Bot Delta"]
    return names[index % len(names)]


class BotBrain:
    """Heuristic-based AI decision engine for bot players."""

    def decide_tick(self, game: GameState, turn: TurnState, player_id: str) -> Optional[str]:
        """Called every tick when it's a bot's turn. Returns action hint or None."""
        player = game.room.players.get(player_id)
        if not player or player.is_bankrupt:
            return None

        if turn.in_debt:
            self._resolve_debt(game, turn, player_id)
            return None

        if turn.pending_tax:
            self._pay_tax(game, turn, player_id)
            return None

        if turn.pending_rent:
            # Bot automatically pays rent (handled by process_roll)
            return None

        return None

    def decide_buy(self, game: GameState, player_id: str, property_id: int) -> bool:
        """Decide whether to buy a property outright or let it go to auction."""
        player = game.room.players.get(player_id)
        config = get_board_config().get(property_id)
        if not player or not config:
            return False

        price = config.get("price", 0)
        color = config.get("color", "")

        # Always buy cheap properties (< 50k)
        if price <= 50000:
            return True

        # Buy if we have > 3x the price in cash (keep reserve)
        if player.money >= price * 3:
            return True

        # Buy if it completes a monopoly and we can afford it
        if color:
            color_props = [tid for tid, cfg in get_board_config().items()
                           if cfg.get("color") == color and cfg.get("type") == "property"]
            owned_in_color = [tid for tid in color_props if tid in player.properties_owned]
            needed = len(color_props) - len(owned_in_color) - 1  # -1 for this property
            if needed == 0 and player.money >= price * 2:
                return True  # Completes monopoly

        # Otherwise, let it go to auction (bid there instead)
        return False

    def decide_bid(self, game: GameState, player_id: str, property_id: int,
                   current_bid: int) -> Optional[int]:
        """Decide bid amount in auction. Returns None to pass, or bid amount."""
        player = game.room.players.get(player_id)
        config = get_board_config().get(property_id)
        if not player or not config:
            return None

        price = config.get("price", 0)
        max_bid = min(int(price * 1.3), player.money)

        # Don't bid more than 60% of our cash
        max_afford = int(player.money * 0.6)
        max_bid = min(max_bid, max_afford)

        if current_bid >= max_bid:
            return None  # Too expensive

        # 40% chance to bid, higher if we need this color
        color = config.get("color", "")
        want_bid = 0.4
        if color:
            color_props = [tid for tid in game.properties if game.properties[tid].owner_id == player_id
                           and get_board_config().get(tid, {}).get("color") == color]
            if color_props:
                want_bid = 0.6  # More interested if we already own some in this color

        if random.random() > want_bid:
            return None

        # Bid increment: jump to 60-80% of max
        target = int(max_bid * (0.6 + random.random() * 0.2))
        return max(current_bid + 100, target)

    def decide_build(self, game: GameState, player_id: str) -> bool:
        """Try to build houses/hotels. Returns True if any building happened."""
        player = game.room.players.get(player_id)
        if not player:
            return False

        built = False
        # Group owned properties by color
        color_groups: dict = {}
        for tid in player.properties_owned:
            config = get_board_config().get(tid)
            if config and config.get("type") == "property":
                color = config.get("color", "")
                if color not in color_groups:
                    color_groups[color] = []
                color_groups[color].append(tid)

        for color, tids in color_groups.items():
            house_price = GameRules.HOUSE_PRICES.get(color, 0)
            if house_price == 0:
                continue

            # Check if we have monopoly (own all properties in this color)
            all_color_tids = [tid for tid, cfg in get_board_config().items()
                              if cfg.get("color") == color and cfg.get("type") == "property"]
            if set(tids) != set(all_color_tids):
                continue  # No monopoly, can't build

            for tid in tids:
                prop = game.properties.get(tid)
                if not prop:
                    continue

                # Try to build hotel if we have 4 houses
                if prop.houses == GameRules.HOUSES_BEFORE_HOTEL or prop.hotels == 0:
                    can, msg = can_build_hotel(game, player_id, tid)
                    if can and player.money >= house_price * GameRules.HOTEL_PRICE_MULTIPLIER:
                        success, _ = build_hotel(game, player_id, tid)
                        if success:
                            built = True
                            continue

                # Try to build house
                if prop.houses < GameRules.MAX_HOUSES_PER_PROPERTY:
                    can, msg = can_build_house(game, player_id, tid)
                    if can and player.money >= house_price:
                        success, _ = build_house(game, player_id, tid)
                        if success:
                            built = True

        return built

    def _resolve_debt(self, game: GameState, turn: TurnState, player_id: str):
        """Try to resolve debt by selling buildings, then mortgaging."""
        player = game.room.players[player_id]

        # First try selling houses (high-value properties last)
        for tid in reversed(player.properties_owned):
            if player.money >= 0:
                break
            prop = game.properties.get(tid)
            if prop and prop.houses > 0:
                ok, _ = sell_house(game, player_id, tid)
                if ok:
                    logger.debug(f"Bot {player_id} sold house on {tid} to resolve debt")

        # Then mortgage cheapest properties
        if player.money < 0:
            owned_with_mortgage = [(tid, get_board_config().get(tid, {}).get("mortgage", 0))
                                   for tid in player.properties_owned
                                   if not game.properties.get(tid, PropertyState(tile_id=tid)).is_mortgaged]
            owned_with_mortgage.sort(key=lambda x: x[1])  # Cheapest first
            for tid, _ in owned_with_mortgage:
                if player.money >= 0:
                    break
                ok, _ = mortgage_property(game, player_id, tid)
                if ok:
                    logger.debug(f"Bot {player_id} mortgaged {tid} to resolve debt")

    def _pay_tax(self, game: GameState, turn: TurnState, player_id: str):
        """Pay tax — choose cheaper option."""
        player = game.room.players[player_id]

        if not turn.pending_tax:
            return

        flat_amount = turn.pending_tax.get("amount", 0)

        # Calculate 10% of total worth (same logic as turn_manager)
        total_worth = player.money
        for pid in player.properties_owned:
            config = get_board_config().get(pid)
            if config:
                total_worth += config.get("price", 0)
                color = config.get("color")
                if color:
                    house_price = GameRules.HOUSE_PRICES.get(color, 0)
                    prop = game.properties.get(pid)
                    if prop:
                        total_worth += prop.houses * house_price
                        total_worth += prop.hotels * house_price * 5

        percentage_amount = int(total_worth * 0.1)
        use_percentage = percentage_amount < flat_amount

        from engine.turn_manager import turn_manager
        turn_manager.pay_tax(game.room.room_id, player_id, use_percentage)


def get_bot_color(index: int) -> str:
    colors = ["#888888", "#666666", "#999999", "#777777"]
    return colors[index % len(colors)]
