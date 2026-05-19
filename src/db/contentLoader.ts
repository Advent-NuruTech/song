export type RequireContext = {
  keys(): string[];
  <T = any>(id: string): T;
};

export function loadJsonFromContext<T>(context: RequireContext): T[] {
  return context
    .keys()
    .sort()
    .flatMap((key) => {
      const module = context<T | T[]>(key) as { default?: T | T[] } | T | T[];
      const value =
        module && typeof module === "object" && "default" in module
          ? (module as { default: T | T[] }).default
          : (module as T | T[]);

      if (Array.isArray(value)) {
        return value;
      }
      return [value as T];
    });
}
