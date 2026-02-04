import { db } from "./database";
import { SQLResultSet } from "./types";

function buildResult(rows: any[], rowsAffected = 0, insertId?: number): SQLResultSet {
  return {
    insertId,
    rowsAffected,
    rows: {
      length: rows.length,
      item: (index: number) => rows[index],
      _array: rows,
    },
  };
}

export async function runQuery(
  sql: string,
  params: any[] = []
): Promise<SQLResultSet> {
  const trimmed = sql.trim().toLowerCase();

  if (
    trimmed.startsWith("select") ||
    trimmed.startsWith("with") ||
    trimmed.startsWith("pragma")
  ) {
    const rows = await db.getAllAsync<any>(sql, params);
    return buildResult(rows, 0);
  }

  const result = await db.runAsync(sql, params);
  return buildResult([], result.changes ?? 0, result.lastInsertRowId);
}
