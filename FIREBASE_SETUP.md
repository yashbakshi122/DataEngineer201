# Firebase Setup & Implementation Guide

## Overview

This application is now a **fully functional Firebase-powered event planning and RSVP tracking system**. All demo data has been removed and replaced with real Firebase Firestore backend, Cloud Functions, and real-time listeners.

---

## Firebase Services Used

### 1. **Firebase Authentication**
- Email/password registration and login
- User role assignment (organizer or attendee)
- User profile stored in Firestore `/users/{uid}` collection

### 2. **Cloud Firestore Database**
Primary collections and subcollections:

```
/users/{uid}
├── name: string
├── email: string
├── role: "organizer" | "attendee"
└── createdAt: timestamp

/events/{eventId}
├── title: string
├── description: string
├── eventType: string
├── startAt: timestamp
├── endAt: timestamp
├── venue: string
├── onlineLink?: string
├── capacity: number
├── rsvpDeadline: timestamp
├── bannerUrl: string
├── status: "draft" | "published" | "completed" | "cancelled"
├── organizerId: string
├── organizerName: string
├── createdAt: timestamp
└── updatedAt: timestamp

/events_invites/{eventId}/invites/{inviteId}
├── name: string
├── email: string
├── phone: string
├── role: string
├── company: string
├── token: string (cryptographically secure)
├── status: "pending" | "yes" | "maybe" | "no" | "waitlist" | "checked-in"
├── plusOnesAllowed: number
├── plusOnesCount: number
├── waitlistPosition?: number
└── createdAt: timestamp

/events_rsvps/{eventId}/rsvps/{inviteId}
├── eventId: string
├── inviteId: string
├── token: string
├── name: string
├── email: string
├── answer: "yes" | "maybe" | "no" | "waitlist"
├── guests: number
├── timestamp: timestamp
└── updatedAt: timestamp

/events_checkins/{eventId}/checks/{inviteId}
├── eventId: string
├── inviteId: string
├── attendeeName: string
├── attendeeEmail: string
├── method: "qr" | "manual"
└── timestamp: timestamp

/announcements/{announcementId}
├── eventId: string
├── eventTitle: string
├── title: string
├── message: string
├── createdAt: timestamp
└── authorName: string

/notifications/{notificationId}
├── userId: string
├── eventId: string
├── type: string
├── title: string
├── message: string
├── read: boolean
└── createdAt: timestamp
```

### 3. **Cloud Functions** (`functions/index.js`)

#### `submitRSVP(data, context)` - Callable Function
- **Purpose**: Submit or update RSVP with atomic transaction
- **Parameters**:
  - `eventId`: Event identifier
  - `token`: Unique invitation token
  - `answer`: "yes" | "maybe" | "no"
  - `guests`: Number of plus-ones (0+)
- **Logic**:
  - Validates event exists and not cancelled
  - Checks RSVP deadline
  - Verifies invitation token
  - Enforces capacity limits
  - Handles FIFO waitlist promotion
  - Prevents race conditions with Firestore transactions
- **Returns**: Success status, final answer, waitlist position, message

#### `createInvites(data, context)` - Callable Function
- **Purpose**: Generate secure tokens and batch-create invitations
- **Parameters**:
  - `eventId`: Event identifier
  - `invitees`: Array of { name, email, phone, role, company, plusOnesAllowed }
- **Returns**: Array of created invitation records with unique tokens

#### `createAnnouncement(data, context)` - Callable Function
- **Purpose**: Create event announcement
- **Parameters**:
  - `eventId`: Event identifier
  - `eventTitle`: Event name for context
  - `title`: Announcement title
  - `message`: Announcement message
- **Returns**: Created announcement ID

#### `checkin(data, context)` - Callable Function
- **Purpose**: Check in attendee by token, prevent duplicates
- **Parameters**:
  - `eventId`: Event identifier
  - `token`: Unique invitation token
  - `method`: "qr" | "manual"
- **Returns**: Success status, check-in timestamp, attendee info

### 4. **Firebase Storage**
- Stores event banner images (optional)
- Used for avatar uploads (future)

