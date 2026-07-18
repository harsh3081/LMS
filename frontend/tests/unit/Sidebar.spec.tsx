/**
 * RED->GREEN — issue #126 (AC1/AC2). The persistent left Sidebar renders
 * the Dashboard link plus the 3 labeled groups and their sub-links, using
 * the EXACT routes from the issue body, and highlights the current
 * section/page based on the active route.
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

describe('Sidebar (issue #126)', () => {
  it('AC1: renders the Dashboard link and all 3 group labels', () => {
    renderSidebar();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/');
    expect(screen.getByText('Lead Management')).toBeInTheDocument();
    expect(screen.getByText('Enquiry Management')).toBeInTheDocument();
    expect(screen.getByText('Test Drive Scheduling')).toBeInTheDocument();
  });

  it('AC1: renders every sub-link with the exact route from the issue body', () => {
    renderSidebar();

    const expectedLinks: Array<[string, string]> = [
      ['New Lead', '/leads/new'],
      ['Field Configuration', '/admin/field-config'],
      ['New Enquiry', '/enquiries/new'],
      ['My Upcoming Follow-ups', '/follow-ups/upcoming'],
      ['Book a Test Drive', '/test-drives/new'],
      ['Test Drive Scheduler', '/test-drives/scheduler'],
      ['My Upcoming Test Drives', '/test-drives/upcoming'],
    ];

    for (const [name, href] of expectedLinks) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    }
  });

  it('AC2: highlights the Dashboard link as current when on "/", and not when elsewhere', () => {
    renderSidebar('/');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'New Lead' })).not.toHaveAttribute('aria-current');
  });

  it('AC2: highlights the matching sub-link as current for a representative Lead Management route, not the Dashboard link', () => {
    renderSidebar('/leads/new');
    expect(screen.getByRole('link', { name: 'New Lead' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });

  it('AC2: highlights the matching sub-link as current for a representative Test Drive Scheduling route', () => {
    renderSidebar('/test-drives/scheduler');
    expect(screen.getByRole('link', { name: 'Test Drive Scheduler' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Book a Test Drive' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'My Upcoming Test Drives' })).not.toHaveAttribute('aria-current');
  });

  it('does not treat "/leads/new" as active when on an unrelated Lead detail route', () => {
    renderSidebar('/leads/abc123');
    expect(screen.getByRole('link', { name: 'New Lead' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  });
});
