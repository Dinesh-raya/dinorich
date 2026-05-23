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
    TRADE_TIMEOUT = 120
