import { db } from "@/src/db/database";

export type ContentCategory = {
  contentType: "song" | "study";
  name: string;
  displayName: string;
  color: string;
  icon: string;
  description: string;
  sortOrder: number;
  usageCount: number;
};

export async function getContentCategories(type: "song" | "study"): Promise<ContentCategory[]> {
  const table = type === "song" ? "songs" : "studies";
  return db.getAllAsync<ContentCategory>(
    `SELECT c.contentType,c.name,c.displayName,c.color,c.icon,c.description,c.sortOrder,
            COUNT(x.id) AS usageCount
     FROM content_categories c LEFT JOIN ${table} x ON x.category=c.name
     WHERE c.contentType=? GROUP BY c.contentType,c.name
     ORDER BY c.sortOrder ASC,c.displayName COLLATE NOCASE ASC`,
    [type]
  );
}
