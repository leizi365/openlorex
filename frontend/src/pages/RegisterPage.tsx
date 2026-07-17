import * as React from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

import { AuthField, AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-context';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [submitting, setSubmitting] = React.useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const nextErrors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!name.trim()) {
      nextErrors.name = '请输入姓名。';
    }

    if (!email.trim()) {
      nextErrors.email = '请输入邮箱。';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = '请输入有效的邮箱地址。';
    }

    if (!password) {
      nextErrors.password = '请输入密码。';
    } else if (password.length < 6) {
      nextErrors.password = '密码至少 6 位。';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = '请确认密码。';
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = '两次输入的密码不一致。';
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      await register({ name, email, password });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="创建账号"
      subtitle="开始搭建你的个人知识库。"
      footer={
        <>
          已有账号？{' '}
          <Link
            to="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            登录
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <AuthField
          id="register-name"
          label="姓名"
          value={name}
          autoComplete="name"
          placeholder="你的姓名"
          error={fieldErrors.name}
          onChange={(value) => {
            setName(value);
            setFieldErrors((current) => ({ ...current, name: undefined }));
          }}
        />

        <AuthField
          id="register-email"
          label="邮箱"
          type="email"
          value={email}
          autoComplete="email"
          placeholder="请输入邮箱"
          error={fieldErrors.email}
          onChange={(value) => {
            setEmail(value);
            setFieldErrors((current) => ({ ...current, email: undefined }));
          }}
        />

        <div className="space-y-2">
          <label
            htmlFor="register-password"
            className="text-sm font-medium text-foreground"
          >
            密码
          </label>
          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              autoComplete="new-password"
              placeholder="至少 6 位"
              aria-invalid={Boolean(fieldErrors.password)}
              onChange={(event) => {
                setPassword(event.target.value);
                setFieldErrors((current) => ({
                  ...current,
                  password: undefined,
                }));
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 pr-10 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={showPassword ? '隐藏密码' : '显示密码'}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {fieldErrors.password ? (
            <p className="text-xs text-destructive">{fieldErrors.password}</p>
          ) : null}
        </div>

        <AuthField
          id="register-confirm-password"
          label="确认密码"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          autoComplete="new-password"
          placeholder="再次输入密码"
          error={fieldErrors.confirmPassword}
          onChange={(value) => {
            setConfirmPassword(value);
            setFieldErrors((current) => ({
              ...current,
              confirmPassword: undefined,
            }));
          }}
        />

        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          className="h-8 w-full bg-sidebar-primary/14 px-2.5 font-nav-cjk text-[13px] font-medium text-sidebar-primary shadow-none hover:bg-sidebar-primary/22 hover:text-sidebar-primary"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              注册中…
            </>
          ) : (
            '创建账号'
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
