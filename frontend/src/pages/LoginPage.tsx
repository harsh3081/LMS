import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { Button, Card, FormField, TextInput } from '../components/ui';

/**
 * Login page — was missing entirely: the backend's cookie-session auth
 * (ADR-004) and `POST /api/v1/auth/login` endpoint existed since #24, but no
 * SPA route ever called it, so a real browser session had no way to
 * authenticate. Every other page's data fetches (lead-sources,
 * vehicle-models, leads) silently returned nothing once unauthenticated,
 * which looked like "empty dropdowns" rather than a visible auth error.
 */
type FormValues = { email: string; password: string };

export function LoginPage() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
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
    <div style={{ maxWidth: 400, margin: '4rem auto' }}>
      <Card>
        <h1>Sign in</h1>
        <form onSubmit={onSubmit} noValidate>
          <FormField label="Email" htmlFor="login-email" error={errors.email?.message}>
            <TextInput
              id="login-email"
              type="email"
              {...register('email', { required: 'Email is required' })}
            />
          </FormField>
          <FormField label="Password" htmlFor="login-password" error={errors.password?.message}>
            <TextInput
              id="login-password"
              type="password"
              {...register('password', { required: 'Password is required' })}
            />
          </FormField>
          {formError && <p role="alert">{formError}</p>}
          <Button type="submit" disabled={isSubmitting}>
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}
