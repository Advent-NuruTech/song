export type Language = {
  code: "en" | "sw" | "luo" | string;
  name: string;
  label: string;
  description: string;
  color: string;
  iconText: string;
  enabled: boolean;
};

export const languages: Language[] = [
  {
    code: "en",
    name: "English",
    label: "ENG",
    description: "Explore all songs in English",
    color: "#3B82F6",
    iconText: "ENG",
    enabled: true,
  },
  {
    code: "sw",
    name: "Swahili",
    label: "KIS",
    description: "Explore all songs in Swahili",
    color: "#10B981",
    iconText: "KIS",
    enabled: true,
  },
  {
    code: "luo",
    name: "Luo",
    label: "LUO",
    description: "Explore all songs in Luo",
    color: "#8B5CF6",
    iconText: "LUO",
    enabled: true,
  },

  // future languages (disabled for now)
  {
    code: "kg",
    name: "Kikuyu",
    label: "KG",
    description: "More languages coming soon",
    color: "#F59E0B",
    iconText: "KG",
    enabled: false,
  },
];
