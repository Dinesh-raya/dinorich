class GameRules:
    MIN_PLAYERS = 1
    MAX_PLAYERS = 6
    INITIAL_BALANCE = 150000
    BOARD_SIZE = 40
    
    # Jail rules
    MAX_JAIL_TURNS = 3
    JAIL_FINE = 5000
    GO_TO_JAIL_TILE = 30
    JAIL_TILE = 10
    
    # Passing GO
    GO_REWARD = 20000
    
    # Timing (seconds)
    DEFAULT_TURN_TIMER = 60
    AUCTION_TIMER = 9
    DISCONNECT_TIMEOUT = 120
    
    # Dice
    MAX_DOUBLES = 3  # Third double sends to jail
    
    # House/Hotel building rules
    # House/hotel prices by color group (in rupees)
    HOUSE_PRICES = {
        "brown": 50000,
        "light_blue": 50000,
        "pink": 100000,
        "orange": 100000,
        "red": 150000,
        "yellow": 150000,
        "green": 200000,
        "dark_blue": 200000
    }
    # Hotel price = 5 * house price (4 houses + hotel replacement)
    HOTEL_PRICE_MULTIPLIER = 5
    
    # Building restrictions
    MAX_HOUSES_PER_PROPERTY = 4
    HOUSES_BEFORE_HOTEL = 4
    MAX_HOTELS_PER_PROPERTY = 1
    
    # Building must be even across properties in color group
    # (cannot have more than 1 house difference between properties)
    MAX_HOUSE_DIFFERENCE = 1

    # BUY phase timeout (seconds) — if player doesn't buy, auto-forfeit to auction
    BUY_TIMEOUT = 15
