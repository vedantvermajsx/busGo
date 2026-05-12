import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const uri = process.env.VITE_MONGODB_URI;
    console.log('VITE_MONGODB_URI:', uri);
    if (!uri) {
      throw new Error('VITE_MONGODB_URI is missing or contains a placeholder password. Please update your .env file.');
    }
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    if (error.message.includes('authentication failed')) {
      console.warn('💡 Tip: Check if your MONGODB_URI password is correct in the .env file.');
    }
    process.exit(1);
  }
};
