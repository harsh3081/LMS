/**
 * RED->GREEN — issue #126 (AC1/AC2), RESTRUCTURED by issue #130.
 *
 * The persistent left Sidebar now renders 2 plain top-level links (Dashboard,
 * Lead Management — no sub-items left once New Lead/Field Configuration both
 * moved elsewhere) plus 3 labeled groups (Enquiry Management — its own label
 * links to `/enquiries`, plus "My Upcoming Follow-ups" as its one remaining
 * sub-item; Test Drive Scheduling, unchanged; Admin, new — containing just
 * Field Configuration), and highlights the current section/page based on the
 * active route.
 *
 * "My Upcoming Follow-ups" was corrected back in after the original issue
 * #130 text mistakenly omitted it — see Sidebar.tsx's NAV_ENTRIES comment
 * and .phoenix-os/project/specs/130/NOTES.md for the full story.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Sidebar } from '../../src/components/layout/Sidebar';

function renderSidebar(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="*" element={<Sidebar />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Sidebar (issue #130 restructuring)', () => {
  it('AC1: renders Dashboard and Lead Management as plain links with the exact routes', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Lead Management' })).toHaveAttribute('href', '/leads');
  });

  it('AC1 (issue #130): renders "Enquiry Management" as a group whose own label links to /enquiries, plus "My Upcoming Follow-ups" as its sub-link', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Enquiry Management' })).toHaveAttribute('href', '/enquiries');
    expect(screen.getByRole('link', { name: 'My Upcoming Follow-ups' })).toHaveAttribute(
      'href',
      '/follow-ups/upcoming',
    );
  });

  it('AC1: renders the Test Drive Scheduling group label (non-clickable) and all 3 of its sub-links', () => {
    renderSidebar();
    expect(screen.getByText('Test Drive Scheduling')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Test Drive Scheduling' })).not.toBeInTheDocument();

    const expectedLinks: Array<[string, string]> = [
      ['Book a Test Drive', '/test-drives/new'],
      ['Test Drive Scheduler', '/test-drives/scheduler'],
      ['My Upcoming Test Drives', '/test-drives/upcoming'],
    ];
    for (const [name, href] of expectedLinks) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });

  it('AC1 (issue #130): renders the new Admin group label (non-clickable) with a Field Configuration sub-link', () => {
    renderSidebar();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Field Configuration' })).toHaveAttribute('href', '/admin/field-config');
  });

  it('issue #130: no longer renders "New Lead" or "New Enquiry" as Sidebar entries (both moved into slide-over panels)', () => {
    renderSidebar();
    expect(screen.queryByRole('link', { name: 'New Lead' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'New Enquiry' })).not.toBeInTheDocument();
  });

  it('AC2: highlights the Dashboard link as current when on "/", and not when elsewhere', () => {
    renderSidebar('/');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Lead Management' })).not.toHaveAttribute('aria-current');
  });

  it('AC2: highlights the "Lead Management" link when on its own landing page', () => {
    renderSidebar('/leads');
    expect(screen.getByRole('link', { name: 'Lead Management' })).toHaveAttribute('aria-current', 'page');
  });

  it('AC2: highlights the "Lead Management" link when on a nested Lead route too', () => {
    renderSidebar('/leads/abc123');
    expect(screen.getByRole('link', { name: 'Lead Management' })).toHaveAttribute('aria-current', 'page');
  });

  it('AC2 (issue #130): highlights the "Enquiry Management" link when on its own landing page', () => {
    renderSidebar('/enquiries');
    expect(screen.getByRole('link', { name: 'Enquiry Management' })).toHaveAttribute('aria-current', 'page');
  });

  it('AC2 (issue #130): highlights the "Enquiry Management" link when on a nested Enquiry route too', () => {
    renderSidebar('/enquiries/enq-1/follow-up');
    expect(screen.getByRole('link', { name: 'Enquiry Management' })).toHaveAttribute('aria-current', 'page');
  });

  it('AC2 (issue #130): highlights "My Upcoming Follow-ups" as current, and the "Enquiry Management" group header as current alongside it', () => {
    renderSidebar('/follow-ups/upcoming');
    expect(screen.getByRole('link', { name: 'My Upcoming Follow-ups' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Enquiry Management' })).not.toHaveAttribute('aria-current');
  });

  it('AC2: highlights the matching sub-link as current for a representative Test Drive Scheduling route', () => {
    renderSidebar('/test-drives/scheduler');
    expect(screen.getByRole('link', { name: 'Test Drive Scheduler' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Book a Test Drive' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'My Upcoming Test Drives' })).not.toHaveAttribute('aria-current');
  });

  it('AC2 (issue #130): highlights "Field Configuration" as current under the Admin group when on its route', () => {
    renderSidebar('/admin/field-config');
    expect(screen.getByRole('link', { name: 'Field Configuration' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });

  it('does not treat "Lead Management" as active when on an unrelated route', () => {
    renderSidebar('/test-drives/new');
    expect(screen.getByRole('link', { name: 'Lead Management' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });
});
