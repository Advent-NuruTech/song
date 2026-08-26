import { db } from "@/src/db/database";

export interface Study {
  id: string;
  category: string;
  categoryLabel?: string;
  title: string;
  subtitle: string;
  content: string;
  author: string;
  wordCount: number;
  isFeatured: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface StudySummary {
  id: string;
  category: string;
  categoryLabel?: string;
  title: string;
  subtitle: string;
  excerpt: string;
  author: string;
  wordCount: number;
  isFeatured: boolean;
}

export interface SearchResult {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  excerpt: string;
  author: string;
  matches: number;
}

// Generate consistent color based on category (for UI only)
export function getCategoryColor(category: string): string {
  // Simple hash function for consistent colors
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#2E7D32', '#1565C0', '#C62828', '#6A1B9A', 
    '#FF8F00', '#00838F', '#558B2F', '#283593',
    '#AD1457', '#37474F', '#5D4037', '#0277BD',
    '#388E3C', '#F57C00', '#7B1FA2', '#D32F2F',
  ];
  
  return colors[Math.abs(hash) % colors.length];
}

// Get all distinct categories from database
export async function getAllCategories(): Promise<string[]> {
  const result = await db.getAllAsync(
    `SELECT DISTINCT category FROM studies ORDER BY category COLLATE NOCASE ASC`
  ) as { category: string }[];
  return result.map(row => row.category);
}

// Get categories with study counts
export async function getCategoriesWithCounts(): Promise<{ category: string; displayName: string; count: number }[]> {
  const result = await db.getAllAsync(
    `SELECT s.category, COALESCE(c.displayName,s.category) AS displayName, COUNT(*) as count
     FROM studies s LEFT JOIN content_categories c ON c.contentType='study' AND c.name=s.category
     GROUP BY s.category
     ORDER BY count DESC, displayName COLLATE NOCASE ASC`
  );
  return result as { category: string; displayName: string; count: number }[];
}

// Get all studies with filtering
export async function getStudies(options: {
  category?: string;
  search?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<Study[]> {
  const conditions: string[] = [];
  const params: any[] = [];
  
  if (options.category) {
    conditions.push('category = ?');
    params.push(options.category);
  }
  
  if (options.featured !== undefined) {
    conditions.push('isFeatured = ?');
    params.push(options.featured ? 1 : 0);
  }
  
  if (options.search) {
    conditions.push(`
      rowid IN (
        SELECT rowid FROM studies_fts 
        WHERE studies_fts MATCH ? 
        ORDER BY rank
      )
    `);
    params.push(`${options.search}*`);
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  let query = `
    SELECT id, category, title, subtitle, content, author, 
           wordCount, isFeatured, createdAt, updatedAt
    FROM studies
    ${whereClause}
    ORDER BY isFeatured DESC, createdAt DESC
  `;
  
  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }
  
  if (options.offset) {
    query += ' OFFSET ?';
    params.push(options.offset);
  }
  
  const result = await db.getAllAsync(query, params);
  return result as Study[];
}

// Get study by ID
export async function getStudyById(id: string): Promise<Study | null> {
  const result = await db.getFirstAsync(
    `SELECT s.id, s.category, COALESCE(c.displayName,s.category) AS categoryLabel,
            s.title, s.subtitle, s.content, s.author,s.wordCount,s.isFeatured,s.createdAt,s.updatedAt
     FROM studies s LEFT JOIN content_categories c ON c.contentType='study' AND c.name=s.category
     WHERE s.id = ?`,
    [id]
  );
  
  return result as Study | null;
}

// Get study summaries for listing
export async function getStudySummaries(options: {
  category?: string;
  featured?: boolean;
  limit?: number;
} = {}): Promise<StudySummary[]> {
  const conditions: string[] = [];
  const params: any[] = [];
  
  if (options.category) {
    conditions.push('category = ?');
    params.push(options.category);
  }
  
  if (options.featured !== undefined) {
    conditions.push('isFeatured = ?');
    params.push(options.featured ? 1 : 0);
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  let query = `
    SELECT s.id, s.category, COALESCE(c.displayName,s.category) AS categoryLabel, s.title, s.subtitle,
           substr(content, 1, 300) as excerpt,
           author, wordCount, isFeatured
    FROM studies s LEFT JOIN content_categories c ON c.contentType='study' AND c.name=s.category
    ${whereClause}
    ORDER BY isFeatured DESC, createdAt DESC
  `;
  
  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }
  
  const result = await db.getAllAsync(query, params);
  return result as StudySummary[];
}

// Full-text search across all studies
export async function searchStudies(query: string, limit: number = 50): Promise<SearchResult[]> {
  if (!query.trim()) {
    return [];
  }
  
  const result = await db.getAllAsync(
    `SELECT s.id, s.category, s.title, s.subtitle, 
            substr(s.content, 1, 260) as excerpt,
            s.author,
            0 as matches
     FROM studies s
     JOIN studies_fts f ON s.rowid = f.rowid
     WHERE studies_fts MATCH ?
     ORDER BY s.createdAt DESC
     LIMIT ?`,
    [`${query}*`, limit]
  );
  
  return result as SearchResult[];
}

// Get total study count
export async function getTotalStudyCount(category?: string): Promise<number> {
  const query = category 
    ? `SELECT COUNT(*) as count FROM studies WHERE category = ?`
    : `SELECT COUNT(*) as count FROM studies`;
  
  const params = category ? [category] : [];
  const result = await db.getFirstAsync(query, params) as { count: number } | null;
  return result?.count ?? 0;
}

// Get featured studies
export async function getFeaturedStudies(limit: number = 10): Promise<StudySummary[]> {
  const result = await db.getAllAsync(
    `SELECT id, category, title, subtitle, 
            substr(content, 1, 200) as excerpt,
            author, wordCount, isFeatured
     FROM studies
     WHERE isFeatured = 1
     ORDER BY createdAt DESC
     LIMIT ?`,
    [limit]
  );
  
  return result as StudySummary[];
}

// Get studies by author
export async function getStudiesByAuthor(author: string): Promise<StudySummary[]> {
  const result = await db.getAllAsync(
    `SELECT id, category, title, subtitle, 
            substr(content, 1, 200) as excerpt,
            author, wordCount, isFeatured
     FROM studies
     WHERE author = ?
     ORDER BY createdAt DESC`,
    [author]
  );
  
  return result as StudySummary[];
}
