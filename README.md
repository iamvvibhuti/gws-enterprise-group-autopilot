# Google Workspace Group Auto-Pilot

This repository contains a Google Apps Script used to automatically manage
Google Group membership in a large Google Workspace environment.

The script was built for real-world enterprise use where:
- user count is very high (100k+)
- execution time limits are a concern
- group membership needs to stay accurate without manual work

Once configured, the script runs on its own and keeps the group in sync.

---

## What this script does

On each run, the script:

1. Fetches **only active users** from Google Directory  
2. Checks each user’s:
   - Grade (from a Custom Schema)
   - Work location (from Address → Work)
3. Adds matching users to the target Google Group
4. Removes users who are suspended or no longer exist
5. If the Apps Script time limit is reached:
   - progress is saved
   - the script schedules itself to resume
   - execution continues from where it stopped

No manual intervention is needed after setup.

---

## Why this exists

Google Groups does not natively support complex rules like:
- “Add all active users with Grade X”
- “Only if location contains Mumbai”
- “Automatically recover from timeouts”

This script solves those gaps while staying within Apps Script limits.

---

## Requirements

- Google Workspace Admin access
- Admin SDK enabled in Apps Script
- Permissions for:
  - Directory Users (read)
  - Directory Groups (read/write)

---

## Setup (high level)

1. Create a new Google Apps Script project
2. Enable **Admin SDK** (Advanced Google Services)
3. Copy the code from `src/groupSync.gs` into the project
4. Update the `CONFIG` section:
   - target group email
   - valid grades
   - valid location keywords
5. Create **one daily trigger** for: Auto-Update
