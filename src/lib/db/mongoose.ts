import mongoose from "mongoose";
import { getEnv } from "@/env";

/**
 * Cached Mongoose connection.
 *
 * Next.js (especially in dev with hot reload) re-evaluates modules frequently,
 * which would otherwise open a new connection on every request. We stash the
 * connection promise on `globalThis` so it survives reloads.
 */
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as {
  _mongooseCache?: MongooseCache;
};

const cache: MongooseCache =
  globalForMongoose._mongooseCache ?? { conn: null, promise: null };
globalForMongoose._mongooseCache = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    const env = getEnv();
    mongoose.set("strictQuery", true);
    cache.promise = mongoose.connect(env.MONGO_URI, {
      dbName: env.MONGO_DB_NAME,
      // Fail fast if the server is unreachable rather than hanging requests.
      serverSelectionTimeoutMS: 8000,
    });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
