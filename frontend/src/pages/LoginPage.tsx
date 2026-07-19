import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';

/**
 * Login page — was missing entirely: the backend's cookie-session auth
 * (ADR-004) and `POST /api/v1/auth/login` endpoint existed since #24, but no
 * SPA route ever called it, so a real browser session had no way to
 * authenticate. Every other page's data fetches (lead-sources,
 * vehicle-models, leads) silently returned nothing once unauthenticated,
 * which looked like "empty dropdowns" rather than a visible auth error.
 *
 * REDESIGNED (direct user request) — matches a reference split-screen theme
 * (violet accent, light-gray inputs, illustrated right panel), with two
 * deliberate deviations from the reference:
 *   1. Google/Apple sign-in — explicitly excluded per the request.
 *   2. Sign-up tab, "Remember me", "Forgot password" — the reference's
 *      generic SaaS template included these, but this app has no
 *      self-service sign-up, no remember-me token persistence, and no
 *      forgot-password flow (deny-by-default RBAC, ADR-003 — accounts are
 *      provisioned, not self-registered). Rendering controls with no backing
 *      behavior would be a dead-end UI, not a "use the exact theme" ask, so
 *      only the functional Email/Password/Sign In flow is themed.
 * The right panel's content is dealership-specific (not the reference's
 * generic "Boost Your Sales Performance" SaaS copy), reflecting this app's
 * actual domain (automotive dealership lead-to-booking pipeline) rather than
 * a fabricated statistic.
 */
type FormValues = { email: string; password: string };

function CarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11m-14 0h14m-14 0a2 2 0 0 0-2 2v3a1 1 0 0 0 1 1h1m14-6a2 2 0 0 1 2 2v3a1 1 0 0 1-1 1h-1m-14 0v1.5A1.5 1.5 0 0 0 6.5 20h0A1.5 1.5 0 0 0 8 18.5V17m9 0v1.5a1.5 1.5 0 0 0 1.5 1.5h0a1.5 1.5 0 0 0 1.5-1.5V17M8 17h8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M9.36 5.35C10.19 5.13 11.08 5 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-3.22 3.9M6.6 6.6C4.14 8.2 2 12 2 12s3.5 7 10 7c1.35 0 2.58-.3 3.66-.79"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const inputClassName =
  'block w-full rounded-lg border-0 bg-slate-100 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-violet-500';

export function LoginPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { email: '', password: '' } });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api.login(values.email, values.password);
      navigate('/');
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Login failed. Please try again.');
    }
  });

  return (
    <div className="flex min-h-screen bg-white">
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600">
              <CarIcon className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-violet-700">Welcome Back</h1>
            <p className="mt-2 text-sm text-slate-500">Sign in to your Lead Management System</p>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-slate-800">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="Enter your email"
                className={inputClassName}
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-slate-800">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className={`${inputClassName} pr-11`}
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {formError && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-50 via-blue-50 to-violet-100 lg:flex lg:w-1/2 lg:items-center lg:justify-center">
        <div className="mx-auto max-w-md px-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">
            <CarIcon className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Drive Your Dealership Forward</h2>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Capture every lead, follow up on every enquiry, schedule every test drive, and convert more prospects
            into bookings — all in one workspace built for automotive dealership sales teams.
          </p>
          <div className="mt-8 inline-flex items-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white">
            Built for Automotive Dealerships
          </div>
        </div>
      </div>
    </div>
  );
}
