const { DatabaseSync } = require("node:sqlite");
const path = require("path");


// ======================================================
// DATABASE INITIALIZATION
// ======================================================

function initializeDatabase(db) {

    // --------------------------------------------------
    // TABLES
    // --------------------------------------------------

    db.exec(`
        CREATE TABLE IF NOT EXISTS stats (
            id INTEGER PRIMARY KEY,
            matchesPlayed INTEGER,
            matchesWon INTEGER,
            winRate TEXT,
            runs TEXT,
            wickets INTEGER,
            centuries INTEGER,
            fifties INTEGER
        )
    `);


    db.exec(`
        CREATE TABLE IF NOT EXISTS tournaments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            season TEXT NOT NULL,
            status TEXT,
            champion TEXT,
            runnerUp TEXT,
            details TEXT,
            registrationOpen INTEGER DEFAULT 0,
            maxPlayers INTEGER DEFAULT 32,
            tournamentType TEXT DEFAULT 'INDIVIDUAL',
            playersPerTeam INTEGER DEFAULT 1,
            maxTeams INTEGER DEFAULT 16,
            maxCaptains INTEGER DEFAULT 16
        )
    `);


    db.exec(`
        CREATE TABLE IF NOT EXISTS leaderboard (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tournamentId INTEGER,
            playerName TEXT NOT NULL,
            matches INTEGER DEFAULT 0,
            wins INTEGER DEFAULT 0,
            points INTEGER DEFAULT 0,
            position INTEGER DEFAULT 0,
            nrr REAL DEFAULT 0,
            FOREIGN KEY (tournamentId)
                REFERENCES tournaments(id)
        )
    `);


    // --------------------------------------------------
    // TOURNAMENT COLUMNS
    // --------------------------------------------------

    const tournamentColumns =
        db.prepare(`
            PRAGMA table_info(tournaments)
        `).all();


    const hasRegistrationOpen =
        tournamentColumns.some(
            column =>
                column.name === "registrationOpen"
        );


    const hasMaxPlayers =
        tournamentColumns.some(
            column =>
                column.name === "maxPlayers"
        );


    const hasTournamentType =
        tournamentColumns.some(
            column =>
                column.name === "tournamentType"
        );


    const hasPlayersPerTeam =
        tournamentColumns.some(
            column =>
                column.name === "playersPerTeam"
        );


    const hasMaxTeams =
        tournamentColumns.some(
            column =>
                column.name === "maxTeams"
        );


    const hasMaxCaptains =
        tournamentColumns.some(
            column =>
                column.name === "maxCaptains"
        );


    if (!hasRegistrationOpen) {

        db.exec(`
            ALTER TABLE tournaments
            ADD COLUMN registrationOpen INTEGER DEFAULT 0
        `);

    }


    if (!hasMaxPlayers) {

        db.exec(`
            ALTER TABLE tournaments
            ADD COLUMN maxPlayers INTEGER DEFAULT 32
        `);

    }


    // --------------------------------------------------
    // TEAM TOURNAMENT COLUMNS
    // --------------------------------------------------

    if (!hasTournamentType) {

        db.exec(`
            ALTER TABLE tournaments
            ADD COLUMN tournamentType TEXT DEFAULT 'INDIVIDUAL'
        `);

    }


    if (!hasPlayersPerTeam) {

        db.exec(`
            ALTER TABLE tournaments
            ADD COLUMN playersPerTeam INTEGER DEFAULT 1
        `);

    }


    if (!hasMaxTeams) {

        db.exec(`
            ALTER TABLE tournaments
            ADD COLUMN maxTeams INTEGER DEFAULT 16
        `);

    }


    // --------------------------------------------------
    // CAPTAIN REGISTRATION LIMIT
    // --------------------------------------------------

    if (!hasMaxCaptains) {

        db.exec(`
            ALTER TABLE tournaments
            ADD COLUMN maxCaptains INTEGER DEFAULT 16
        `);

    }


    // --------------------------------------------------
    // INDIVIDUAL REGISTRATIONS TABLE
    // --------------------------------------------------

    db.exec(`
        CREATE TABLE IF NOT EXISTS registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            tournamentId INTEGER NOT NULL,

            playerName TEXT NOT NULL,

            gameUsername TEXT NOT NULL,

            discordUsername TEXT DEFAULT "",

            status TEXT DEFAULT "PENDING",

            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (tournamentId)
                REFERENCES tournaments(id)
        )
    `);


    // --------------------------------------------------
    // TEAM / CAPTAIN REGISTRATIONS TABLE
    // --------------------------------------------------

    db.exec(`
        CREATE TABLE IF NOT EXISTS team_registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            tournamentId INTEGER NOT NULL,

            teamName TEXT NOT NULL,

            captainName TEXT NOT NULL,

            captainGameUsername TEXT NOT NULL,

            discordUsername TEXT DEFAULT "",

            status TEXT DEFAULT "PENDING",

            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (tournamentId)
                REFERENCES tournaments(id)
        )
    `);


    // --------------------------------------------------
    // INDEPENDENT TEAM PLAYER REGISTRATIONS
    // --------------------------------------------------
    // Used for "REGISTER AS PLAYER"
    //
    // This is separate from team_players because
    // players can register independently before being
    // assigned to a captain/team.
    // --------------------------------------------------

    db.exec(`
        CREATE TABLE IF NOT EXISTS team_player_registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            tournamentId INTEGER NOT NULL,

            playerName TEXT NOT NULL,

            gameUsername TEXT NOT NULL,

            discordUsername TEXT DEFAULT "",

            status TEXT DEFAULT "PENDING",

            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (tournamentId)
                REFERENCES tournaments(id)
        )
    `);


    // --------------------------------------------------
    // TEAM PLAYERS TABLE
    // --------------------------------------------------
    // Used for players actually assigned to a team.
    // --------------------------------------------------

    db.exec(`
        CREATE TABLE IF NOT EXISTS team_players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            teamRegistrationId INTEGER NOT NULL,

            playerName TEXT NOT NULL,

            gameUsername TEXT NOT NULL,

            playerNumber INTEGER NOT NULL,

            FOREIGN KEY (teamRegistrationId)
                REFERENCES team_registrations(id)
                ON DELETE CASCADE
        )
    `);


    // --------------------------------------------------
    // TEAM PLAYERS STATUS MIGRATION
    // --------------------------------------------------

    const teamPlayerColumns =
        db.prepare(`
            PRAGMA table_info(team_players)
        `).all();


    const hasTeamPlayerStatus =
        teamPlayerColumns.some(
            column =>
                column.name === "status"
        );


    const hasTeamPlayerCreatedAt =
        teamPlayerColumns.some(
            column =>
                column.name === "createdAt"
        );


    if (!hasTeamPlayerStatus) {

        db.exec(`
            ALTER TABLE team_players
            ADD COLUMN status TEXT DEFAULT 'PENDING'
        `);

    }


    if (!hasTeamPlayerCreatedAt) {

        db.exec(`
            ALTER TABLE team_players
            ADD COLUMN createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        `);

    }


    // --------------------------------------------------
    // DEFAULT STATS
    // --------------------------------------------------

    const statsCount =
        db.prepare(
            "SELECT COUNT(*) AS count FROM stats"
        ).get().count;


    if (statsCount === 0) {

        db.prepare(`
            INSERT INTO stats
            (
                id,
                matchesPlayed,
                matchesWon,
                winRate,
                runs,
                wickets,
                centuries,
                fifties
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            1,
            1519,
            1100,
            "72.41%",
            "10,000+",
            4034,
            179,
            1000
        );

    }


    // --------------------------------------------------
    // TOURNAMENT MIGRATION / CLEANUP
    // --------------------------------------------------

    const season1 =
        db.prepare(`
            SELECT *
            FROM tournaments
            WHERE id = 4
        `).get();


    const season2 =
        db.prepare(`
            SELECT *
            FROM tournaments
            WHERE id = 3
        `).get();


    const duplicateRows =
        db.prepare(`
            SELECT id
            FROM tournaments
            WHERE
                LOWER(TRIM(season)) IN (
                    'season 1',
                    '1',
                    'season 2',
                    '2'
                )
                AND id NOT IN (3, 4)
        `).all();


    const season1Players =
        db.prepare(`
            SELECT
                playerName,
                matches,
                wins,
                points,
                position
            FROM leaderboard
            WHERE tournamentId = 4
            ORDER BY position ASC, id ASC
        `).all();


    const season2PlayerCount =
        db.prepare(`
            SELECT COUNT(*) AS count
            FROM leaderboard
            WHERE tournamentId = 3
        `).get().count;


    const expectedPlayers = [
        {
            playerName: "Kailash",
            matches: 10,
            wins: 10,
            points: 20,
            position: 1
        },
        {
            playerName: "Neer",
            matches: 10,
            wins: 7,
            points: 14,
            position: 2
        },
        {
            playerName: "Pranay",
            matches: 9,
            wins: 7,
            points: 14,
            position: 3
        }
    ];


    const season1Correct =
        Boolean(season1) &&
        season1.name ===
            "Cruzeo Playz Premier League" &&
        season1.season === "Season 1" &&
        season1.status === "COMPLETED" &&
        season1.champion === "Kailash" &&
        season1.runnerUp === "Neer" &&
        season1.details ===
            "CPL Season 1 completed successfully.";


    const season2Correct =
        Boolean(season2) &&
        season2.name ===
            "Cruzeo Playz Premier League" &&
        season2.season === "Season 2" &&
        season2.status === "UPCOMING";


    const season1LeaderboardCorrect =
        season1Players.length === expectedPlayers.length &&
        season1Players.every((player, index) => {

            const expected = expectedPlayers[index];

            return (
                player.playerName === expected.playerName &&
                player.matches === expected.matches &&
                player.wins === expected.wins &&
                player.points === expected.points &&
                player.position === expected.position
            );

        });


    const repairNeeded =
        !season1Correct ||
        !season2Correct ||
        duplicateRows.length > 0 ||
        !season1LeaderboardCorrect ||
        season2PlayerCount !== 0;


    if (repairNeeded) {

        console.log(
            "Repairing Cruzeo Playz tournament data..."
        );


        db.exec("BEGIN TRANSACTION");

        try {

            // --------------------------------------------------
            // REMOVE OLD DUPLICATE SEASON DATA
            // --------------------------------------------------

            db.prepare(`
                DELETE FROM leaderboard
                WHERE tournamentId IN (
                    SELECT id
                    FROM tournaments
                    WHERE
                        LOWER(TRIM(season)) IN (
                            'season 1',
                            '1',
                            'season 2',
                            '2'
                        )
                        AND id NOT IN (3, 4)
                )
            `).run();


            db.prepare(`
                DELETE FROM tournaments
                WHERE
                    LOWER(TRIM(season)) IN (
                        'season 1',
                        '1',
                        'season 2',
                        '2'
                    )
                    AND id NOT IN (3, 4)
            `).run();


            // --------------------------------------------------
            // ENSURE SEASON 1 IS ID 4
            // --------------------------------------------------

            if (season1) {

                db.prepare(`
                    UPDATE tournaments
                    SET
                        name = ?,
                        season = ?,
                        status = ?,
                        champion = ?,
                        runnerUp = ?,
                        details = ?
                    WHERE id = 4
                `).run(
                    "Cruzeo Playz Premier League",
                    "Season 1",
                    "COMPLETED",
                    "Kailash",
                    "Neer",
                    "CPL Season 1 completed successfully."
                );

            } else {

                db.prepare(`
                    INSERT INTO tournaments
                    (
                        id,
                        name,
                        season,
                        status,
                        champion,
                        runnerUp,
                        details
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                    4,
                    "Cruzeo Playz Premier League",
                    "Season 1",
                    "COMPLETED",
                    "Kailash",
                    "Neer",
                    "CPL Season 1 completed successfully."
                );

            }


            // --------------------------------------------------
            // ENSURE SEASON 2 IS ID 3
            // --------------------------------------------------

            if (season2) {

                db.prepare(`
                    UPDATE tournaments
                    SET
                        name = ?,
                        season = ?,
                        status = ?,
                        champion = ?,
                        runnerUp = ?,
                        details = ?
                    WHERE id = 3
                `).run(
                    "Cruzeo Playz Premier League",
                    "Season 2",
                    "UPCOMING",
                    "",
                    "",
                    ""
                );

            } else {

                db.prepare(`
                    INSERT INTO tournaments
                    (
                        id,
                        name,
                        season,
                        status,
                        champion,
                        runnerUp,
                        details
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                    3,
                    "Cruzeo Playz Premier League",
                    "Season 2",
                    "UPCOMING",
                    "",
                    "",
                    ""
                );

            }


            // --------------------------------------------------
            // REBUILD SEASON 1 LEADERBOARD
            // --------------------------------------------------

            db.prepare(`
                DELETE FROM leaderboard
                WHERE tournamentId IN (3, 4)
            `).run();


            const insertPlayer =
                db.prepare(`
                    INSERT INTO leaderboard
                    (
                        tournamentId,
                        playerName,
                        matches,
                        wins,
                        points,
                        position
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                `);


            insertPlayer.run(
                4,
                "Kailash",
                10,
                10,
                20,
                1
            );


            insertPlayer.run(
                4,
                "Neer",
                10,
                7,
                14,
                2
            );


            insertPlayer.run(
                4,
                "Pranay",
                9,
                7,
                14,
                3
            );


            db.exec("COMMIT");


            console.log(
                "Tournament data repaired successfully."
            );

        } catch (error) {

            db.exec("ROLLBACK");
            throw error;

        }

    } else {

        console.log(
            "Tournament database already correct."
        );

    }


    // --------------------------------------------------
    // DEFAULT REGISTRATION SETTINGS
    // --------------------------------------------------

    db.prepare(`
        UPDATE tournaments
        SET
            registrationOpen = COALESCE(
                registrationOpen,
                0
            ),

            maxPlayers = CASE
                WHEN maxPlayers IS NULL
                     OR maxPlayers <= 0
                THEN 32
                ELSE maxPlayers
            END,

            tournamentType = CASE
                WHEN tournamentType IS NULL
                     OR TRIM(tournamentType) = ''
                THEN 'INDIVIDUAL'
                ELSE UPPER(tournamentType)
            END,

            playersPerTeam = CASE
                WHEN playersPerTeam IS NULL
                     OR playersPerTeam <= 0
                THEN 1
                ELSE playersPerTeam
            END,

            maxTeams = CASE
                WHEN maxTeams IS NULL
                     OR maxTeams <= 0
                THEN 16
                ELSE maxTeams
            END,

            maxCaptains = CASE
                WHEN maxCaptains IS NULL
                     OR maxCaptains <= 0
                THEN 16
                ELSE maxCaptains
            END
    `).run();


    // --------------------------------------------------
    // PREVENT DUPLICATE SEASON NAMES
    // --------------------------------------------------

    db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS
        idx_tournaments_season_unique
        ON tournaments(season COLLATE NOCASE)
    `);


    // --------------------------------------------------
    // DATABASE READY
    // --------------------------------------------------

    console.log(
        "Cruzeo Playz Database is Ready!"
    );

}


// ======================================================
// EXPORT
// ======================================================

module.exports = {
    initializeDatabase
};


// ======================================================
// ALLOW DATABASE.JS TO RUN DIRECTLY
// ======================================================

if (require.main === module) {

    const db = new DatabaseSync(
        path.join(__dirname, "cruzeo.db")
    );

    try {

        initializeDatabase(db);

    } finally {

        db.close();

    }

}