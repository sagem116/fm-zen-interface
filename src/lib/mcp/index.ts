import { defineMcp } from "@lovable.dev/mcp-js";
import searchClubs from "./tools/search-clubs";
import searchPlayers from "./tools/search-players";
import listCompetitions from "./tools/list-competitions";

export default defineMcp({
  name: "fm-zen-mcp",
  title: "FM Zen Interface MCP",
  version: "0.1.0",
  instructions:
    "Read-only tools for the FM Zen football database. Use `search_clubs`, `search_players`, and `list_competitions` to look up entities.",
  tools: [searchClubs, searchPlayers, listCompetitions],
});
