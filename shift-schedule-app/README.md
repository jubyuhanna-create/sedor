Work Schedule App — Dev Notes
Quick setup notes for the Next.js + Supabase shift scheduler I built. Uses custom session auth with admin and employee roles.

1. Database & Supabase Setup
Create a new Supabase project (pick whichever region is closest).

Head to the SQL Editor and run my schema script from supabase/schema.sql.

This creates the 3 core tables I designed for the system: employees, schedule_entries, and schedule_status.

2. API Keys & Config
Go to Project Settings -> API.

Grab the project URL and the service_role key.

NEXT_PUBLIC_SUPABASE_URL = Project URL

SUPABASE_SERVICE_ROLE_KEY = service_role key

Note on auth design: I'm using the service_role key on server-side API routes to handle custom auth checks and bypass standard RLS policies. Keep this key strictly on the server side.

3. Environment Variables
Copy .env.local.example over to .env.local.

Generate a random session key by running:

Bash
openssl rand -base64 32
Fill out .env.local:

Code snippet
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
SESSION_SECRET=<generated_openssl_key>
4. Local Run
Bash
npm install
npm run dev
App starts at http://localhost:3000.

5. Seed Initial Admin Account
Since I built custom password hashing into the project instead of using Supabase Auth UI, seed your first user like this:

Generate a password hash using the CLI script I wrote:

Bash
npm run hash-password -- "your-password"
Go to Supabase Table Editor -> employees table -> Insert row:

username: admin

password_hash: <hash_from_step_1>

display_name: Your Name

access_role: admin

Repeat for staff accounts, setting access_role to employee.

6. How the System Works
Auth: Logging in sets an encrypted session cookie via SESSION_SECRET.

State & Auto-save: I set up onBlur events on the frontend grid, so any shift edit writes directly to schedule_entries in Supabase as soon as you step out of a cell.

Locking System: When an admin hits Publish, I update schedule_status to lock the grid into read-only mode for everyone until toggled back.

7. Deployment (Vercel)
Push code to GitHub.

Link repo to Vercel.

Add the 3 env variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SESSION_SECRET).

Deploy.
