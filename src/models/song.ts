export type Song = {
  id: string;
  hymnNumber: number;
  title: string;
  language: string;
  author?: string | null;
  stanzas: string[][];
  chorus: string[] | null;
};
