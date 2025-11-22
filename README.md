# MedSync

**A resilient, real-time medication accountability system designed to prevent missed doses through explicit confirmation and proactive caregiver intervention.**

## Overview

MedSync transforms standard medication reminders into a critical safety net for patients and caregivers. Unlike simple notification apps that can be dismissed or ignored, MedSync enforces medication adherence through a robust accountability framework with a strict 2-hour intervention window.

### The Problem We Solve

Traditional medication reminder apps fail when:
- Notifications are dismissed without taking medication
- Users forget after snoozing
- No one knows a dose was missed until it's too late

### Our Solution

MedSync ensures accountability by:
- **Requiring explicit confirmation** for every dose
- **Implementing a 5-minute snooze cycle** with automatic re-notification
- **Enforcing a 2-hour accountability window** that triggers caregiver alerts
- **Preventing silent failures** through automated intervention protocols

---

## Core Features

### 1. Three-Status Dose Tracking
- **Pending**: Scheduled but not yet due
- **Due**: Active notification requiring immediate response
- **Snoozed**: Acknowledged with 5-minute countdown
- **Taken**: Confirmed with timestamp
- **Missed**: Unconfirmed after 2 hours → triggers caregiver alert

### 2. Explicit Confirmation System
When a dose is due, patients must respond with one of two actions:
- **"Yes (Taken)"** - Confirms medication was taken
- **"Not Yet (Snooze 5m)"** - Snoozes for exactly 5 minutes with automatic re-notification

### 3. 2-Hour Accountability Window
The core safety feature:
- If a dose remains unconfirmed for 2 hours past scheduled time
- System automatically flags the dose as **MISSED**
- Triggers immediate email alerts to all configured caregivers
- Prompts human intervention when digital system detects failure

### 4. Real-Time Monitoring
- Live clock with second-by-second updates
- Countdown timers for snoozed doses
- Time-since-due displays for overdue medications
- Animated visual alerts for critical statuses

### 5. Caregiver Network
- Add multiple accountability contacts
- Email-based alert system (Cloud Function ready)
- Immediate notification on missed doses
- Clear intervention instructions

### 6. Multi-Medication Support
- Unlimited medications with custom schedules
- Multiple daily doses per medication
- Individual tracking for each dose
- Persistent storage across sessions

---

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Modern web browser with notification support

### Installation

1. **Create the React app**
   ```bash
   npx create-react-app medsync
   cd medsync
   ```

2. **Install dependencies**
   ```bash
   npm install lucide-react
   ```

3. **Replace App.js**
   - Navigate to `src/App.js`
   - Replace the entire contents with the MedSync component code

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   - Navigate to `http://localhost:3000`
   - Enable browser notifications when prompted

---

## Usage Guide

### Initial Setup

1. **Enable Notifications**
   - Click "Enable Alerts" in the top-right corner
   - Grant browser notification permissions
   - This is required for dose reminders

2. **Add Accountability Contacts**
   - Click the Settings icon
   - Enter caregiver name and email
   - Click "Add" to save
   - Add multiple contacts for redundancy

3. **Add Your First Medication**
   - Click "Add New Medication"
   - Enter medication name (e.g., "Metformin")
   - Enter dosage (e.g., "500mg")
   - Add dose times (e.g., "08:00", "20:00")
   - Click "Add Medication"

### Daily Operation

**When a Dose is Due:**
1. Receive browser notification
2. Open MedSync
3. Respond immediately:
   - **"Yes (Taken)"** if you've taken the medication
   - **"Not Yet (5m)"** if you need a reminder in 5 minutes

**If You Snooze:**
- You'll receive a new notification after 5 minutes
- Must respond again with confirmation or another snooze
- Can snooze multiple times within the 2-hour window

**Critical: The 2-Hour Rule**
- If you don't confirm within 2 hours of scheduled time
- Dose is automatically marked as **MISSED**
- All caregivers receive immediate email alerts
- Expect a check-in call from your accountability network

---

## Architecture

### Frontend
- **React 18+** with functional components and hooks
- **Lucide React** for medical-grade iconography
- **Tailwind CSS** utility classes for responsive design
- **Browser Notification API** for push alerts
- **Persistent Storage API** for data retention

