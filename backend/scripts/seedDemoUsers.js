import 'dotenv/config.js';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

// Creates (or resets) the three accounts the login page's "Try a demo
// account" quick-fill points at. Public signup can't produce these directly —
// role always defaults to 'author' there — so this is the only way to get a
// 'user' or 'admin' demo account into the database.
//
// Run against production via the Render dashboard's Shell tab (MONGO_URL is
// already loaded there): `node scripts/seedDemoUsers.js`

const DEMO_ACCOUNTS = [
  { username: 'demo_reader', email: 'user@devquora.test', password: 'user1234', name: 'Demo Reader', role: 'user' },
  { username: 'demo_author', email: 'author@devquora.test', password: 'author123', name: 'Demo Author', role: 'author' },
  { username: 'demo_admin', email: 'admin@devquora.test', password: 'admin123', name: 'Demo Admin', role: 'admin' },
];

const run = async () => {
  if (!process.env.MONGO_URL) {
    console.error('MONGO_URL is not defined in environment variables');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URL);
  console.log('Connected to', mongoose.connection.name);

  for (const acc of DEMO_ACCOUNTS) {
    const passwordHash = await bcrypt.hash(acc.password, 10);
    const result = await User.findOneAndUpdate(
      { email: acc.email },
      {
        username: acc.username,
        email: acc.email,
        passwordHash,
        name: acc.name,
        role: acc.role,
        status: 'active',
        isDemo: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`✔ ${acc.role.padEnd(6)} ${acc.email} (${result._id})`);
  }

  await mongoose.disconnect();
  console.log('Done.');
};

run().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
