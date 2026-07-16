import * as authApi from '@/lib/api/auth';
import { getAccessToken } from '@/lib/api/client';

import type { AuthUser } from './types';

export function mapUserDto(user: authApi.UserDto): AuthUser {
  return {
    id: user.code,
    name: user.name,
    email: user.email,
  };
}

export async function bootstrapSession(): Promise<AuthUser | null> {
  if (!getAccessToken()) {
    return null;
  }

  try {
    const user = await authApi.fetchMe();
    return mapUserDto(user);
  } catch {
    authApi.logout();
    return null;
  }
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  const data = await authApi.register(input);
  return mapUserDto(data.user);
}

export async function loginUser(input: { email: string; password: string }) {
  const data = await authApi.login(input);
  return mapUserDto(data.user);
}

export function logoutUser() {
  authApi.logout();
}

export async function updateUserName(name: string) {
  const user = await authApi.updateProfile(name);
  return mapUserDto(user);
}

export async function changeUserPassword(input: {
  currentPassword: string;
  newPassword: string;
}) {
  await authApi.changePassword({
    current_password: input.currentPassword,
    new_password: input.newPassword,
  });
}
