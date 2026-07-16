import * as React from 'react';
import { Link } from 'react-router-dom';

import { PAGE_COVER_COLORS } from '@/features/pages/cover-colors';
import { cn } from '@/lib/utils';

const DECOR_COLORS = PAGE_COVER_COLORS.filter((color) => color.value).map(
  (color) => color.value!
);

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="flex min-h-svh bg-background">
      <aside className="relative hidden w-[44%] overflow-hidden lg:flex lg:flex-col lg:justify-between">
        <div className="relative grid flex-1 grid-cols-3 gap-3 p-10">
          {DECOR_COLORS.slice(0, 9).map((color, index) => (
            <div
              key={color}
              className={cn(
                'rounded-2xl transition-transform duration-500 hover:scale-[1.03]',
                index % 3 === 1 && 'mt-8',
                index % 3 === 2 && 'mt-4'
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <div className="relative px-10 py-8">
          <Link
            to="/"
            className="text-xl font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
          >
            Knowledge
          </Link>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            整理知识、优雅写作，在同一处分享想法。
          </p>
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-6 py-5 lg:px-10">
          <Link
            to="/"
            className="text-lg font-semibold tracking-tight text-foreground transition-colors hover:text-primary lg:hidden"
          >
            Knowledge
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-10 lg:px-10">
          <div className="w-full max-w-[400px]">
            <div className="mb-8 lg:hidden">
              <div className="mb-4 grid grid-cols-5 gap-2">
                {DECOR_COLORS.slice(0, 5).map((color) => (
                  <div
                    key={color}
                    className="h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {title}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
              {children}
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {footer}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

type AuthFieldProps = {
  id: string;
  label: string;
  type?: React.HTMLInputTypeAttribute;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
};

export function AuthField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
}: AuthFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow]',
          'placeholder:text-muted-foreground',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
          error && 'border-destructive ring-destructive/20'
        )}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