---

## Environment Configuration

### Required Environment Variables

Create a `.env` file in the project root with:

```env
# Firebase Web App Configuration
# Get these from: Firebase Console → Project Settings → General → Your apps → Web
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### How to Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Click **Project Settings** (gear icon)
4. Select **General** tab
5. Scroll to **Your apps** section
6. Click **Web** (</> icon) if not already created
7. Copy the `firebaseConfig` object values into `.env`

---

## Running the Application

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

Copy `.env.example` to `.env` and fill in real Firebase credentials:

```bash
cp .env.example .env
# Then edit .env with your Firebase project details
```

### 3. Deploy Cloud Functions (One-time setup)

```bash
npm run deploy:functions
```

Or manually from Firebase Console:

1. Go to **Cloud Functions**
2. Deploy functions from `functions/index.js`
3. Set runtime to **Node.js 18** or later

### 4. Deploy Firestore Security Rules (One-time setup)

```bash
npm run deploy:rules
```

Or manually:

1. Go to **Firestore Database** → **Rules** tab
2. Replace with content from `firestore.rules`
3. Click **Publish**

### 5. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 6. Build for Production

```bash
npm run build
npm run preview
```

---

## Authentication Flow

### Registration (Attendee or Organizer)

1. User visits `/register`
2. Enters: name, email, password, role
3. System:
   - Creates Firebase Auth account (`createUserWithEmailAndPassword`)
   - Stores user profile in `/users/{uid}`
   - Sets role as "organizer" or "attendee"
4. User redirected to dashboard

### Login

1. User visits `/login`
2. Enters: email, password
3. System:
   - Authenticates with Firebase (`signInWithEmailAndPassword`)
   - Fetches user role from `/users/{uid}`
   - Loads relevant dashboard
4. Session persists via Firebase Auth

### Logout

1. User clicks logout
2. System calls `signOut(auth)`
3. User redirected to landing page

---

## RSVP Workflow

### 1. Organizer Creates Event

1. Organizer clicks **Create Event**
2. Fills form: title, date/time, venue, capacity, RSVP deadline, etc.
3. System:
   - Stores event in `/events/{eventId}`
   - Sets status to "draft" or "published"

### 2. Organizer Invites Attendees

1. Organizer opens **Invite Management** for event
2. Adds invitees by:
   - Manual entry (name, email, phone, role, company, plus-ones)
   - CSV upload with headers (name, email, phone, etc.)
3. System:
   - Calls Cloud Function `createInvites()`
   - Generates cryptographically secure unique tokens
   - Creates records in `/events_invites/{eventId}/invites/{inviteId}`
   - Organizer can download/export CSV with RSVP URLs

### 3. Attendee Receives Invitation

1. Organizer sends URL to attendee: `https://app.example.com/rsvp?e={eventId}&t={token}`
2. Attendee clicks link
3. System:
   - Validates event exists
   - Validates token matches invitation
   - Displays event details and RSVP form

### 4. Attendee Submits RSVP

1. Attendee selects: Going / Maybe / Not Going
2. If Going: selects number of plus-ones (0 to allowed)
3. Clicks **Submit Response**
4. System:
   - Calls Cloud Function `submitRSVP()` with atomic transaction
   - Checks current capacity
   - If capacity full → adds to waitlist with position
   - If capacity available → confirms attendance
   - Updates `/events_rsvps/{eventId}/rsvps/{inviteId}`
   - Updates `/events_invites/{eventId}/invites/{inviteId}` status
   - Returns confirmation message

### 5. FIFO Waitlist Promotion

If someone cancels their RSVP:

1. Cloud Function detects RSVP changed from "yes" to "no"/"maybe"
2. Looks up waitlist (sorted by timestamp)
3. Promotes oldest waiting attendee to "yes"
4. Creates notification for promoted attendee
5. Attendee sees promotion message

### 6. Real-Time Dashboard Updates

