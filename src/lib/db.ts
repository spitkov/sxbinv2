import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const db = new Database(path.join(dataDir, 'sxbin.db'));
const filesTableInfo = db.prepare("PRAGMA table_info(files)").all();
const usersTableInfo = db.prepare("PRAGMA table_info(users)").all();
const userIdExists = filesTableInfo.some((column: any) => column.name === 'userId');
const apiKeyExists = usersTableInfo.some((column: any) => column.name === 'apiKey');
if (!userIdExists && filesTableInfo.length > 0) {
  console.log('Adding userId column to files table');
  db.exec('ALTER TABLE files ADD COLUMN userId TEXT');
}
if (!apiKeyExists && usersTableInfo.length > 0) {
  console.log('Adding apiKey column to users table');
  db.exec('ALTER TABLE users ADD COLUMN apiKey TEXT');
}
db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    shortId TEXT UNIQUE NOT NULL,
    fileName TEXT NOT NULL,
    fileSize INTEGER NOT NULL,
    contentType TEXT NOT NULL,
    s3Key TEXT NOT NULL,
    passwordHash TEXT,
    uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    expiresAt DATETIME NOT NULL,
    publicUrl TEXT NOT NULL,
    userId TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    apiKey TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
export function generateShortId(fileName: string = ''): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const length = 4;
  let shortId = '';
  let fullShortId = '';
  const fileExtension = fileName ? fileName.split('.').pop() : '';
  const extensionSuffix = fileExtension ? `.${fileExtension}` : '';
  do {
    shortId = '';
    for (let i = 0; i < length; i++) {
      shortId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    fullShortId = shortId + extensionSuffix;
  } while (getFileByShortId(fullShortId));
  return fullShortId;
}
export function createFileRecord({
  fileId,
  shortId,
  fileName,
  fileSize,
  contentType,
  s3Key,
  passwordHash,
  expiresAt,
  publicUrl,
  userId
}: {
  fileId: string;
  shortId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  s3Key: string;
  passwordHash?: string;
  expiresAt: Date;
  publicUrl: string;
  userId?: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO files (id, shortId, fileName, fileSize, contentType, s3Key, passwordHash, expiresAt, publicUrl, userId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    fileId,
    shortId,
    fileName,
    fileSize,
    contentType,
    s3Key,
    passwordHash || null,
    expiresAt.toISOString(),
    publicUrl,
    userId || null
  );
  return getFileById(fileId);
}
export function getFileById(id: string) {
  const stmt = db.prepare('SELECT * FROM files WHERE id = ?');
  return stmt.get(id) as FileRecord | undefined;
}
export function getFileByShortId(shortId: string) {
  const stmt = db.prepare(`
    SELECT 
      files.*,
      users.username as uploaderUsername
    FROM files 
    LEFT JOIN users ON files.userId = users.id 
    WHERE files.shortId = ?
  `);
  return stmt.get(shortId) as (FileRecord & { uploaderUsername: string | null }) | undefined;
}
export function checkFilePassword(fileId: string, passwordHash: string): boolean {
  const stmt = db.prepare('SELECT * FROM files WHERE id = ? AND passwordHash = ?');
  const result = stmt.get(fileId, passwordHash);
  return !!result;
}
export function deleteExpiredFiles() {
  const stmt = db.prepare("DELETE FROM files WHERE expiresAt < datetime('now')");
  return stmt.run();
}
export function getFilesByUserId(userId: string) {
  const stmt = db.prepare('SELECT * FROM files WHERE userId = ? ORDER BY uploadedAt DESC');
  return stmt.all(userId) as FileRecord[];
}
export async function createUser({
  username,
  email,
  password
}: {
  username: string;
  email: string;
  password: string;
}): Promise<UserRecord | { error: string }> {
  try {
    const existingUsername = getUserByUsername(username);
    if (existingUsername) {
      return { error: 'Username already taken' };
    }
    const existingEmail = getUserByEmail(email);
    if (existingEmail) {
      return { error: 'Email already registered' };
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const id = nanoid();
    const stmt = db.prepare(`
      INSERT INTO users (id, username, email, passwordHash)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, username, email, passwordHash);
    const user = getUserById(id);
    if (!user) {
      return { error: 'Failed to create user' };
    }
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword as UserRecord;
  } catch (error) {
    console.error('Error creating user:', error);
    return { error: 'Failed to create user' };
  }
}
export function getUserById(id: string): UserRecord | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) as UserRecord | undefined;
}
export function getUserByUsername(username: string): UserRecord | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  return stmt.get(username) as UserRecord | undefined;
}
export function getUserByEmail(email: string): UserRecord | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email) as UserRecord | undefined;
}
export function getUserByApiKey(apiKey: string): UserRecord | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE apiKey = ?');
  return stmt.get(apiKey) as UserRecord | undefined;
}
export async function verifyCredentials(
  usernameOrEmail: string,
  password: string
): Promise<UserRecord | null> {
  const isEmail = usernameOrEmail.includes('@');
  const user = isEmail
    ? getUserByEmail(usernameOrEmail)
    : getUserByUsername(usernameOrEmail);
  if (!user || !user.passwordHash) {
    return null;
  }
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return null;
  }
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword as UserRecord;
}
process.on('exit', () => {
  db.close();
});
export interface FileRecord {
  id: string;
  shortId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  s3Key: string;
  passwordHash: string | null;
  uploadedAt: string;
  expiresAt: string;
  publicUrl: string;
  userId: string | null;
  uploaderUsername?: string | null;
}
export interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash?: string;
  apiKey?: string;
  createdAt: string;
}
export default db;