/**
 * RED->GREEN — LoginPage had zero test coverage before this Story (a
 * documented, accepted gap since issue #24). Covers the actual functional
 * behavior: email/password submission, server-error display, and the
 * password show/hide toggle added in this redesign.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../../src/pages/LoginPage';
import { api, ApiError } from '../../src/api/client';

vi.mock('../../src/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/client')>();
  return {
    ...actual,
    api: { login: vi.fn() },
  };
});

const mockedApi = vi.mocked(api, true);

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Welcome Back heading and email/password fields', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('does not render Google/Apple sign-on, Sign up, Remember me, or Forgot password (not backed by real functionality)', () => {
    renderLogin();
    expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /apple/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/remember me/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/forgot password/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /sign up/i })).not.toBeInTheDocument();
  });

  it('submits email/password and navigates to / on success', async () => {
    mockedApi.login.mockResolvedValue({ ok: true });
    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'dse@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'Secret123!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mockedApi.login).toHaveBeenCalledWith('dse@example.com', 'Secret123!');
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('shows a server error message and does not navigate on failed login', async () => {
    mockedApi.login.mockRejectedValue(new ApiError(401, null, 'Invalid email or password'));
    renderLogin();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'dse@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('shows required-field errors when submitting empty', async () => {
    renderLogin();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(mockedApi.login).not.toHaveBeenCalled();
  });

  it('toggles password visibility', async () => {
    renderLogin();
    const user = userEvent.setup();
    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
