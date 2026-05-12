import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.VITE_MONGODB_URI;
mongoose.connect(uri)
  .then(async () => {
    const db = mongoose.connection.db;
    const admin = await db.collection('users').findOne({ role: 'admin' });
    if (admin) {
      console.log('ADMIN_PHONE:' + admin.phone);
    } else {
      console.log('NO_ADMIN_FOUND');
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
