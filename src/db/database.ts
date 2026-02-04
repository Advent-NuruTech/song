import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("song_app.db");
