// createAdmin.js — Run this script once to create the admin account
// Usage: /opt/homebrew/bin/node createAdmin.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const ADMIN = {
  name: 'Admin',
  email: 'admin@artverse.com',
  password: 'admin123',
  role: 'admin'
};

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    // Check if admin already exists
    const existing = await User.findOne({ email: ADMIN.email });
    if (existing) {
      console.log('⚠️  Admin already exists:', existing.email);
      process.exit(0);
    }

    const admin = await User.create(ADMIN);
    console.log('🎉 Admin account created!');
    console.log('───────────────────────────');
    console.log('  Email   :', ADMIN.email);
    console.log('  Password:', ADMIN.password);
    console.log('  Role    :', admin.role);
    console.log('───────────────────────────');
    console.log('Login at: http://localhost:5500/login');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createAdmin();
