import { MongoClient } from 'mongodb';
import path from 'path';
import fs from 'fs';

function getDbInfo(): { mongoUri: string; dbName: string } {
  const dbInfoPath = path.join(__dirname, '../.test-db-info.json');
  return JSON.parse(fs.readFileSync(dbInfoPath, 'utf-8'));
}

export async function getPasswordResetToken(email: string): Promise<string | null> {
  const { mongoUri, dbName } = getDbInfo();
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const user = await client.db(dbName).collection('users').findOne({ email: email.toLowerCase() });
    return user?.password_reset_token ?? null;
  } finally {
    await client.close();
  }
}

export async function getOrgInviteToken(email: string): Promise<string | null> {
  const { mongoUri, dbName } = getDbInfo();
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const invite = await client.db(dbName).collection('org_invitations').findOne({ email: email.toLowerCase() });
    return invite?.token ?? null;
  } finally {
    await client.close();
  }
}
