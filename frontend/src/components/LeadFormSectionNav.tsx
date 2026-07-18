import { MouseEvent, useEffect, useState } from 'react';

export interface LeadFormSection {
  id: string;
  label: string;
}

export interface LeadFormSectionNavProps {
  sections: LeadFormSection[];
}

/**
 * Side-panel navigation for the New Lead form's 6 sections (issue #114,
 * "Navigation" / AC1 / AC7). Kept as its own self-contained component
 * (not baked directly into NewLeadForm.tsx's JSX) so the two are
 * independently testable — an explicit design decision from the
 * orchestrator, not incidental structure.
 *
 * Mechanism: a plain in-page anchor-link list per section — clicking a link
 * scroll-into-views the matching section (`Element.scrollIntoView`, no full
 * navigation/page reload). The CURRENTLY VISIBLE section is tracked via
 * `IntersectionObserver` (no new npm dependency — AC7 "reflects which
 * section is currently in view"), watching each section's DOM node
 * (matched by `id`; NewLeadForm is expected to render one wrapper element
 * per section carrying a matching `id` before this component's effect
 * observes it).
 */
export function LeadFormSectionNav({ sections }: LeadFormSectionNavProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');

  useEffect(() => {
    if (sections.length === 0) return undefined;
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const intersectingIds = new Set(
          entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target.id),
        );
        if (intersectingIds.size === 0) return;
        // Prefer the first section (in declared/DOM order) that is
        // currently intersecting, so scrolling from section 3 into section
        // 4 (while section 3 is still partly in the "active" band) settles
        // on section 3 until it fully leaves that band.
        const next = sections.find((section) => intersectingIds.has(section.id));
        if (next) setActiveId(next.id);
      },
      // Treat roughly the top 30% of the viewport as the "active" band — a
      // section becomes current once it reaches near the top of the
      // scroll container, not only once fully visible.
      { rootMargin: '0px 0px -70% 0px', threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  function handleClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
  }

  return (
    <nav aria-label="Form sections" className="sticky top-4 space-y-1 text-sm">
      <ul>
        {sections.map((section) => {
          const isActive = section.id === activeId;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={isActive ? 'true' : undefined}
                onClick={(event) => handleClick(event, section.id)}
                className={
                  'block rounded-md px-3 py-1.5 transition-colors ' +
                  (isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-50')
                }
              >
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
