import { ContentProviderAdapter } from '@anivora/types';
import { AnimeHubAdapter } from './anime-hub.adapter';
import { DonghuaStreamAdapter } from './donghua-stream.adapter';
import { AnichinAdapter } from './anichin.adapter';

/**
 * Provider Registry - Manages and resolves active provider adapters
 */
export class ProviderRegistry {
  private static readonly adapters: Map<string, ContentProviderAdapter> = new Map();

  static {
    this.register(new AnichinAdapter());
    this.register(new AnimeHubAdapter());
    this.register(new DonghuaStreamAdapter());
  }

  public static register(adapter: ContentProviderAdapter): void {
    this.adapters.set(adapter.config.id, adapter);
    this.adapters.set(adapter.config.slug, adapter);
  }

  public static get(idOrSlug: string): ContentProviderAdapter | undefined {
    return this.adapters.get(idOrSlug);
  }

  public static getAll(): ContentProviderAdapter[] {
    const unique = new Set(this.adapters.values());
    return Array.from(unique);
  }
}
