require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const { initializeDatabase } = require("./database");

const app = express();
const PORT = 3000;


// ==========================================
// MIDDLEWARE
// ==========================================

app.use(express.json());


// ==========================================
// DATABASE
// ==========================================

const db = new DatabaseSync(
    path.join(__dirname, "cruzeo.db")
);

initializeDatabase(db);


// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

const ADMIN_PASSWORD =
    String(process.env.ADMIN_PASSWORD || "").trim();

const ADMIN_COOKIE_NAME =
    "cruzeo_admin_session";

const ADMIN_SESSION_DURATION =
    24 * 60 * 60 * 1000;

const adminSessions = new Map();

console.log(
    "ADMIN PASSWORD LOADED:",
    ADMIN_PASSWORD ? "YES" : "NO"
);

console.log(
    "ADMIN PASSWORD LENGTH:",
    ADMIN_PASSWORD.length
);


// ==========================================
// COOKIE HELPERS
// ==========================================

function parseCookies(req) {

    const cookies = {};

    const cookieHeader =
        req.headers.cookie;

    if (!cookieHeader) {
        return cookies;
    }

    cookieHeader
        .split(";")
        .forEach(cookie => {

            const parts =
                cookie.trim().split("=");

            const key =
                parts.shift();

            const value =
                parts.join("=");

            if (key) {

                cookies[key] =
                    decodeURIComponent(
                        value || ""
                    );

            }

        });

    return cookies;
}


// ==========================================
// AUTH CHECK
// ==========================================

function isAdminAuthenticated(req) {

    const cookies =
        parseCookies(req);

    const token =
        cookies[ADMIN_COOKIE_NAME];

    if (!token) {
        return false;
    }

    const session =
        adminSessions.get(token);

    if (!session) {
        return false;
    }

    if (Date.now() > session.expiresAt) {

        adminSessions.delete(token);

        return false;
    }

    return true;
}


// ==========================================
// ADMIN API PROTECTION
// ==========================================

function requireAdmin(req, res, next) {

    if (!isAdminAuthenticated(req)) {

        return res.status(401).json({
            success: false,
            message:
                "Admin authentication required."
        });

    }

    next();
}


// ==========================================
// ADMIN PAGE PROTECTION
// ==========================================

function requireAdminPage(req, res, next) {

    if (!isAdminAuthenticated(req)) {

        return res.redirect(
            "/admin-login.html"
        );

    }

    next();
}


// ==========================================
// ADMIN LOGIN
// ==========================================

app.post(
    "/api/admin/login",
    (req, res) => {

        try {

            if (!ADMIN_PASSWORD) {

                console.error(
                    "ADMIN_PASSWORD is missing from .env"
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Admin password is not configured."
                });

            }

            const enteredPassword =
                String(
                    req.body?.password || ""
                ).trim();

            console.log(
                "Admin login attempt. Entered length:",
                enteredPassword.length
            );

            const passwordCorrect =
                enteredPassword === ADMIN_PASSWORD;

            if (!passwordCorrect) {

                console.log(
                    "Admin login: incorrect password."
                );

                return res.status(401).json({
                    success: false,
                    message:
                        "Incorrect admin password."
                });

            }

            const token =
                crypto
                    .randomBytes(32)
                    .toString("hex");

            adminSessions.set(
                token,
                {
                    expiresAt:
                        Date.now() +
                        ADMIN_SESSION_DURATION
                }
            );

            const secureCookie =
                process.env.NODE_ENV === "production"
                    ? "; Secure"
                    : "";

            res.setHeader(
                "Set-Cookie",
                `${ADMIN_COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400${secureCookie}`
            );

            console.log(
                "Admin login successful."
            );

            return res.json({
                success: true,
                message:
                    "Admin login successful."
            });

        } catch (error) {

            console.error(
                "Admin login error:",
                error.message
            );

            return res.status(500).json({
                success: false,
                message:
                    "Login failed."
            });

        }

    }
);


// ==========================================
// ADMIN AUTH STATUS
// ==========================================

app.get(
    "/api/admin/auth",
    (req, res) => {

        res.json({
            success: true,
            authenticated:
                isAdminAuthenticated(req)
        });

    }
);


// ==========================================
// ADMIN LOGOUT
// ==========================================

app.post(
    "/api/admin/logout",
    (req, res) => {

        const cookies =
            parseCookies(req);

        const token =
            cookies[ADMIN_COOKIE_NAME];

        if (token) {
            adminSessions.delete(token);
        }

        res.setHeader(
            "Set-Cookie",
            `${ADMIN_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
        );

        res.json({
            success: true,
            message:
                "Logged out successfully."
        });

    }
);


// ==========================================
// PROTECT ADMIN PAGE
// ==========================================

app.get(
    "/admin.html",
    requireAdminPage,
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "..",
                "admin.html"
            )
        );

    }
);


// ==========================================
// STATIC WEBSITE FILES
// ==========================================

app.use(
    express.static(
        path.join(__dirname, "..")
    )
);


// ==========================================
// YOUTUBE CONFIG
// ==========================================

const YOUTUBE_API_KEY =
    process.env.YOUTUBE_API_KEY;

const YOUTUBE_HANDLE =
    "@cruzeoplayz";

let youtubeChannelId = null;
let youtubeUploadsPlaylistId = null;


// ==========================================
// TEST API
// ==========================================

app.get(
    "/api/test",
    (req, res) => {

        res.json({
            success: true,
            message:
                "Cruzeo Playz Backend is Working!"
        });

    }
);


// ==========================================
// STATS - GET
// ==========================================

app.get(
    "/api/stats",
    (req, res) => {

        try {

            const stats =
                db
                    .prepare(
                        "SELECT * FROM stats WHERE id = 1"
                    )
                    .get();

            res.json({
                success: true,
                stats
            });

        } catch (error) {

            console.error(
                "Stats GET error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Database error",
                error:
                    error.message
            });

        }

    }
);


// ==========================================
// STATS - UPDATE
// ADMIN ONLY
// ==========================================

app.put(
    "/api/stats",
    requireAdmin,
    (req, res) => {

        try {

            const {
                matchesPlayed,
                matchesWon,
                winRate,
                runs,
                wickets,
                centuries,
                fifties
            } = req.body;

            db.prepare(`
                UPDATE stats
                SET
                    matchesPlayed = ?,
                    matchesWon = ?,
                    winRate = ?,
                    runs = ?,
                    wickets = ?,
                    centuries = ?,
                    fifties = ?
                WHERE id = 1
            `).run(
                matchesPlayed,
                matchesWon,
                winRate,
                runs,
                wickets,
                centuries,
                fifties
            );

            res.json({
                success: true,
                message:
                    "Stats updated successfully!"
            });

        } catch (error) {

            console.error(
                "Stats UPDATE error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to update stats",
                error:
                    error.message
            });

        }

    }
);


// ==========================================
// TOURNAMENTS - GET ALL
// ==========================================

app.get(
    "/api/tournaments",
    (req, res) => {

        try {

            const tournaments =
                db.prepare(`
                    SELECT *
                    FROM tournaments
                    ORDER BY
                        CASE
                            WHEN id = 4 THEN 1
                            WHEN id = 3 THEN 2
                            ELSE 3
                        END,
                        id DESC
                `).all();

            res.json({
                success: true,
                tournaments
            });

        } catch (error) {

            console.error(
                "Tournaments GET error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    error.message
            });

        }

    }
);


// ==========================================
// TOURNAMENT - GET SINGLE
// ==========================================

app.get(
    "/api/tournaments/:id",
    (req, res) => {

        try {

            const tournamentId =
                Number(req.params.id);

            const tournament =
                db.prepare(`
                    SELECT *
                    FROM tournaments
                    WHERE id = ?
                `).get(tournamentId);

            if (!tournament) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Tournament not found."
                });

            }

            const players =
                db.prepare(`
                    SELECT *
                    FROM leaderboard
                    WHERE tournamentId = ?
                    ORDER BY
                        points DESC,
                        nrr DESC,
                        wins DESC,
                        matches DESC,
                        id ASC
                `).all(tournamentId);


            // Individual registrations
            const individualCount =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM registrations
                    WHERE tournamentId = ?
                    AND status IN ('PENDING', 'APPROVED')
                `).get(tournamentId);


            // Captain registrations
            const captainCount =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM team_registrations
                    WHERE tournamentId = ?
                    AND status IN ('PENDING', 'APPROVED')
                `).get(tournamentId);


            // Independent team-player registrations
            const teamPlayerCount =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM team_player_registrations
                    WHERE tournamentId = ?
                    AND status IN ('PENDING', 'APPROVED')
                `).get(tournamentId);


            const individualRegistered =
                Number(
                    individualCount?.count || 0
                );

            const captainsRegistered =
                Number(
                    captainCount?.count || 0
                );

            const playersRegistered =
                Number(
                    teamPlayerCount?.count || 0
                );


            res.json({
                success: true,

                tournament,

                leaderboard:
                    players,

                // Existing field preserved
                registrationCount:
                    individualRegistered,

                registration: {

                    individual: {
                        registered:
                            individualRegistered,

                        max:
                            Number(
                                tournament.maxPlayers || 32
                            )
                    },

                    captain: {
                        registered:
                            captainsRegistered,

                        max:
                            Number(
                                tournament.maxCaptains || 16
                            )
                    },

                    player: {
                        registered:
                            playersRegistered,

                        max:
                            Number(
                                tournament.maxPlayers || 32
                            )
                    }

                }

            });

        } catch (error) {

            console.error(
                "Tournament details error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    error.message
            });

        }

    }
);