### Data Flow
1. **Scheduled Check** (every second)
   - Compare current time to scheduled dose times
   - Update dose status based on rules
   - Trigger notifications for due/snoozed doses

2. **User Interaction**
   - Confirmation updates dose status to "taken"
   - Snooze creates 5-minute timer with new notification
   - All changes persist to storage immediately

3. **Accountability Trigger**
   - 2-hour timer expires without confirmation
   - Dose flagged as MISSED
   - Cloud Function called to email caregivers
   - Alert logged to console (development mode)

### Storage Schema
```javascript
// Medications
{
  id: string,
  name: string,
  dosage: string,
  schedule: [
    {
      time: "HH:MM",
      status: "pending" | "due" | "snoozed" | "taken" | "missed",
      snoozeUntil: ISO8601 timestamp,
      confirmedAt: ISO8601 timestamp
    }
  ]
}

// Caregivers
{
  id: string,
  name: string,
  email: string
}
```

---

## Production Deployment

### Backend Integration

The app includes placeholder code for Cloud Function integration. To enable caregiver email alerts:

1. **Create a Cloud Function endpoint** (Firebase, AWS Lambda, etc.)
   ```javascript
   // Example: /api/alert-caregivers
   // POST request with:
   {
     medication: { name, dosage },
     dose: { time, status },
     caregivers: [{ name, email }]
   }
   ```

2. **Uncomment the API call** in `alertCaregivers` function (line ~129):
   ```javascript
   await fetch('/api/alert-caregivers', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ medication: med, dose, caregivers })
   });
   ```

3. **Implement email service** (SendGrid, AWS SES, etc.)
   ```
   Subject: MISSED DOSE ALERT: [Patient Name]
   Body: [Medication Name] ([Dosage]) scheduled for [Time] was not confirmed.
         Please call [Patient Name] immediately to check in.
   ```

### Environment Variables
```env
REACT_APP_API_URL=your-api-endpoint
REACT_APP_PATIENT_NAME=Patient Full Name
```

### Build for Production
```bash
npm run build
```

Deploy the `build/` folder to:
- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy --prod`
- **Firebase Hosting**: `firebase deploy`

---

## Security & Privacy

- All data stored locally in browser storage
- No sensitive medical data transmitted to servers (current implementation)
- Caregiver alerts contain minimal PHI (medication name only)
- HIPAA compliance considerations for production deployment
- Recommend end-to-end encryption for email alerts

---

## Customization

### Adjusting Time Windows

**Change snooze duration** (default: 5 minutes):
```javascript
const snoozeUntil = new Date(currentTime.getTime() + 5 * 60000);
// Change to 10 minutes: 10 * 60000
```

**Change accountability window** (default: 2 hours):
```javascript
if (timeDiff >= 120 && (dose.status === 'due' || dose.status === 'snoozed'))
// Change to 3 hours: timeDiff >= 180
```

### Styling
All styles use Tailwind CSS utility classes. Modify colors in component classes:
- Primary: `bg-indigo-600` → `bg-blue-600`
- Success: `bg-green-600` → `bg-emerald-600`
- Warning: `bg-yellow-500` → `bg-amber-500`
- Danger: `bg-red-600` → `bg-rose-600`

---

## Testing Workflow

### Manual Testing
1. Set a dose time 1 minute in the future
2. Wait for notification
3. Test "Yes (Taken)" confirmation
4. Add another dose 1 minute out
5. Test "Not Yet (5m)" snooze
6. Verify re-notification after 5 minutes
7. Set dose time 2+ hours in the past
8. Verify automatic MISSED status
9. Check console for caregiver alert log

### Browser Compatibility
Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Contributing

This is a critical health application. Contributions should prioritize:
1. **Reliability** over features
2. **Clarity** over cleverness
3. **Safety** over performance
4. **Accessibility** over aesthetics

---

## License

License - St. Clair Student Project so its free

---

## Medical Disclaimer

MedSync is a medication reminder and accountability tool. It is **NOT**:
- A substitute for professional medical advice
- Approved as a medical device
- Guaranteed to prevent missed doses

Always consult healthcare providers for medical decisions. Users assume all responsibility for medication adherence.

---

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

**Remember: This system works best when caregivers respond promptly to alerts. Ensure your accountability network is briefed on their critical role in the intervention protocol.**

---

Built with love for medication safety and patient accountability.