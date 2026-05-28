import type { User } from './user.model';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface JwtTokenPayload {
  sub: number;
  email: string;
  role: 'USER' | 'ADMIN';
  exp?: number;
  iat?: number;
}
