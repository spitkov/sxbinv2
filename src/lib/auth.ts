import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getUserById, UserRecord } from './db';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const TOKEN_EXPIRY = '7d';
const COOKIE_NAME = 'auth_token';
export function generateToken(user: Omit<UserRecord, 'passwordHash'>): string {
  return jwt.sign(
    { 
      id: user.id,
      username: user.username,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}
export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60
  });
}
export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0
  });
}
export function verifyToken(token: string): { 
  valid: boolean; 
  user?: Omit<UserRecord, 'passwordHash'>;
  error?: string;
} {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as Omit<UserRecord, 'passwordHash'>;
    return { valid: true, user: decoded };
  } catch (error) {
    return { valid: false, error: 'Invalid token' };
  }
}
export function getCurrentUser(request: NextRequest): { 
  authenticated: boolean; 
  user?: Omit<UserRecord, 'passwordHash'>;
} {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return { authenticated: false };
  }
  const { valid, user, error } = verifyToken(token);
  if (!valid || !user) {
    return { authenticated: false };
  }
  return { authenticated: true, user };
}
export async function getServerUser(): Promise<{ 
  authenticated: boolean; 
  user?: Omit<UserRecord, 'passwordHash'>;
}> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return { authenticated: false };
  }
  const { valid, user, error } = verifyToken(token);
  if (!valid || !user) {
    return { authenticated: false };
  }
  const dbUser = getUserById(user.id);
  if (!dbUser) {
    return { authenticated: false };
  }
  const { passwordHash, ...userWithoutPassword } = dbUser;
  return { authenticated: true, user: userWithoutPassword };
}
export function withAuth(
  handler: (
    req: NextRequest, 
    user: Omit<UserRecord, 'passwordHash'>
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const { authenticated, user } = getCurrentUser(req);
    if (!authenticated || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return handler(req, user);
  };
} 