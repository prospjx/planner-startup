## Student Planner Calendar Buddy

Stress-aware AI planning app for students. Next.js App Router project with Google-style sign-in placeholder, weekly planner UI, AI scheduling stubs, and API endpoints for upload/scheduling.

### Structure
- `src/app/page.tsx` — landing page with CTAs.
- `src/app/login/page.tsx` — Google sign-in placeholder UI.
- `src/app/dashboard/page.tsx` — weekly planner demo (tasks, approvals, analytics).
- `src/app/api/upload/route.ts` — stub file upload handler.
- `src/app/api/schedule/route.ts` — stub AI scheduling + calendar sync.
- `src/components` — `WeeklyPlanner`, `TaskApprovalModal`, `AnalyticsCard`.
- `src/lib` — placeholder `firebase`, `googleCalendar`, `aiScheduler` helpers.

### Commands
- `npm run dev` — start dev server at http://localhost:3000.
- `npm run lint` — run ESLint.

### Environment
Create a `.env.local` with your Firebase project keys:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### API (demo stubs)
- `POST /api/upload` — send `file` in `FormData`; returns mock storage URL.
- `POST /api/schedule` — body: `{ tasks: [{ id, title, durationMinutes }], weekStart }`; returns mock events + sync result.

### Notes
- Auth, storage, and calendar integrations are placeholders; wire real Firebase/Auth/Google Calendar before production use.
