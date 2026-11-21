CRUZEO PLAYZ FIXED FILES

Root cause:
- The SQLite database contained 4 tournament rows: ID 1 Season 1 and IDs 2, 3, 4 all representing Season 2.
- The frontend correctly rendered every row returned by /api/tournaments, so all three Season 2 rows appeared.
- The leaderboard data was also attached to the wrong tournament IDs.

What was fixed:
- Database repaired to exactly two tournaments:
  ID 4 = Season 1
  ID 3 = Season 2
- Season 1 leaderboard repaired to Kailash, Neer, Pranay with the requested values.
- Added a unique season index so duplicate seasons cannot be inserted at the database level.
- Added backend validation/normalization so POST /api/tournaments rejects an existing season and converts numeric input like 2 to Season 2.
- database.js now uses the backend directory's database path and safe initial data.
- style.css completed the missing responsive section and added a premium Home-page polish.
- YouTube API code was preserved.
- index.html, script.js and admin.html were preserved unchanged.

IMPORTANT:
1. Stop node server.js before replacing backend/cruzeo.db.
2. Back up your current backend/cruzeo.db first.
3. Replace it with the fixed cruzeo.db from this package.
4. Replace backend/server.js, backend/database.js and the root style.css.
5. Keep your existing .env. Do not replace it.
6. Keep your existing node_modules and package files.
7. Start from backend:
   cd "C:\Users\Admin\OneDrive\Desktop\Cruzeo Full Stack\backend"
   node server.js
8. Open http://localhost:3000
9. Open http://localhost:3000/admin.html

Expected tournaments:
- ID 4 — Season 1 — COMPLETED
- ID 3 — Season 2 — UPCOMING

Season 1 leaderboard:
1. Kailash — 10 matches — 10 wins — 20 points
2. Neer — 10 matches — 7 wins — 14 points
3. Pranay — 9 matches — 7 wins — 14 points

Season 2 leaderboard: empty