- Organizer dashboard subscribes to `/events_rsvps/{eventId}/rsvps` via `onSnapshot()`
- When an attendee RSVPs, dashboard updates **sub-200ms** without page reload
- KPI counts update: Going / Maybe / Not Going / Waitlist
- Recent activity feed shows new RSVPs

---

## Check-In at Event

### 1. Staff Launches Check-In Desk

1. Staff visits `/checkin`
2. System loads check-in interface

### 2. Search & Validate Attendee

1. Staff enters token or attendee email
2. System calls `checkinService.findAttendee(eventId, token)`
3. System fetches invitation and displays:
   - Attendee name and email
   - RSVP status and plus-ones
   - Event details

### 3. Record Check-In

1. Staff clicks **Check In**
2. System calls Cloud Function `checkin()`
3. System:
   - Verifies invite exists
   - Checks if already checked in (prevents duplicates)
   - Creates record in `/events_checkins/{eventId}/checks/{inviteId}`
   - Updates invite status to "checked-in"
   - Returns success with timestamp

### 4. Display Confirmation

- Screen shows ✓ checked-in success
- Displays attendee name and time
- Resets for next attendee

---

## Analytics & Real-Time Metrics

### Organizer Dashboard

- **Real-time KPIs**: Total Events, Responses, Going, Maybe, Not Going, Waitlist, Available Seats
- Calculated from actual Firestore documents:
  - Total Events: Count of events with `organizerId == user.uid`
  - Going: Count of RSVP docs with `answer == "yes"`
  - Maybe: Count with `answer == "maybe"`
  - Not Going: Count with `answer == "no"`
  - Waitlist: Count with `answer == "waitlist"`
  - Available Seats: `capacity - (going + their guests)`

### Event Analytics Page

- RSVP breakdown pie chart (Going / Maybe / Not Going / Waitlist)
- Response rate: `(total responses / total invites) * 100%`
- Capacity utilization: `(going / capacity) * 100%`
- Response timeline (cumulative growth over days)
- All data sourced from real Firestore collections

---

## Security & Privacy

### Firestore Security Rules (`firestore.rules`)

**Principle**: Enforce security at database level, not frontend

- ✅ Users can only read their own profile
- ✅ Organizers can only manage their own events
- ✅ Public can read published events
- ✅ Anyone can read invitations (for token lookup)
- ✅ **RSVPs can ONLY be written by Cloud Function** (not client)
- ✅ Check-ins can ONLY be written by Cloud Function
- ✅ Users can only read/update their own notifications
- ✅ Notifications can only be created by Cloud Functions

### Invitation Tokens

- Generated using `crypto.getRandomValues()` (browser) or `crypto.randomBytes()` (Node.js)
- 32-character hex strings (128 bits entropy)
- Unique per invite, cannot be guessed
- Never shared with other users

### User Authentication

- Firebase Auth handles password hashing, session management
- Passwords must be 6+ characters (configurable)
- Sessions persist securely with Auth tokens

---

## Data Privacy & GDPR

### User Data Stored

- Name (required for display)
- Email (required for login and communication)
- Role (organizer/attendee)
- Creation timestamp

### Data Retention

- User accounts persist indefinitely until deleted
- RSVP records persist for event history/analytics
- Check-in records persist for audit trail
- Deletion: Users can request deletion (future feature)

### Data Access

- Users can only see their own profile
- Organizers can see invitee and RSVP data for their events
- Attendees cannot access others' RSVP data
- Public cannot access detailed attendee data

---

## Testing Persistence & Real-Time Updates

### Manual Testing Checklist

#### 1. User Registration & Login Persistence

- [ ] Register new user (organizer) at `/register`
- [ ] Confirm user record created in Firestore `/users/{uid}`
- [ ] Logout
- [ ] Login with same credentials
- [ ] Verify user data loads correctly
- [ ] Refresh page - user still authenticated

#### 2. Event Creation & Persistence

- [ ] Create new event as organizer
- [ ] Confirm event persists in `/events/{eventId}`
- [ ] Close app and reopen
- [ ] Event still appears in organizer's event list
- [ ] Refresh page - event still visible

