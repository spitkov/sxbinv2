import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
export async function GET(req: NextRequest) {
  try {
    const { authenticated, user } = getCurrentUser(req);
    if (!authenticated || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const stmt = db.prepare('SELECT apiKey FROM users WHERE id = ?');
    const result = stmt.get(user.id) as { apiKey: string | null };
    if (!result?.apiKey) {
      const apiKey = `sk_${nanoid(32)}`;
      const updateStmt = db.prepare('UPDATE users SET apiKey = ? WHERE id = ?');
      updateStmt.run(apiKey, user.id);
      return NextResponse.json({ apiKey });
    }
    return NextResponse.json({ apiKey: result.apiKey });
  } catch (error) {
    console.error('Error getting API key:', error);
    return NextResponse.json(
      { error: 'Failed to get API key' },
      { status: 500 }
    );
  }
}
export async function POST(req: NextRequest) {
  try {
    const { authenticated, user } = getCurrentUser(req);
    if (!authenticated || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const apiKey = `sk_${nanoid(32)}`;
    const stmt = db.prepare('UPDATE users SET apiKey = ? WHERE id = ?');
    stmt.run(apiKey, user.id);
    return NextResponse.json({ apiKey });
  } catch (error) {
    console.error('Error resetting API key:', error);
    return NextResponse.json(
      { error: 'Failed to reset API key' },
      { status: 500 }
    );
  }
} 