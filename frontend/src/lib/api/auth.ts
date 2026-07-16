import { apiRequest, setAccessToken } from './client';

export type UserDto = {
  code: string;
  name: string;
  email: string;
};

export type TokenDto = {
  access_token: string;
  token_type: string;
  user: UserDto;
};

export async function register(input: {
  name: string;
  email: string;
  password: string;
}) {
  const data = await apiRequest<TokenDto>('/auth/register', {
    method: 'POST',
    body: {
      name: input.name,
      email: input.email,
      password: input.password,
    },
    auth: false,
  });

  setAccessToken(data.access_token);
  return data;
}

export async function login(input: { email: string; password: string }) {
  const data = await apiRequest<TokenDto>('/auth/login', {
    method: 'POST',
    body: input,
    auth: false,
  });

  setAccessToken(data.access_token);
  return data;
}

export async function fetchMe() {
  return apiRequest<UserDto>('/auth/me', { auth: true });
}

export async function updateProfile(name: string) {
  return apiRequest<UserDto>('/auth/profile', {
    method: 'PATCH',
    body: { name },
  });
}

export async function changePassword(input: {
  current_password: string;
  new_password: string;
}) {
  await apiRequest<null>('/auth/password', {
    method: 'PATCH',
    body: input,
  });
}

export function logout() {
  setAccessToken(null);
}