#### 3. Invite Creation & Token Generation

- [ ] Add invitees to event
- [ ] Confirm invites created in `/events_invites/{eventId}/invites/`
- [ ] Each invite has unique token (copy URL from table)
- [ ] Each invite has different token (not hardcoded)

#### 4. RSVP Submission (Single Browser)

- [ ] Open event RSVP link in browser: `/rsvp?e={eventId}&t={token}`
- [ ] Select "Going" with 0 guests
- [ ] Click Submit
- [ ] Confirm success message
- [ ] Check organizer dashboard - "Going" count increased
- [ ] Refresh RSVP page - status still shows "Going"
- [ ] Change RSVP to "Maybe"
- [ ] Confirm status updated in Firestore

#### 5. Real-Time Updates (Two Browsers)

- [ ] Open organizer dashboard in **Browser A**
- [ ] Open RSVP link in **Browser B** (different incognito window)
- [ ] Note initial Going count in Browser A
- [ ] In Browser B: Select "Going" and submit
- [ ] **Verify Browser A dashboard updates automatically** (within 1-2 seconds)
- [ ] Going count increased WITHOUT page refresh
- [ ] In Browser B: Change to "Maybe"
- [ ] **Verify Browser A updates again** (Going -1, Maybe +1)

#### 6. Capacity Control

