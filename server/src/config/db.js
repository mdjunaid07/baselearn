import mongoose from "mongoose";

let connected = false;

export function isMongoConnected() {
  return connected;
}

/** Attempts a MongoDB Atlas connection if MONGODB_URI is set. Never throws — falls
 *  back to in-memory mode on any failure so a bad connection string can't take the
 *  whole demo down. */
export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("No MONGODB_URI set — running in in-memory demo mode (data resets on restart).");
    return false;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    connected = true;
    console.log("Connected to MongoDB Atlas.");
    return true;
  } catch (err) {
    console.warn(`MongoDB connection failed (${err.message}) — falling back to in-memory demo mode.`);
    connected = false;
    return false;
  }
}
