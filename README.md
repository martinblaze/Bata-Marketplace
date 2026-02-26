# 🚀 TRADEZY MARKETPLACE - Setup Guide

## 📦 INSTALLATION STEPS

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database (PostgreSQL)
```bash
# Install PostgreSQL on your system first
# Then create database:
createdb tradezy_db

# Run migrations:
npx prisma migrate dev
npx prisma generate
```

### 3. Environment Variables
Create `.env.local` file:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/tradezy_db"

# JWT Secret (generate random string)
JWT_SECRET="your-super-secret-key-change-this"

# Twilio (for SMS OTP)
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"
TWILIO_PHONE_NUMBER="+1234567890"

# Email (using Gmail)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"

# Stripe (Payment)
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLIC_KEY="pk_test_..."

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Run Development Server
```bash
npm run dev
```

Visit: http://localhost:3000

## 🎨 FEATURES INCLUDED

✅ Authentication (Phone/Email OTP)
✅ User Profiles (Buyer/Seller)
✅ Product Upload System
✅ Marketplace Feed
✅ Search & Filter
✅ Light/Dark Mode
✅ Responsive Design
✅ Database Schema Ready
✅ Payment Integration Setup

## 📁 PROJECT STRUCTURE

```
tradezy-marketplace/
├── app/                    # Next.js App Directory
│   ├── api/               # API Routes
│   ├── (auth)/           # Authentication pages
│   ├── (marketplace)/    # Marketplace pages
│   └── layout.tsx        # Root layout
├── components/           # React Components
├── lib/                 # Utilities & Helpers
├── prisma/              # Database Schema
├── public/              # Static Assets
└── styles/              # Global Styles
```

## 🔥 QUICK START CHECKLIST

- [ ] Run `npm install`
- [ ] Setup PostgreSQL database
- [ ] Create `.env.local` file
- [ ] Run `npx prisma migrate dev`
- [ ] Run `npm run dev`
- [ ] Open http://localhost:3000

## 🚀 DEPLOYMENT

Deploy to Vercel (Free):
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## 📞 NEXT STEPS

After setup, you can:
1. Customize colors in `tailwind.config.ts`
2. Add more features from the original spec
3. Setup Twilio/Stripe accounts
4. Deploy to production

---

Built with ❤️ for UNIZIK Campus
