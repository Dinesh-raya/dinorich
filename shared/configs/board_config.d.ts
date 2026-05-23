export interface BoardTile {
  id: number;
  name: string;
  type: "property" | "tax" | "corner" | "card_treasury" | "card_surprise" | "utility" | "airport" | "jail" | "free_parking" | "go_to_jail";
  color?: string;
  price?: number;
  rent?: number[];
  mortgage?: number;
  group?: string;
}

export interface BoardConfig {
  tiles: BoardTile[];
}