// ==========================================
// CREATE TOURNAMENT
// ADMIN ONLY
// ==========================================

app.post(
    "/api/tournaments",
    requireAdmin,
    (req, res) => {

        try {

            const {
                name,
                season,
                status,
                champion,
                runnerUp,
                details,
                registrationOpen,
                maxPlayers,
                tournamentType,
                playersPerTeam,
                maxTeams,
                maxCaptains
            } = req.body;


            if (!name || !season) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Tournament name and season are required."
                });

            }


            const normalizedSeason =
                String(season)
                    .trim()
                    .replace(
                        /^(season\s*)/i,
                        "Season "
                    );


            const existing =
                db.prepare(`
                    SELECT id
                    FROM tournaments
                    WHERE LOWER(TRIM(season))
                        = LOWER(TRIM(?))
                    LIMIT 1
                `)
                .get(normalizedSeason);


            if (existing) {

                return res.status(409).json({
                    success: false,
                    message:
                        `${normalizedSeason} already exists.`
                });

            }


            const numericMaxPlayers =
                Math.max(
                    1,
                    Number(maxPlayers) || 32
                );


            const numericMaxTeams =
                Math.max(
                    1,
                    Number(maxTeams) || 16
                );


            const numericPlayersPerTeam =
                Math.max(
                    1,
                    Number(playersPerTeam) || 1
                );


            const numericMaxCaptains =
                Math.max(
                    1,
                    Number(maxCaptains) || 16
                );


            const normalizedType =
                String(
                    tournamentType ||
                    "INDIVIDUAL"
                )
                    .trim()
                    .toUpperCase();


            const safeTournamentType =
                normalizedType === "TEAM"
                    ? "TEAM"
                    : "INDIVIDUAL";


            const registration =
                registrationOpen ? 1 : 0;


            const result =
                db.prepare(`
                    INSERT INTO tournaments
                    (
                        name,
                        season,
                        status,
                        champion,
                        runnerUp,
                        details,
                        registrationOpen,
                        maxPlayers,
                        tournamentType,
                        playersPerTeam,
                        maxTeams,
                        maxCaptains
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `)
                .run(
                    String(name).trim(),
                    normalizedSeason,
                    status || "UPCOMING",
                    String(champion || "").trim(),
                    String(runnerUp || "").trim(),
                    String(details || "").trim(),
                    registration,
                    numericMaxPlayers,
                    safeTournamentType,
                    numericPlayersPerTeam,
                    numericMaxTeams,
                    numericMaxCaptains
                );


            res.json({
                success: true,
                message:
                    "Tournament created successfully!",
                id:
                    Number(result.lastInsertRowid)
            });

        } catch (error) {

            console.error(
                "Create tournament error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to create tournament.",
                error:
                    error.message
            });

        }

    }
);


// ==========================================
// UPDATE TOURNAMENT
// ADMIN ONLY
// ==========================================

