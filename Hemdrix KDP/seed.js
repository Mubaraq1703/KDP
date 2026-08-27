require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Book = require('./models/Book');

async function seed() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('[Seed Error] MONGO_URI is not set in .env');
    process.exit(1);
  }

  console.log('[Seed] Connecting to MongoDB Atlas...');
  try {
    await mongoose.connect(uri);
    console.log('[Seed] Connected successfully to:', mongoose.connection.name);

    // Clear existing data to leave only fresh admin
    console.log('[Seed] Resetting database collections...');
    await User.deleteMany({});
    await Book.deleteMany({});

    // Create Admin User
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@12345';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const admin = await User.create({
      name: 'System Admin',
      username: 'admin',
      email: 'admin@bookflow.app',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    });

    console.log('\n============================================================');
    console.log('✅ MongoDB Atlas seeded successfully with ADMIN data only!');
    console.log('============================================================');
    console.log('Admin Details:');
    console.log('  • Name:     ', admin.name);
    console.log('  • Username: ', admin.username);
    console.log('  • Email:    ', admin.email);
    console.log('  • Password: ', adminPassword);
    console.log('  • Role:     ', admin.role);
    console.log('============================================================\n');

    await mongoose.disconnect();
    console.log('[Seed] Disconnected from MongoDB Atlas.');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]', err.message);
    process.exit(1);
  }
}

seed();