- [ ] Create event with capacity = 2
- [ ] Create 3 invites
- [ ] In Browser A: Open RSVP 1 with token, select Going → Submit
- [ ] In Browser B: Open RSVP 2 with token, select Going → Submit
- [ ] In Browser C: Open RSVP 3 with token, select Going → Submit
- [ ] RSVP 3 should get waitlist message (position #1)
- [ ] Check Firestore: RSVP 3 has `answer: "waitlist"`
- [ ] In Browser A: Change RSVP to "No"
- [ ] Wait 1-2 seconds, in Browser C: Refresh RSVP page
- [ ] RSVP 3 should now show "Going" (promoted from waitlist)

#### 7. Check-In

- [ ] Navigate to `/checkin`
- [ ] Enter token from an attendee RSVP
- [ ] Attendee info loads correctly
- [ ] Click "Check In"
- [ ] Confirm success message with timestamp
- [ ] Try to check in same token again
- [ ] Should show "Already checked in" message
- [ ] Check Firestore: Record in `/events_checkins/{eventId}/checks/`

#### 8. Analytics

- [ ] Create event with 5 invites
- [ ] Get 2 "Going", 1 "Maybe", 1 "Not Going", 1 "Waitlist"
- [ ] Open `/organizer/analytics/{eventId}`
- [ ] Verify metrics calculated correctly:
  - Total Invited: 5
  - Going: 2
  - Maybe: 1
  - Not Going: 1
  - Waitlist: 1
  - Response Rate: 80%

#### 9. Announcements

- [ ] Create announcement for event
- [ ] Open event analytics or attendee dashboard
- [ ] Confirm announcement appears
- [ ] Update announcement
- [ ] Refresh page - announcement shows updated text

#### 10. Firebase Rules Enforcement

- [ ] Try to directly write to `/events_rsvps` via browser console:
  ```javascript
  // Should FAIL with permission denied
  await db.collection('events_rsvps').doc('test').set({ answer: 'yes' })
  ```
- [ ] Try to read someone else's `/users/{otherId}`:
  ```javascript
  // Should succeed (organizers are public)
  // Or fail if attendee (private)
  ```
- [ ] Verify Cloud Functions still work (check RSVP still processes)

---

## Troubleshooting

### Issue: "Missing Firebase Configuration"
**Solution**: Ensure `.env` file exists with all `VITE_FIREBASE_*` variables populated

### Issue: "Auth not initialized"
**Solution**: Check that `src/firebase/config.ts` is loading credentials correctly. Reload browser.

### Issue: "RSVP submission fails"
**Solution**: 
1. Verify Cloud Function is deployed (`firebase deploy --only functions`)
2. Check browser console for error details
3. Check Firebase Console → Cloud Functions for error logs

### Issue: "Real-time updates not working"
**Solution**:
1. Check Firestore security rules are published
2. Verify `onSnapshot()` listeners are active (check browser DevTools → Network)
3. Check browser doesn't have ad blocker blocking WebSocket connections
4. Verify user is authenticated

### Issue: "Capacity enforcement not working"
**Solution**:
1. Verify Cloud Function `submitRSVP` is deployed and working
2. Check that frontend is calling Cloud Function, not writing directly to Firestore
3. Review `firestore.rules` - RSVPs should have `allow write: if false`

### Issue: "Waitlist promotion not happening"
**Solution**:
1. Verify waitlist queue logic in Cloud Function
2. Check that old RSVP was actually updated (not deleted/recreated)
3. Review Firestore transaction logs

---

## Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm run test            # Run tests (if configured)
npm run lint            # Run linter

# Firebase Deployment
npm run deploy          # Deploy everything (auth, rules, functions)
npm run deploy:rules    # Deploy Firestore security rules only
npm run deploy:functions # Deploy Cloud Functions only

# Database
npm run firestore:emulator  # Run Firestore emulator locally (for testing)
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend (Vite)                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │  Auth Pages     │  │  Organizer Dash  │  │ RSVP Page  │ │
│  │ (Register/Login)│  │ (Create/Analytics)  │ (Token-based)│ │
│  └────────┬────────┘  └────────┬─────────┘  └─────┬──────┘ │
│           │                    │                   │         │
│           └────────────────────┼───────────────────┘         │
│                                │                             │
│                         Firestore SDK                         │
│              (onSnapshot listeners for real-time)            │
│                                │                             │
└────────────────────────────────┼─────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
        ┌───────▼────────┐         ┌───────────▼────────┐
        │  Firebase Auth │         │ Cloud Firestore DB │
        │                │         │                    │
        │ - Register     │         │ /users/{uid}       │
        │ - Login        │         │ /events/{id}       │
        │ - Logout       │         │ /events_invites    │
        │ - Session      │         │ /events_rsvps      │
        │   Management   │         │ /events_checkins   │
        │                │         │ /announcements     │
        └────────────────┘         │ /notifications     │
                                   │ (Real-time via     │
                                   │  onSnapshot)       │
                                   └────────────────────┘
                                            │
                         ┌──────────────────┼──────────────────┐
                         │                  │                  │
                    ┌────▼────┐        ┌────▼────┐      ┌─────▼──────┐
                    │ Cloud   │        │ Cloud   │      │   Firebase │
                    │Functions│        │ Storage │      │  Hosting   │
                    │          │        │ (Banners)      │  (Frontend)│
                    │submitRSVP│        │                │            │
                    │createInvs│        └────────────────┴─────────────┘
                    │checkin   │
                    │announce..│
                    └──────────┘
```

---

## Next Steps & Future Enhancements

1. **Email Notifications**: Send RSVP confirmation/waitlist emails via SendGrid/Firebase Email
2. **Analytics Export**: Download event analytics as PDF/CSV
3. **Multi-language**: Support multiple languages
4. **SMS Reminders**: Send SMS reminders before event
5. **Payment Integration**: Charge for tickets (Stripe/Square)
6. **Social Share**: Share events on social media
7. **QR Scanner**: Native QR code scanner app for check-in
8. **Two-Factor Auth**: Enhanced security with 2FA
9. **Custom Branding**: Organizers customize event pages with logos/colors
10. **API**: Public API for integrations

---

## Support & Contact

For issues, questions, or contributions:

1. **GitHub Issues**: Create an issue in the repository
2. **Firebase Console**: Check Cloud Function logs and Firestore metrics
3. **Browser DevTools**: Check network requests and console errors
4. **Firebase Documentation**: https://firebase.google.com/docs

---

## License

This project is provided as-is for educational and evaluation purposes.

---

**Last Updated**: September 27, 2026
**Application Version**: 1.0 (Production-Ready)
**Firebase SDK**: v9.x (Modular)
**Node.js Runtime**: 18.x (Cloud Functions)

