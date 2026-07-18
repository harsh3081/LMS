import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import { MockIntersectionObserver } from './support/mock-intersection-observer';

// jsdom does not implement Element.scrollIntoView — LeadFormSectionNav
// (issue #114) calls it on an anchor-link click to jump to a section.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// jsdom does not implement IntersectionObserver — LeadFormSectionNav (issue
// #114, AC7) relies on it for side-panel active-section highlighting.
// Installed globally (not per-test-file) because NewLeadForm renders
// LeadFormSectionNav internally, so every NewLeadForm test needs this to
// exist even when it isn't asserting on nav behavior itself. See
// tests/support/mock-intersection-observer.ts.
(globalThis as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver;
