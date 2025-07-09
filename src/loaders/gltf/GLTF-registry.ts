/**
 * Registry for caching objects that are shared across the loader.
 */
export class GLTFRegistry {
  objects: Record<string, unknown | Promise<unknown>>;

  constructor() {
    this.objects = {};
  }

  get<T>(key: string): T {
    return this.objects[key] as T;
  }

  add<T>(key: string, object: T): void {
    this.objects[key] = object;
  }

  remove(key: string): void {
    delete this.objects[key];
  }

  removeAll(): void {
    this.objects = {};
  }
}
