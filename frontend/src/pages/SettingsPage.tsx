import * as React from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { AuthField } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PAGE_COVER_COLORS } from '@/features/pages/cover-colors';
import { useAuth } from '@/features/auth/auth-context';
import { cn } from '@/lib/utils';

const DECOR_COLORS = PAGE_COVER_COLORS.filter((color) => color.value).slice(0, 5);

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="flex gap-1.5 px-6 pt-5">
        {DECOR_COLORS.map((color) => (
          <div
            key={color.name}
            className="h-1.5 flex-1 rounded-full"
            style={{ backgroundColor: color.value }}
          />
        ))}
      </div>

      <div className="px-6 pt-5 pb-6">
        <h2 className="font-nav-cjk text-base font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <p className="font-nav-cjk mt-1 text-sm text-muted-foreground">
          {description}
        </p>
        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}) {
  const [show, setShow] = React.useState(false);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="font-nav-cjk text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 pr-10"
        />
        <button
          type="button"
          onClick={() => setShow((current) => !current)}
          className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={show ? '隐藏密码' : '显示密码'}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error ? <p className="font-nav-cjk text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function SettingsPage() {
  const { user, isAuthenticated, updateName, changePassword } = useAuth();
  const [nickname, setNickname] = React.useState(user?.name ?? '');
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [nicknameError, setNicknameError] = React.useState('');
  const [passwordErrors, setPasswordErrors] = React.useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [savingNickname, setSavingNickname] = React.useState(false);
  const [savingPassword, setSavingPassword] = React.useState(false);

  React.useEffect(() => {
    setNickname(user?.name ?? '');
  }, [user?.name]);

  const handleNicknameSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isAuthenticated) {
      toast.error('请先登录后再修改昵称。');
      return;
    }

    setNicknameError('');

    if (!nickname.trim()) {
      setNicknameError('昵称不能为空。');
      return;
    }

    setSavingNickname(true);

    try {
      await updateName(nickname);
      toast.success('昵称已更新');
    } catch (error) {
      setNicknameError(
        error instanceof Error ? error.message : '昵称更新失败。'
      );
    } finally {
      setSavingNickname(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isAuthenticated) {
      toast.error('请先登录后再修改密码。');
      return;
    }

    const nextErrors: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (!currentPassword) {
      nextErrors.currentPassword = '请输入当前密码。';
    }

    if (!newPassword) {
      nextErrors.newPassword = '请输入新密码。';
    } else if (newPassword.length < 6) {
      nextErrors.newPassword = '新密码至少 6 位。';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = '请确认新密码。';
    } else if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = '两次输入的密码不一致。';
    }

    setPasswordErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSavingPassword(true);

    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});
      toast.success('密码已更新');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '密码更新失败。');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[640px] px-4 py-6 sm:px-6 md:py-12">
        <header className="mb-8">
          <h1 className="font-nav-cjk text-2xl font-semibold tracking-tight text-foreground">
            设置
          </h1>
          <p className="font-nav-cjk mt-1 text-sm text-muted-foreground">
            管理你的账户信息与登录密码
          </p>
        </header>

        {!isAuthenticated ? (
          <div className="font-nav-cjk mb-6 rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            当前未登录，可先浏览设置。
            <Link
              to="/login"
              className="ml-1 font-medium text-foreground underline-offset-4 hover:underline"
            >
              去登录
            </Link>
          </div>
        ) : null}

        <div className="space-y-6">
          <SettingsSection
            title="个人资料"
            description="更新你的昵称，邮箱暂不可修改。"
          >
            <form className="space-y-5" onSubmit={handleNicknameSubmit}>
              <AuthField
                id="settings-nickname"
                label="昵称"
                value={nickname}
                placeholder={isAuthenticated ? '你的昵称' : '登录后设置昵称'}
                error={nicknameError}
                onChange={(value) => {
                  setNickname(value);
                  setNicknameError('');
                }}
              />

              <div className="space-y-2">
                <label
                  htmlFor="settings-email"
                  className="font-nav-cjk text-sm font-medium text-foreground"
                >
                  邮箱
                </label>
                <Input
                  id="settings-email"
                  type="email"
                  value={user?.email ?? ''}
                  placeholder={isAuthenticated ? undefined : '登录后显示邮箱'}
                  readOnly
                  disabled={!isAuthenticated}
                  className={cn(
                    'h-10 cursor-not-allowed bg-muted/50 text-muted-foreground'
                  )}
                />
              </div>

              <Button
                type="submit"
                className="h-8 bg-sidebar-primary/14 px-2.5 font-nav-cjk text-[13px] font-medium text-sidebar-primary shadow-none hover:bg-sidebar-primary/22 hover:text-sidebar-primary"
                disabled={
                  !isAuthenticated ||
                  savingNickname ||
                  nickname.trim() === user?.name
                }
              >
                {savingNickname ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    保存中…
                  </>
                ) : (
                  '保存昵称'
                )}
              </Button>
            </form>
          </SettingsSection>

          <SettingsSection
            title="修改密码"
            description="定期更换密码可以更好地保护你的账户。"
          >
            <form className="space-y-5" onSubmit={handlePasswordSubmit}>
              <PasswordField
                id="settings-current-password"
                label="当前密码"
                value={currentPassword}
                placeholder="输入当前密码"
                error={passwordErrors.currentPassword}
                onChange={(value) => {
                  setCurrentPassword(value);
                  setPasswordErrors((current) => ({
                    ...current,
                    currentPassword: undefined,
                  }));
                }}
              />

              <PasswordField
                id="settings-new-password"
                label="新密码"
                value={newPassword}
                placeholder="至少 6 位"
                error={passwordErrors.newPassword}
                onChange={(value) => {
                  setNewPassword(value);
                  setPasswordErrors((current) => ({
                    ...current,
                    newPassword: undefined,
                  }));
                }}
              />

              <PasswordField
                id="settings-confirm-password"
                label="确认新密码"
                value={confirmPassword}
                placeholder="再次输入新密码"
                error={passwordErrors.confirmPassword}
                onChange={(value) => {
                  setConfirmPassword(value);
                  setPasswordErrors((current) => ({
                    ...current,
                    confirmPassword: undefined,
                  }));
                }}
              />

              <Button
                type="submit"
                className="h-8 bg-sidebar-primary/14 px-2.5 font-nav-cjk text-[13px] font-medium text-sidebar-primary shadow-none hover:bg-sidebar-primary/22 hover:text-sidebar-primary"
                disabled={!isAuthenticated || savingPassword}
              >
                {savingPassword ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    更新中…
                  </>
                ) : (
                  '更新密码'
                )}
              </Button>
            </form>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
