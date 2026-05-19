interface RequireContext {
  keys(): string[];
  <T = any>(id: string): T;
}

interface NodeRequire {
  (id: string): any;
  context(path: string, recursive?: boolean, filter?: RegExp): RequireContext;
}

declare const require: NodeRequire;
