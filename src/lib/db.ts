import { MongoClient } from "mongodb";

const globalWithMongo = globalThis as typeof globalThis & { _mongoClientPromise?: Promise<MongoClient> };
export async function database() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Please add MONGODB_URI to your environment variables.");
  if (/<[^>]+>/.test(uri)) throw new Error("MONGODB_URI still contains template placeholders. Replace them with the connection details from MongoDB Atlas.");
  const clientPromise = globalWithMongo._mongoClientPromise ?? new MongoClient(uri).connect();
  if (process.env.NODE_ENV !== "production") globalWithMongo._mongoClientPromise = clientPromise;
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB || "winter_arc");
}