app.put(
    "/api/tournaments/:id",
    requireAdmin,
    (req, res) => {

        try {

            const tournamentId =
                Number(req.params.id);

            const {
                name,
                season,
                status,
                champion,
                runnerUp,
                details,
                registrationOpen,
                maxPlayers,
                tournamentType,
                playersPerTeam,
                maxTeams,
                maxCaptains
            } = req.body;


            if (!name || !season) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Tournament name and season are required."
                });

            }


            const existingTournament =
                db.prepare(`
                    SELECT id
                    FROM tournaments
                    WHERE id = ?
                `)
                .get(tournamentId);


            if (!existingTournament) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Tournament not found."
                });

            }


            const normalizedSeason =
                String(season)
                    .trim()
                    .replace(
                        /^(season\s*)/i,
                        "Season "
                    );


            const duplicateSeason =
                db.prepare(`
                    SELECT id
                    FROM tournaments
                    WHERE LOWER(TRIM(season))
                        = LOWER(TRIM(?))
                    AND id != ?
                    LIMIT 1
                `)
                .get(
                    normalizedSeason,
                    tournamentId
                );


            if (duplicateSeason) {

                return res.status(409).json({
                    success: false,
                    message:
                        `${normalizedSeason} already exists.`
                });

            }


            const numericMaxPlayers =
                Math.max(
                    1,
                    Number(maxPlayers) || 32
                );


            const numericMaxTeams =
                Math.max(
                    1,
                    Number(maxTeams) || 16
                );


            const numericPlayersPerTeam =
                Math.max(
                    1,
                    Number(playersPerTeam) || 1
                );


            const numericMaxCaptains =
                Math.max(
                    1,
                    Number(maxCaptains) || 16
                );


            const normalizedType =
                String(
                    tournamentType ||
                    "INDIVIDUAL"
                )
                    .trim()
                    .toUpperCase();


            const safeTournamentType =
                normalizedType === "TEAM"
                    ? "TEAM"
                    : "INDIVIDUAL";


            const registration =
                registrationOpen ? 1 : 0;


            db.prepare(`
                UPDATE tournaments
                SET
                    name = ?,
                    season = ?,
                    status = ?,
                    champion = ?,
                    runnerUp = ?,
                    details = ?,
                    registrationOpen = ?,
                    maxPlayers = ?,
                    tournamentType = ?,
                    playersPerTeam = ?,
                    maxTeams = ?,
                    maxCaptains = ?
                WHERE id = ?
            `).run(
                String(name).trim(),
                normalizedSeason,
                status || "UPCOMING",
                String(champion || "").trim(),
                String(runnerUp || "").trim(),
                String(details || "").trim(),
                registration,
                numericMaxPlayers,
                safeTournamentType,
                numericPlayersPerTeam,
                numericMaxTeams,
                numericMaxCaptains,
                tournamentId
            );


            res.json({
                success: true,
                message:
                    "Tournament updated successfully!"
            });

        } catch (error) {

            console.error(
                "Update tournament error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to update tournament.",
                error:
                    error.message
            });

        }

    }
);


// ==========================================
// DELETE TOURNAMENT
// ADMIN ONLY
// ==========================================

