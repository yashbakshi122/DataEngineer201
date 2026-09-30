# Quick Start Guide

## 🚀 Get the App Running in 5 Minutes

### Step 1: Prerequisites
```bash
# Ensure you have Node.js 18+ installed
node --version

# Install dependencies
npm install
```

### Step 2: Configure Firebase
```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your Firebase credentials from Firebase Console:
# Firebase Console → Project Settings → General → Web app config
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Step 3: Deploy Backend (One-time)
```bash
# Deploy Firestore security rules
npm run deploy:rules

# Deploy Cloud Functions
npm run deploy:functions
```

### Step 4: Run Development Server
```bash
npm run dev
```

Visit `http://localhost:5173` ✅

---

## 🧪 Test the Full Workflow

### In Browser A (Organizer)
1. Register at `/register` as **Organizer**
2. Create an event at `/organizer/events/create`
3. Go to **Invite Management**
4. Add an invitee email (e.g., test@example.com)
5. Copy the RSVP URL generated

### In Browser B (Attendee)
1. Open the RSVP URL from Browser A
2. Select "Going" with 0 guests
3. Click Submit
4. Watch Browser A dashboard update **in real-time** ✨

---

## 🔑 Key URLs

| Page | URL | Purpose |
|------|-----|---------|
| Landing | `/` | Home page |
| Register | `/register` | Sign up |
| Login | `/login` | Sign in |
| Organizer Dashboard | `/organizer` | Main dashboard |
| Create Event | `/organizer/events/create` | Create new event |
| Invite Management | `/organizer/events/{id}` | Manage invites |
| Analytics | `/organizer/analytics/{id}` | View analytics |
| RSVP (Token-based) | `/rsvp?e={eventId}&t={token}` | Attendee RSVP |
| Check-In | `/checkin` | Staff check-in |
| Attendee Dashboard | `/attendee` | Attendee home |

---

## 📊 Real-Time Test

### Verify Live Updates Work:
1. Open **Browser A**: `/organizer` (organizer dashboard)
2. Open **Browser B**: `/rsvp?e={eventId}&t={token}` (RSVP page)
3. In Browser B: Select **Going** → Submit
4. **Result**: Browser A should show:
   - ✅ "Going" count increased
   - ✅ "Available Seats" decreased
   - ✅ Recent activity shows new RSVP
   - ✅ **All within 1-2 seconds, NO refresh needed**

---

## 🛠️ Troubleshooting

### Issue: "Missing Firebase configuration"
```
Solution: Ensure .env file exists and has all VITE_FIREBASE_* variables
```

### Issue: "Cannot create event"
```
Solution: Check that you're logged in as organizer, not attendee
```

### Issue: "RSVP submission fails"
```
Solution: Verify Cloud Functions are deployed:
  1. Go to Firebase Console → Cloud Functions
  2. Confirm submitRSVP function is deployed
  3. Check browser console for error details
```

### Issue: "Real-time updates not working"
```
Solution: 
  1. Verify Firestore rules are published
  2. Check browser DevTools → Network (should see WebSocket)
  3. Verify you're authenticated in both browsers
```

---

## 📚 Full Documentation

- **Setup & Architecture**: See `FIREBASE_SETUP.md`
- **Verification Checklist**: See `VERIFICATION_CHECKLIST.md`
- **Implementation Details**: See `IMPLEMENTATION_SUMMARY.md`

---

## 🚀 Deploy to Production

```bash
# Build for production
npm run build

# Deploy to Firebase Hosting (if using)
firebase deploy

# Or deploy to your own hosting
# (Vite builds to /dist folder)
```

---

## 💡 Tips

- **Add demo data**: Run `npm run seed` (if available)
- **Check Firestore**: Firebase Console → Firestore Database → see live data
- **Monitor functions**: Firebase Console → Cloud Functions → view logs
- **Debug auth**: Use `useAuth()` hook in any component

---

## ✅ Success Checklist

- [ ] `.env` file created with Firebase credentials
- [ ] `npm install` completed
- [ ] `npm run deploy:rules` succeeded
- [ ] `npm run deploy:functions` succeeded
- [ ] `npm run dev` started without errors
- [ ] App loads at `http://localhost:5173`
- [ ] Can register new user
- [ ] Can create event
- [ ] Can add invites
- [ ] Can submit RSVP
- [ ] Dashboard updates in real-time ✨

---

**Questions?** See `FIREBASE_SETUP.md` → Troubleshooting section

