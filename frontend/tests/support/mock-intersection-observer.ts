import { vi } from 'vitest';

/**
 * jsdom (the frontend Vitest environment, vite.config.ts) does not implement
 * `IntersectionObserver` — LeadFormSectionNav (issue #114, AC7) relies on it
 * for side-panel active-section highlighting. This test double is installed
 * globally in tests/setup.ts (NewLeadForm renders LeadFormSectionNav
 * internally, so every NewLeadForm test needs a working constructor even
 * when it isn't asserting on nav behavior itself) and is also imported
 * directly by LeadFormSectionNav.spec.tsx, which grabs the latest instance
 * via `MockIntersectionObserver.instances` and calls `.trigger(...)` to
 * simulate a scroll-driven visibility change.
 */
export class MockIntersectionObserver implements IntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  root: Element | Document | null = null;
  rootMargin = '';
  thresholds: ReadonlyArray<number> = [];

  private readonly callback: IntersectionObserverCallback;
  readonly observedElements: Element[] = [];

  constructor(callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe = vi.fn((el: Element) => {
    this.observedElements.push(el);
  });
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = (): IntersectionObserverEntry[] => [];

  /** Test helper: simulate one or more observed elements crossing into/out
   * of the "active" viewport band. */
  trigger(entries: Array<{ target: Element; isIntersecting: boolean }>) {
    this.callback(
      entries.map((entry) => ({
        ...entry,
        intersectionRatio: entry.isIntersecting ? 1 : 0,
        boundingClientRect: {} as DOMRectReadOnly,
        intersectionRect: {} as DOMRectReadOnly,
        rootBounds: null,
        time: Date.now(),
      })) as IntersectionObserverEntry[],
      this as unknown as IntersectionObserver,
    );
  }

  static reset() {
    MockIntersectionObserver.instances = [];
  }
}
