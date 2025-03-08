import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentials } from '@/lib/db';
import { generateToken, setAuthCookie } from '@/lib/auth';
export async function POST(request: NextRequest) {
  try {
    const { usernameOrEmail, password } = await request.json();
    if (!usernameOrEmail || !password) {
      return NextResponse.json(
        { error: 'Username/email and password are required' },
        { status: 400 }
      );
    }
    const user = await verifyCredentials(usernameOrEmail, password);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    const token = generateToken(user);
    const response = NextResponse.json({
      success: true,
      user
    });
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
} 