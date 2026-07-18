/**
 * RED->GREEN (Inside-Out, Presentation Layer) — issue #114, AC1/AC7.
 * LeadFormSectionNav is deliberately kept self-contained (not baked into
 * NewLeadForm.tsx's JSX) so it is independently testable, per the
 * orchestrator's explicit design decision — this file proves the nav in
 * isolation, rendering plain section-marker <div id="..."> elements rather
 * than the real NewLeadForm.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { LeadFormSectionNav, LeadFormSection } from '../../src/components/LeadFormSectionNav';
import { MockIntersectionObserver } from '../support/mock-intersection-observer';

const sections: LeadFormSection[] = [
  { id: 'section-customer', label: 'Customer Details' },
  { id: 'section-vehicle', label: 'Vehicle Interest' },
  { id: 'section-exchange', label: 'Exchange Vehicle' },
  { id: 'section-finance', label: 'Finance' },
  { id: 'section-source', label: 'Source & Assignment' },
  { id: 'section-followup', label: 'Follow-up & Consent' },
];

function renderWithSectionMarkers() {
  return render(
    <div>
      {sections.map((s) => (
        <div id={s.id} key={s.id} />
      ))}
      <LeadFormSectionNav sections={sections} />
    </div>,
  );
}

function latestObserver() {
  const instance = MockIntersectionObserver.instances[MockIntersectionObserver.instances.length - 1];
  if (!instance) throw new Error('No IntersectionObserver instance was created');
  return instance;
}

describe('LeadFormSectionNav', () => {
  beforeEach(() => {
    MockIntersectionObserver.reset();
  });

  it('AC1: renders one link per section, in order', () => {
    renderWithSectionMarkers();
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(6);
    expect(links.map((l) => l.textContent)).toEqual([
      'Customer Details',
      'Vehicle Interest',
      'Exchange Vehicle',
      'Finance',
      'Source & Assignment',
      'Follow-up & Consent',
    ]);
  });

  it('AC1: each link points to the matching section id via an in-page anchor', () => {
    renderWithSectionMarkers();
    expect(screen.getByRole('link', { name: 'Customer Details' })).toHaveAttribute('href', '#section-customer');
    expect(screen.getByRole('link', { name: 'Finance' })).toHaveAttribute('href', '#section-finance');
  });

  it('defaults to highlighting the first section before any scroll/intersection event', () => {
    renderWithSectionMarkers();
    expect(screen.getByRole('link', { name: 'Customer Details' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', { name: 'Vehicle Interest' })).not.toHaveAttribute('aria-current');
  });

  it('AC7: observes every section element via IntersectionObserver', () => {
    renderWithSectionMarkers();
    const observer = latestObserver();
    expect(observer.observedElements).toHaveLength(6);
    expect(observer.observedElements.map((el) => el.id)).toEqual(sections.map((s) => s.id));
  });

  it('AC7: highlights the section reported as intersecting by the observer', () => {
    renderWithSectionMarkers();
    const observer = latestObserver();
    const vehicleEl = document.getElementById('section-vehicle')!;

    act(() => {
      observer.trigger([{ target: vehicleEl, isIntersecting: true }]);
    });

    expect(screen.getByRole('link', { name: 'Vehicle Interest' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', { name: 'Customer Details' })).not.toHaveAttribute('aria-current');
  });

  it('AC7: updates the highlighted section again as a later intersection event fires', () => {
    renderWithSectionMarkers();
    const observer = latestObserver();
    const financeEl = document.getElementById('section-finance')!;

    act(() => {
      observer.trigger([{ target: financeEl, isIntersecting: true }]);
    });
    expect(screen.getByRole('link', { name: 'Finance' })).toHaveAttribute('aria-current', 'true');

    const followupEl = document.getElementById('section-followup')!;
    act(() => {
      observer.trigger([
        { target: financeEl, isIntersecting: false },
        { target: followupEl, isIntersecting: true },
      ]);
    });
    expect(screen.getByRole('link', { name: 'Follow-up & Consent' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', { name: 'Finance' })).not.toHaveAttribute('aria-current');
  });

  it('when multiple sections are simultaneously intersecting, prefers the earliest one in declared order', () => {
    renderWithSectionMarkers();
    const observer = latestObserver();
    const vehicleEl = document.getElementById('section-vehicle')!;
    const exchangeEl = document.getElementById('section-exchange')!;

    act(() => {
      observer.trigger([
        { target: vehicleEl, isIntersecting: true },
        { target: exchangeEl, isIntersecting: true },
      ]);
    });

    expect(screen.getByRole('link', { name: 'Vehicle Interest' })).toHaveAttribute('aria-current', 'true');
  });

  it('AC1: clicking a link scroll-into-views the matching section and updates the highlight', async () => {
    renderWithSectionMarkers();
    const user = userEvent.setup();
    const sourceEl = document.getElementById('section-source')!;
    const scrollSpy = vi.spyOn(sourceEl, 'scrollIntoView');

    await user.click(screen.getByRole('link', { name: 'Source & Assignment' }));

    expect(scrollSpy).toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Source & Assignment' })).toHaveAttribute('aria-current', 'true');
  });

  it('disconnects the observer on unmount', () => {
    const { unmount } = renderWithSectionMarkers();
    const observer = latestObserver();
    unmount();
    expect(observer.disconnect).toHaveBeenCalled();
  });
});
