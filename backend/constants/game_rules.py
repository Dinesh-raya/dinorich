class GameRules:
    MIN_PLAYERS = 1
    MAX_PLAYERS = 6
    INITIAL_BALANCE = 15000
    BOARD_SIZE = 40

    # Jail rules
    MAX_JAIL_TURNS = 3
    JAIL_FINE = 500
    GO_TO_JAIL_TILE = 30
    JAIL_TILE = 10

    # Passing GO
    GO_REWARD = 1500

    # Timing (seconds)
    DEFAULT_TURN_TIMER = 60
    AUCTION_TIMER = 9
    DISCONNECT_TIMEOUT = 120

    # Dice
    MAX_DOUBLES = 3

    # House/Hotel building rules
    HOUSE_PRICES = {
        "brown": 500,
        "light_blue": 600,
        "pink": 1000,
        "orange": 1000,
        "red": 1500,
        "yellow": 1500,
        "green": 2000,
        "dark_blue": 2000
    }
    HOTEL_PRICE_MULTIPLIER = 5

    MAX_HOUSES_PER_PROPERTY = 4
    HOUSES_BEFORE_HOTEL = 4
    MAX_HOTELS_PER_PROPERTY = 1
    MAX_HOUSE_DIFFERENCE = 1

    BUY_TIMEOUT = 15
    TAX_TIMEOUT = 30
    TRADE_TIMEOUT = 120
    BUY_TIMEOUT_BUFFER = 5  # seconds of buffer between buy timeout and turn timer

    @staticmethod
    def get_buy_timeout(turn_timer_seconds: int) -> int:
        """Return the effective buy-phase timeout, capped so it never exceeds
        the turn timer minus a safety buffer.  This prevents the buy timer
        from running longer than the remaining turn when a short turn timer
        is configured (e.g. TURBO mode at 30 s)."""
        return min(GameRules.BUY_TIMEOUT, turn_timer_seconds - GameRules.BUY_TIMEOUT_BUFFER)