app.delete(
    "/api/tournaments/:id",
    requireAdmin,
    (req, res) => {

        try {

            const tournamentId =
                Number(req.params.id);


            const existingTournament =
                db.prepare(`
                    SELECT id, name, season
                    FROM tournaments
                    WHERE id = ?
                `)
                .get(tournamentId);


            if (!existingTournament) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Tournament not found."
                });

            }


            // Individual registrations
            db.prepare(`
                DELETE FROM registrations
                WHERE tournamentId = ?
            `).run(tournamentId);


            // Independent team player registrations
            db.prepare(`
                DELETE FROM team_player_registrations
                WHERE tournamentId = ?
            `).run(tournamentId);


            // Team roster players
            db.prepare(`
                DELETE FROM team_players
                WHERE teamRegistrationId IN (
                    SELECT id
                    FROM team_registrations
                    WHERE tournamentId = ?
                )
            `).run(tournamentId);


            // Captain/team registrations
            db.prepare(`
                DELETE FROM team_registrations
                WHERE tournamentId = ?
            `).run(tournamentId);


            // Leaderboard
            db.prepare(`
                DELETE FROM leaderboard
                WHERE tournamentId = ?
            `).run(tournamentId);


            // Tournament
            db.prepare(`
                DELETE FROM tournaments
                WHERE id = ?
            `).run(tournamentId);


            res.json({
                success: true,
                message:
                    `${existingTournament.season} deleted successfully!`
            });

        } catch (error) {

            console.error(
                "Delete tournament error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to delete tournament.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// INDIVIDUAL REGISTRATION
// PUBLIC SUBMIT
// ======================================================

app.post(
    "/api/registrations",
    (req, res) => {

        try {

            const {
                tournamentId,
                playerName,
                gameUsername,
                discordUsername
            } = req.body;


            const numericTournamentId =
                Number(tournamentId);


            const cleanPlayerName =
                String(playerName || "").trim();


            const cleanGameUsername =
                String(gameUsername || "").trim();


            const cleanDiscordUsername =
                String(discordUsername || "").trim();


            if (
                !numericTournamentId ||
                !cleanPlayerName ||
                !cleanGameUsername
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Player Name and Real Cricket Username are required."
                });

            }


            const tournament =
                db.prepare(`
                    SELECT
                        id,
                        name,
                        season,
                        tournamentType,
                        registrationOpen,
                        maxPlayers
                    FROM tournaments
                    WHERE id = ?
                `)
                .get(numericTournamentId);


            if (!tournament) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Tournament not found."
                });

            }


            if (
                String(tournament.tournamentType)
                    .toUpperCase() === "TEAM"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "This is a team tournament. Please register as Captain or Player."
                });

            }


            if (!Number(tournament.registrationOpen)) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Registration is currently closed."
                });

            }


            const registeredCount =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM registrations
                    WHERE tournamentId = ?
                    AND status IN ('PENDING', 'APPROVED')
                `)
                .get(numericTournamentId);


            const currentCount =
                Number(
                    registeredCount?.count || 0
                );


            const maxPlayers =
                Math.max(
                    1,
                    Number(tournament.maxPlayers) || 32
                );


            if (currentCount >= maxPlayers) {

                db.prepare(`
                    UPDATE tournaments
                    SET registrationOpen = 0
                    WHERE id = ?
                `).run(numericTournamentId);


                return res.status(409).json({
                    success: false,
                    message:
                        "Registration is full."
                });

            }


            const duplicate =
                db.prepare(`
                    SELECT id
                    FROM registrations
                    WHERE tournamentId = ?
                    AND LOWER(TRIM(gameUsername))
                        = LOWER(TRIM(?))
                    AND status IN ('PENDING', 'APPROVED')
                    LIMIT 1
                `)
                .get(
                    numericTournamentId,
                    cleanGameUsername
                );


            if (duplicate) {

                return res.status(409).json({
                    success: false,
                    message:
                        "This Real Cricket username is already registered."
                });

            }


            db.prepare(`
                INSERT INTO registrations
                (
                    tournamentId,
                    playerName,
                    gameUsername,
                    discordUsername,
                    status
                )
                VALUES (?, ?, ?, ?, 'PENDING')
            `).run(
                numericTournamentId,
                cleanPlayerName,
                cleanGameUsername,
                cleanDiscordUsername
            );


            const newCount =
                currentCount + 1;


            if (newCount >= maxPlayers) {

                db.prepare(`
                    UPDATE tournaments
                    SET registrationOpen = 0
                    WHERE id = ?
                `).run(numericTournamentId);

            }


            res.json({
                success: true,
                message:
                    "Registration submitted successfully!",
                status:
                    "PENDING",
                registered:
                    newCount,
                maxPlayers
            });

        } catch (error) {

            console.error(
                "Registration submit error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to submit registration.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// INDIVIDUAL REGISTRATION STATUS
// PUBLIC
// ======================================================

app.get(
    "/api/registrations/tournament/:tournamentId",
    (req, res) => {

        try {

            const tournamentId =
                Number(req.params.tournamentId);


            const tournament =
                db.prepare(`
                    SELECT
                        id,
                        name,
                        season,
                        tournamentType,
                        registrationOpen,
                        maxPlayers
                    FROM tournaments
                    WHERE id = ?
                `)
                .get(tournamentId);


            if (!tournament) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Tournament not found."
                });

            }


            const result =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM registrations
                    WHERE tournamentId = ?
                    AND status IN ('PENDING', 'APPROVED')
                `)
                .get(tournamentId);


            const registered =
                Number(result?.count || 0);


            const maxPlayers =
                Math.max(
                    1,
                    Number(tournament.maxPlayers) || 32
                );


            let registrationStatus =
                "CLOSED";


            if (
                Number(tournament.registrationOpen) &&
                registered < maxPlayers
            ) {

                registrationStatus =
                    "OPEN";

            } else if (
                registered >= maxPlayers
            ) {

                registrationStatus =
                    "FULL";

            }


            res.json({
                success: true,

                tournament: {
                    id:
                        tournament.id,
                    name:
                        tournament.name,
                    season:
                        tournament.season,
                    tournamentType:
                        tournament.tournamentType,
                    registrationOpen:
                        Number(tournament.registrationOpen),
                    maxPlayers
                },

                registered,

                registrationStatus

            });

        } catch (error) {

            console.error(
                "Registration status error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to load registration status.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// TEAM CAPTAIN REGISTRATION
// PUBLIC
// ======================================================

app.post(
    "/api/team-registrations/captain",
    (req, res) => {

        try {

            const {
                tournamentId,
                teamName,
                captainName,
                captainGameUsername,
                discordUsername
            } = req.body;


            const numericTournamentId =
                Number(tournamentId);


            const cleanCaptainName =
                String(captainName || "").trim();


            const cleanCaptainUsername =
                String(captainGameUsername || "").trim();


            const cleanDiscordUsername =
                String(discordUsername || "").trim();


            let cleanTeamName =
                String(teamName || "").trim();


            if (
                !numericTournamentId ||
                !cleanCaptainName ||
                !cleanCaptainUsername
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Captain Name and Real Cricket Username are required."
                });

            }


            if (!cleanTeamName) {

                cleanTeamName =
                    `${cleanCaptainName}'s Team`;

            }


            if (cleanCaptainName.length > 60) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Captain name is too long."
                });

            }


            if (cleanCaptainUsername.length > 60) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Real Cricket username is too long."
                });

            }


            if (cleanTeamName.length > 60) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Team name is too long."
                });

            }


            const tournament =
                db.prepare(`
                    SELECT
                        id,
                        name,
                        season,
                        tournamentType,
                        registrationOpen,
                        maxCaptains
                    FROM tournaments
                    WHERE id = ?
                `)
                .get(numericTournamentId);


            if (!tournament) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Tournament not found."
                });

            }


            if (
                String(tournament.tournamentType)
                    .toUpperCase() !== "TEAM"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "This is not a team tournament."
                });

            }


            if (!Number(tournament.registrationOpen)) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Registration is currently closed."
                });

            }


            const maxCaptains =
                Math.max(
                    1,
                    Number(tournament.maxCaptains) || 16
                );


            const countResult =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM team_registrations
                    WHERE tournamentId = ?
                    AND status IN ('PENDING', 'APPROVED')
                `)
                .get(numericTournamentId);


            const currentCount =
                Number(countResult?.count || 0);


            if (currentCount >= maxCaptains) {

                return res.status(409).json({
                    success: false,
                    message:
                        "Captain registration is full."
                });

            }


            // Check captain username
            const duplicateCaptain =
                db.prepare(`
                    SELECT id
                    FROM team_registrations
                    WHERE tournamentId = ?
                    AND LOWER(TRIM(captainGameUsername))
                        = LOWER(TRIM(?))
                    AND status IN ('PENDING', 'APPROVED')
                    LIMIT 1
                `)
                .get(
                    numericTournamentId,
                    cleanCaptainUsername
                );


            if (duplicateCaptain) {

                return res.status(409).json({
                    success: false,
                    message:
                        "This Real Cricket username is already registered as a captain."
                });

            }


            // Check same username in player pool
            const duplicatePlayer =
                db.prepare(`
                    SELECT id
                    FROM team_player_registrations
                    WHERE tournamentId = ?
                    AND LOWER(TRIM(gameUsername))
                        = LOWER(TRIM(?))
                    AND status IN ('PENDING', 'APPROVED')
                    LIMIT 1
                `)
                .get(
                    numericTournamentId,
                    cleanCaptainUsername
                );


            if (duplicatePlayer) {

                return res.status(409).json({
                    success: false,
                    message:
                        "This Real Cricket username is already registered as a player."
                });

            }


            db.prepare(`
                INSERT INTO team_registrations
                (
                    tournamentId,
                    teamName,
                    captainName,
                    captainGameUsername,
                    discordUsername,
                    status
                )
                VALUES (?, ?, ?, ?, ?, 'PENDING')
            `).run(
                numericTournamentId,
                cleanTeamName,
                cleanCaptainName,
                cleanCaptainUsername,
                cleanDiscordUsername
            );


            const newCount =
                currentCount + 1;


            res.json({
                success: true,
                message:
                    "Captain registration submitted successfully!",
                status:
                    "PENDING",
                registered:
                    newCount,
                maxCaptains
            });

        } catch (error) {

            console.error(
                "Captain registration error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to submit captain registration.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// TEAM PLAYER REGISTRATION
// PUBLIC
// ======================================================

app.post(
    "/api/team-registrations/player",
    (req, res) => {

        try {

            const {
                tournamentId,
                playerName,
                gameUsername,
                discordUsername
            } = req.body;


            const numericTournamentId =
                Number(tournamentId);


            const cleanPlayerName =
                String(playerName || "").trim();


            const cleanGameUsername =
                String(gameUsername || "").trim();


            const cleanDiscordUsername =
                String(discordUsername || "").trim();


            if (
                !numericTournamentId ||
                !cleanPlayerName ||
                !cleanGameUsername
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Player Name and Real Cricket Username are required."
                });

            }


            const tournament =
                db.prepare(`
                    SELECT
                        id,
                        name,
                        season,
                        tournamentType,
                        registrationOpen,
                        maxPlayers
                    FROM tournaments
                    WHERE id = ?
                `)
                .get(numericTournamentId);


            if (!tournament) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Tournament not found."
                });

            }


            if (
                String(tournament.tournamentType)
                    .toUpperCase() !== "TEAM"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "This is not a team tournament."
                });

            }


            if (!Number(tournament.registrationOpen)) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Registration is currently closed."
                });

            }


            const maxPlayers =
                Math.max(
                    1,
                    Number(tournament.maxPlayers) || 32
                );


            const countResult =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM team_player_registrations
                    WHERE tournamentId = ?
                    AND status IN ('PENDING', 'APPROVED')
                `)
                .get(numericTournamentId);


            const currentCount =
                Number(countResult?.count || 0);


            if (currentCount >= maxPlayers) {

                return res.status(409).json({
                    success: false,
                    message:
                        "Player registration is full."
                });

            }


            // Check player pool duplicate
            const duplicatePlayer =
                db.prepare(`
                    SELECT id
                    FROM team_player_registrations
                    WHERE tournamentId = ?
                    AND LOWER(TRIM(gameUsername))
                        = LOWER(TRIM(?))
                    AND status IN ('PENDING', 'APPROVED')
                    LIMIT 1
                `)
                .get(
                    numericTournamentId,
                    cleanGameUsername
                );


            if (duplicatePlayer) {

                return res.status(409).json({
                    success: false,
                    message:
                        "This Real Cricket username is already registered as a player."
                });

            }


            // Check captain pool duplicate
            const duplicateCaptain =
                db.prepare(`
                    SELECT id
                    FROM team_registrations
                    WHERE tournamentId = ?
                    AND LOWER(TRIM(captainGameUsername))
                        = LOWER(TRIM(?))
                    AND status IN ('PENDING', 'APPROVED')
                    LIMIT 1
                `)
                .get(
                    numericTournamentId,
                    cleanGameUsername
                );


            if (duplicateCaptain) {

                return res.status(409).json({
                    success: false,
                    message:
                        "This Real Cricket username is already registered as a captain."
                });

            }


            db.prepare(`
                INSERT INTO team_player_registrations
                (
                    tournamentId,
                    playerName,
                    gameUsername,
                    discordUsername,
                    status
                )
                VALUES (?, ?, ?, ?, 'PENDING')
            `).run(
                numericTournamentId,
                cleanPlayerName,
                cleanGameUsername,
                cleanDiscordUsername
            );


            const newCount =
                currentCount + 1;


            res.json({
                success: true,
                message:
                    "Player registration submitted successfully!",
                status:
                    "PENDING",
                registered:
                    newCount,
                maxPlayers
            });

        } catch (error) {

            console.error(
                "Team player registration error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to submit player registration.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// TEAM REGISTRATION STATUS
// PUBLIC
// ======================================================

app.get(
    "/api/team-registrations/tournament/:tournamentId",
    (req, res) => {

        try {

            const tournamentId =
                Number(req.params.tournamentId);


            const tournament =
                db.prepare(`
                    SELECT
                        id,
                        name,
                        season,
                        tournamentType,
                        registrationOpen,
                        maxCaptains,
                        maxPlayers,
                        maxTeams,
                        playersPerTeam
                    FROM tournaments
                    WHERE id = ?
                `)
                .get(tournamentId);


            if (!tournament) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Tournament not found."
                });

            }


            const captainResult =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM team_registrations
                    WHERE tournamentId = ?
                    AND status IN ('PENDING', 'APPROVED')
                `)
                .get(tournamentId);


            const playerResult =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM team_player_registrations
                    WHERE tournamentId = ?
                    AND status IN ('PENDING', 'APPROVED')
                `)
                .get(tournamentId);


            const captains =
                Number(
                    captainResult?.count || 0
                );


            const players =
                Number(
                    playerResult?.count || 0
                );


            const maxCaptains =
                Math.max(
                    1,
                    Number(tournament.maxCaptains) || 16
                );


            const maxPlayers =
                Math.max(
                    1,
                    Number(tournament.maxPlayers) || 32
                );


            let captainStatus =
                "CLOSED";


            let playerStatus =
                "CLOSED";


            if (
                Number(tournament.registrationOpen) &&
                captains < maxCaptains
            ) {

                captainStatus = "OPEN";

            } else if (
                captains >= maxCaptains
            ) {

                captainStatus = "FULL";

            }


            if (
                Number(tournament.registrationOpen) &&
                players < maxPlayers
            ) {

                playerStatus = "OPEN";

            } else if (
                players >= maxPlayers
            ) {

                playerStatus = "FULL";

            }


            res.json({

                success: true,

                tournament,

                captain: {
                    registered:
                        captains,
                    max:
                        maxCaptains,
                    status:
                        captainStatus
                },

                player: {
                    registered:
                        players,
                    max:
                        maxPlayers,
                    status:
                        playerStatus
                }

            });

        } catch (error) {

            console.error(
                "Team registration status error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to load team registration status.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// ADMIN - ALL INDIVIDUAL REGISTRATIONS
// ======================================================

app.get(
    "/api/registrations",
    requireAdmin,
    (req, res) => {

        try {

            const registrations =
                db.prepare(`
                    SELECT
                        registrations.id,
                        registrations.tournamentId,
                        registrations.playerName,
                        registrations.gameUsername,
                        registrations.discordUsername,
                        registrations.status,
                        registrations.createdAt,
                        tournaments.name AS tournamentName,
                        tournaments.season AS tournamentSeason,
                        tournaments.maxPlayers
                    FROM registrations
                    LEFT JOIN tournaments
                        ON registrations.tournamentId =
                           tournaments.id
                    ORDER BY
                        registrations.createdAt DESC,
                        registrations.id DESC
                `).all();


            res.json({
                success: true,
                registrations
            });

        } catch (error) {

            console.error(
                "Registrations GET error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to load registrations.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// ADMIN - INDIVIDUAL BY TOURNAMENT
// ======================================================

app.get(
    "/api/registrations/tournament/:tournamentId/admin",
    requireAdmin,
    (req, res) => {

        try {

            const tournamentId =
                Number(req.params.tournamentId);


            const registrations =
                db.prepare(`
                    SELECT *
                    FROM registrations
                    WHERE tournamentId = ?
                    ORDER BY
                        CASE status
                            WHEN 'PENDING' THEN 1
                            WHEN 'APPROVED' THEN 2
                            WHEN 'REJECTED' THEN 3
                            ELSE 4
                        END,
                        id ASC
                `).all(tournamentId);


            res.json({
                success: true,
                registrations
            });

        } catch (error) {

            console.error(
                "Tournament registrations error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to load tournament registrations.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// ADMIN - ALL CAPTAIN REGISTRATIONS
// ======================================================

app.get(
    "/api/team-registrations/captains",
    requireAdmin,
    (req, res) => {

        try {

            const registrations =
                db.prepare(`
                    SELECT
                        team_registrations.id,
                        team_registrations.tournamentId,
                        team_registrations.teamName,
                        team_registrations.captainName,
                        team_registrations.captainGameUsername,
                        team_registrations.discordUsername,
                        team_registrations.status,
                        team_registrations.createdAt,
                        tournaments.name AS tournamentName,
                        tournaments.season AS tournamentSeason,
                        tournaments.maxCaptains
                    FROM team_registrations
                    LEFT JOIN tournaments
                        ON team_registrations.tournamentId =
                           tournaments.id
                    ORDER BY
                        team_registrations.createdAt DESC,
                        team_registrations.id DESC
                `).all();


            res.json({
                success: true,
                registrations
            });

        } catch (error) {

            console.error(
                "Captain registrations GET error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to load captain registrations.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// ADMIN - ALL TEAM PLAYER REGISTRATIONS
// ======================================================

app.get(
    "/api/team-registrations/players",
    requireAdmin,
    (req, res) => {

        try {

            const registrations =
                db.prepare(`
                    SELECT
                        team_player_registrations.id,
                        team_player_registrations.tournamentId,
                        team_player_registrations.playerName,
                        team_player_registrations.gameUsername,
                        team_player_registrations.discordUsername,
                        team_player_registrations.status,
                        team_player_registrations.createdAt,
                        tournaments.name AS tournamentName,
                        tournaments.season AS tournamentSeason,
                        tournaments.maxPlayers
                    FROM team_player_registrations
                    LEFT JOIN tournaments
                        ON team_player_registrations.tournamentId =
                           tournaments.id
                    ORDER BY
                        team_player_registrations.createdAt DESC,
                        team_player_registrations.id DESC
                `).all();


            res.json({
                success: true,
                registrations
            });

        } catch (error) {

            console.error(
                "Team player registrations GET error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to load player registrations.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// ADMIN - CAPTAIN REGISTRATIONS BY TOURNAMENT
// ======================================================

app.get(
    "/api/team-registrations/captains/tournament/:tournamentId",
    requireAdmin,
    (req, res) => {

        try {

            const tournamentId =
                Number(req.params.tournamentId);


            const registrations =
                db.prepare(`
                    SELECT *
                    FROM team_registrations
                    WHERE tournamentId = ?
                    ORDER BY
                        CASE status
                            WHEN 'PENDING' THEN 1
                            WHEN 'APPROVED' THEN 2
                            WHEN 'REJECTED' THEN 3
                            ELSE 4
                        END,
                        id ASC
                `).all(tournamentId);


            res.json({
                success: true,
                registrations
            });

        } catch (error) {

            console.error(
                "Captain tournament registrations error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to load captain registrations.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// ADMIN - PLAYER REGISTRATIONS BY TOURNAMENT
// ======================================================

app.get(
    "/api/team-registrations/players/tournament/:tournamentId",
    requireAdmin,
    (req, res) => {

        try {

            const tournamentId =
                Number(req.params.tournamentId);


            const registrations =
                db.prepare(`
                    SELECT *
                    FROM team_player_registrations
                    WHERE tournamentId = ?
                    ORDER BY
                        CASE status
                            WHEN 'PENDING' THEN 1
                            WHEN 'APPROVED' THEN 2
                            WHEN 'REJECTED' THEN 3
                            ELSE 4
                        END,
                        id ASC
                `).all(tournamentId);


            res.json({
                success: true,
                registrations
            });

        } catch (error) {

            console.error(
                "Player tournament registrations error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to load player registrations.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// ADMIN - CAPTAIN STATUS
// ======================================================

app.put(
    "/api/team-registrations/captain/:id/status",
    requireAdmin,
    (req, res) => {

        try {

            const registrationId =
                Number(req.params.id);


            const requestedStatus =
                String(
                    req.body?.status || ""
                )
                    .trim()
                    .toUpperCase();


            const allowedStatuses = [
                "PENDING",
                "APPROVED",
                "REJECTED"
            ];


            if (
                !allowedStatuses.includes(
                    requestedStatus
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid registration status."
                });

            }


            const registration =
                db.prepare(`
                    SELECT
                        id,
                        tournamentId,
                        status
                    FROM team_registrations
                    WHERE id = ?
                `)
                .get(registrationId);


            if (!registration) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Captain registration not found."
                });

            }


            const tournament =
                db.prepare(`
                    SELECT
                        id,
                        maxCaptains
                    FROM tournaments
                    WHERE id = ?
                `)
                .get(
                    registration.tournamentId
                );


            if (!tournament) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Tournament not found."
                });

            }


            if (
                requestedStatus === "APPROVED" &&
                registration.status !== "APPROVED"
            ) {

                const countResult =
                    db.prepare(`
                        SELECT COUNT(*) AS count
                        FROM team_registrations
                        WHERE tournamentId = ?
                        AND status IN ('PENDING', 'APPROVED')
                        AND id != ?
                    `)
                    .get(
                        registration.tournamentId,
                        registrationId
                    );


                const currentCount =
                    Number(
                        countResult?.count || 0
                    );


                const maxCaptains =
                    Math.max(
                        1,
                        Number(tournament.maxCaptains) || 16
                    );


                if (
                    currentCount >=
                    maxCaptains
                ) {

                    return res.status(409).json({
                        success: false,
                        message:
                            "Captain registration limit is already full."
                    });

                }

            }


            db.prepare(`
                UPDATE team_registrations
                SET status = ?
                WHERE id = ?
            `).run(
                requestedStatus,
                registrationId
            );


            res.json({
                success: true,
                message:
                    `Captain registration ${requestedStatus.toLowerCase()} successfully!`
            });

        } catch (error) {

            console.error(
                "Captain status update error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to update captain registration.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// ADMIN - PLAYER STATUS
// ======================================================

app.put(
    "/api/team-registrations/player/:id/status",
    requireAdmin,
    (req, res) => {

        try {

            const registrationId =
                Number(req.params.id);


            const requestedStatus =
                String(
                    req.body?.status || ""
                )
                    .trim()
                    .toUpperCase();


            const allowedStatuses = [
                "PENDING",
                "APPROVED",
                "REJECTED"
            ];


            if (
                !allowedStatuses.includes(
                    requestedStatus
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid registration status."
                });

            }


            const registration =
                db.prepare(`
                    SELECT
                        id,
                        tournamentId,
                        status
                    FROM team_player_registrations
                    WHERE id = ?
                `)
                .get(registrationId);


            if (!registration) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Player registration not found."
                });

            }


            const tournament =
                db.prepare(`
                    SELECT
                        id,
                        maxPlayers
                    FROM tournaments
                    WHERE id = ?
                `)
                .get(
                    registration.tournamentId
                );


            if (!tournament) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Tournament not found."
                });

            }


            if (
                requestedStatus === "APPROVED" &&
                registration.status !== "APPROVED"
            ) {

                const countResult =
                    db.prepare(`
                        SELECT COUNT(*) AS count
                        FROM team_player_registrations
                        WHERE tournamentId = ?
                        AND status IN ('PENDING', 'APPROVED')
                        AND id != ?
                    `)
                    .get(
                        registration.tournamentId,
                        registrationId
                    );


                const currentCount =
                    Number(
                        countResult?.count || 0
                    );


                const maxPlayers =
                    Math.max(
                        1,
                        Number(tournament.maxPlayers) || 32
                    );


                if (
                    currentCount >=
                    maxPlayers
                ) {

                    return res.status(409).json({
                        success: false,
                        message:
                            "Player registration limit is already full."
                    });

                }

            }


            db.prepare(`
                UPDATE team_player_registrations
                SET status = ?
                WHERE id = ?
            `).run(
                requestedStatus,
                registrationId
            );


            res.json({
                success: true,
                message:
                    `Player registration ${requestedStatus.toLowerCase()} successfully!`
            });

        } catch (error) {

            console.error(
                "Team player status update error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to update player registration.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// ADMIN - DELETE CAPTAIN REGISTRATION
// ======================================================

app.delete(
    "/api/team-registrations/captain/:id",
    requireAdmin,
    (req, res) => {

        try {

            const registrationId =
                Number(req.params.id);


            const registration =
                db.prepare(`
                    SELECT
                        id,
                        captainName
                    FROM team_registrations
                    WHERE id = ?
                `)
                .get(registrationId);


            if (!registration) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Captain registration not found."
                });

            }


            db.prepare(`
                DELETE FROM team_players
                WHERE teamRegistrationId = ?
            `).run(registrationId);


            db.prepare(`
                DELETE FROM team_registrations
                WHERE id = ?
            `).run(registrationId);


            res.json({
                success: true,
                message:
                    `${registration.captainName} captain registration deleted successfully!`
            });

        } catch (error) {

            console.error(
                "Captain registration DELETE error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to delete captain registration.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// ADMIN - DELETE PLAYER REGISTRATION
// ======================================================

app.delete(
    "/api/team-registrations/player/:id",
    requireAdmin,
    (req, res) => {

        try {

            const registrationId =
                Number(req.params.id);


            const registration =
                db.prepare(`
                    SELECT
                        id,
                        playerName
                    FROM team_player_registrations
                    WHERE id = ?
                `)
                .get(registrationId);


            if (!registration) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Player registration not found."
                });

            }


            db.prepare(`
                DELETE FROM team_player_registrations
                WHERE id = ?
            `).run(registrationId);


            res.json({
                success: true,
                message:
                    `${registration.playerName} player registration deleted successfully!`
            });

        } catch (error) {

            console.error(
                "Player registration DELETE error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to delete player registration.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// INDIVIDUAL REGISTRATION ADMIN STATUS
// ======================================================

app.put(
    "/api/registrations/:id/status",
    requireAdmin,
    (req, res) => {

        try {

            const registrationId =
                Number(req.params.id);


            const requestedStatus =
                String(
                    req.body?.status || ""
                )
                    .trim()
                    .toUpperCase();


            const allowedStatuses = [
                "PENDING",
                "APPROVED",
                "REJECTED"
            ];


            if (
                !allowedStatuses.includes(
                    requestedStatus
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid registration status."
                });

            }


            const registration =
                db.prepare(`
                    SELECT
                        id,
                        tournamentId,
                        status
                    FROM registrations
                    WHERE id = ?
                `)
                .get(registrationId);


            if (!registration) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Registration not found."
                });

            }


            const tournament =
                db.prepare(`
                    SELECT
                        id,
                        maxPlayers
                    FROM tournaments
                    WHERE id = ?
                `)
                .get(
                    registration.tournamentId
                );


            if (!tournament) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Tournament not found."
                });

            }


            if (
                requestedStatus === "APPROVED" &&
                registration.status !== "APPROVED"
            ) {

                const approvedCount =
                    db.prepare(`
                        SELECT COUNT(*) AS count
                        FROM registrations
                        WHERE tournamentId = ?
                        AND status IN ('PENDING', 'APPROVED')
                        AND id != ?
                    `)
                    .get(
                        registration.tournamentId,
                        registrationId
                    );


                const currentCount =
                    Number(
                        approvedCount?.count || 0
                    );


                const maxPlayers =
                    Math.max(
                        1,
                        Number(tournament.maxPlayers) || 32
                    );


                if (currentCount >= maxPlayers) {

                    return res.status(409).json({
                        success: false,
                        message:
                            "Tournament player limit is already full."
                    });

                }

            }


            db.prepare(`
                UPDATE registrations
                SET status = ?
                WHERE id = ?
            `).run(
                requestedStatus,
                registrationId
            );


            res.json({
                success: true,
                message:
                    `Registration ${requestedStatus.toLowerCase()} successfully!`
            });

        } catch (error) {

            console.error(
                "Registration status update error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to update registration.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// INDIVIDUAL REGISTRATION ADMIN DELETE
// ======================================================

app.delete(
    "/api/registrations/:id",
    requireAdmin,
    (req, res) => {

        try {

            const registrationId =
                Number(req.params.id);


            const registration =
                db.prepare(`
                    SELECT
                        id,
                        playerName
                    FROM registrations
                    WHERE id = ?
                `)
                .get(registrationId);


            if (!registration) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Registration not found."
                });

            }


            db.prepare(`
                DELETE FROM registrations
                WHERE id = ?
            `).run(registrationId);


            res.json({
                success: true,
                message:
                    `${registration.playerName} registration deleted successfully!`
            });

        } catch (error) {

            console.error(
                "Registration DELETE error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to delete registration.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// LEADERBOARD - ADD
// ADMIN ONLY
// ======================================================

app.post(
    "/api/leaderboard",
    requireAdmin,
    (req, res) => {

        try {

            const {
                tournamentId,
                playerName,
                matches,
                wins,
                nrr,
                position
            } = req.body;


            const numericTournamentId =
                Number(tournamentId);


            const numericMatches =
                Number(matches) || 0;


            const numericWins =
                Number(wins) || 0;


            const numericNRR =
                Number(nrr) || 0;


            const numericPosition =
                Number(position) || 0;


            if (
                !numericTournamentId ||
                !String(playerName || "").trim()
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Tournament ID and player name are required."
                });

            }


            const tournament =
                db.prepare(`
                    SELECT id
                    FROM tournaments
                    WHERE id = ?
                `)
                .get(numericTournamentId);


            if (!tournament) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Tournament not found."
                });

            }


            const points =
                numericWins * 2;


            db.prepare(`
                INSERT INTO leaderboard
                (
                    tournamentId,
                    playerName,
                    matches,
                    wins,
                    points,
                    nrr,
                    position
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                numericTournamentId,
                String(playerName).trim(),
                numericMatches,
                numericWins,
                points,
                numericNRR,
                numericPosition
            );


            res.json({
                success: true,
                message:
                    "Player added successfully!",
                points,
                nrr:
                    numericNRR
            });

        } catch (error) {

            console.error(
                "Add leaderboard player error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to add player.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// LEADERBOARD - UPDATE
// ADMIN ONLY
// ======================================================

app.put(
    "/api/leaderboard/:id",
    requireAdmin,
    (req, res) => {

        try {

            const playerId =
                Number(req.params.id);


            const {
                playerName,
                matches,
                wins,
                nrr,
                position
            } = req.body;


            const numericMatches =
                Number(matches) || 0;


            const numericWins =
                Number(wins) || 0;


            const numericNRR =
                Number(nrr) || 0;


            const numericPosition =
                Number(position) || 0;


            const points =
                numericWins * 2;


            const existingPlayer =
                db.prepare(`
                    SELECT id
                    FROM leaderboard
                    WHERE id = ?
                `)
                .get(playerId);


            if (!existingPlayer) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Leaderboard player not found."
                });

            }


            db.prepare(`
                UPDATE leaderboard
                SET
                    playerName = ?,
                    matches = ?,
                    wins = ?,
                    points = ?,
                    nrr = ?,
                    position = ?
                WHERE id = ?
            `).run(
                String(playerName || "").trim(),
                numericMatches,
                numericWins,
                points,
                numericNRR,
                numericPosition,
                playerId
            );


            res.json({
                success: true,
                message:
                    "Leaderboard updated successfully!"
            });

        } catch (error) {

            console.error(
                "Leaderboard UPDATE error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to update leaderboard.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// LEADERBOARD - GET ALL
// ======================================================

app.get(
    "/api/leaderboard",
    (req, res) => {

        try {

            const players =
                db.prepare(`
                    SELECT
                        leaderboard.id,
                        leaderboard.tournamentId,
                        leaderboard.playerName,
                        leaderboard.matches,
                        leaderboard.wins,
                        leaderboard.points,
                        leaderboard.nrr,
                        leaderboard.position,
                        tournaments.name AS tournamentName,
                        tournaments.season AS tournamentSeason
                    FROM leaderboard
                    LEFT JOIN tournaments
                        ON leaderboard.tournamentId =
                           tournaments.id
                    ORDER BY
                        leaderboard.tournamentId ASC,
                        leaderboard.position ASC,
                        leaderboard.points DESC,
                        leaderboard.nrr DESC,
                        leaderboard.wins DESC,
                        leaderboard.matches DESC,
                        leaderboard.id ASC
                `).all();


            res.json({
                success: true,
                players
            });

        } catch (error) {

            console.error(
                "Leaderboard GET error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to load leaderboard.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// LEADERBOARD - DELETE
// ADMIN ONLY
// ======================================================

app.delete(
    "/api/leaderboard/:id",
    requireAdmin,
    (req, res) => {

        try {

            const playerId =
                Number(req.params.id);


            const existingPlayer =
                db.prepare(`
                    SELECT
                        id,
                        playerName
                    FROM leaderboard
                    WHERE id = ?
                `)
                .get(playerId);


            if (!existingPlayer) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Leaderboard player not found."
                });

            }


            db.prepare(`
                DELETE FROM leaderboard
                WHERE id = ?
            `).run(playerId);


            res.json({
                success: true,
                message:
                    `${existingPlayer.playerName} deleted successfully!`
            });

        } catch (error) {

            console.error(
                "Leaderboard DELETE error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to delete leaderboard player.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// YOUTUBE - GET CHANNEL
// ======================================================

async function getYouTubeChannel() {

    if (
        youtubeChannelId &&
        youtubeUploadsPlaylistId
    ) {

        return {
            channelId:
                youtubeChannelId,
            uploadsPlaylistId:
                youtubeUploadsPlaylistId
        };

    }


    if (!YOUTUBE_API_KEY) {

        throw new Error(
            "YouTube API key is not configured."
        );

    }


    const url =
        "https://www.googleapis.com/youtube/v3/channels" +
        "?part=contentDetails" +
        "&forHandle=" +
        encodeURIComponent(
            YOUTUBE_HANDLE
        ) +
        "&key=" +
        encodeURIComponent(
            YOUTUBE_API_KEY
        );


    const response =
        await fetch(url);


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.error?.message ||
            "YouTube API error."
        );

    }


    if (
        !data.items ||
        data.items.length === 0
    ) {

        throw new Error(
            "Cruzeo Playz YouTube channel was not found."
        );

    }


    youtubeChannelId =
        data.items[0].id;


    youtubeUploadsPlaylistId =
        data.items[0]
            .contentDetails
            .relatedPlaylists
            .uploads;


    return {
        channelId:
            youtubeChannelId,
        uploadsPlaylistId:
            youtubeUploadsPlaylistId
    };

}


// ======================================================
// YOUTUBE - LATEST VIDEOS
// ======================================================

app.get(
    "/api/youtube/videos",
    async (req, res) => {

        try {

            const channel =
                await getYouTubeChannel();


            const url =
                "https://www.googleapis.com/youtube/v3/playlistItems" +
                "?part=snippet,contentDetails" +
                "&playlistId=" +
                encodeURIComponent(
                    channel.uploadsPlaylistId
                ) +
                "&maxResults=6" +
                "&key=" +
                encodeURIComponent(
                    YOUTUBE_API_KEY
                );


            const response =
                await fetch(url);


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error?.message ||
                    "YouTube videos request failed."
                );

            }


            const videos =
                (data.items || [])
                    .map(item => {

                        const videoId =
                            item.contentDetails?.videoId;


                        return {

                            id:
                                videoId,

                            title:
                                item.snippet?.title ||
                                "Untitled Video",

                            thumbnail:
                                item.snippet?.thumbnails?.high?.url ||
                                item.snippet?.thumbnails?.medium?.url ||
                                item.snippet?.thumbnails?.default?.url ||
                                "",

                            publishedAt:
                                item.snippet?.publishedAt ||
                                "",

                            url:
                                `https://www.youtube.com/watch?v=${videoId}`

                        };

                    })
                    .filter(
                        video => video.id
                    );


            res.json({
                success: true,
                videos
            });

        } catch (error) {

            console.error(
                "YouTube videos error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to load YouTube videos.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// YOUTUBE - SEARCH
// ======================================================

app.get(
    "/api/youtube/search",
    async (req, res) => {

        try {

            const query =
                String(
                    req.query.q || ""
                ).trim();


            if (!query) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Search query is required."
                });

            }


            const channel =
                await getYouTubeChannel();


            const url =
                "https://www.googleapis.com/youtube/v3/search" +
                "?part=snippet" +
                "&type=video" +
                "&channelId=" +
                encodeURIComponent(
                    channel.channelId
                ) +
                "&q=" +
                encodeURIComponent(
                    query
                ) +
                "&maxResults=12" +
                "&key=" +
                encodeURIComponent(
                    YOUTUBE_API_KEY
                );


            const response =
                await fetch(url);


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.error?.message ||
                    "YouTube search failed."
                );

            }


            const videos =
                (data.items || [])
                    .map(item => {

                        const videoId =
                            item.id?.videoId;


                        return {

                            id:
                                videoId,

                            title:
                                item.snippet?.title ||
                                "Untitled Video",

                            thumbnail:
                                item.snippet?.thumbnails?.high?.url ||
                                item.snippet?.thumbnails?.medium?.url ||
                                item.snippet?.thumbnails?.default?.url ||
                                "",

                            publishedAt:
                                item.snippet?.publishedAt ||
                                "",

                            url:
                                `https://www.youtube.com/watch?v=${videoId}`

                        };

                    })
                    .filter(
                        video => video.id
                    );


            res.json({
                success: true,
                videos
            });

        } catch (error) {

            console.error(
                "YouTube search error:",
                error.message
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to search YouTube.",
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// START SERVER
// ======================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Cruzeo Playz Backend running on http://localhost:${PORT}`
        );

    }
);