// ======================================================
// CRUZEO PLAYZ - MAIN SCRIPT
// Stats + Tournaments + Leaderboard + YouTube
// + Tournament Registration
// + Team Registration (Captain / Player)
// ======================================================

// Relative URL: works on localhost:3000 and after deployment
const API = "/api";


// ======================================================
// HELPERS
// ======================================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// Fetch JSON and ALWAYS surface the real backend error message
async function apiGet(path) {

    let response;

    try {

        response =
            await fetch(
                `${API}${path}`
            );

    } catch (networkError) {

        throw new Error(
            "Cannot reach backend. Run 'node server.js' and open http://localhost:3000"
        );

    }


    let data = null;

    try {

        data =
            await response.json();

    } catch (parseError) {

        throw new Error(
            `Server returned an invalid response (${response.status}). ` +
            "Open the site from http://localhost:3000"
        );

    }


    if (
        !response.ok ||
        data.success === false
    ) {

        throw new Error(
            data.message ||
            data.error ||
            `Request failed (${response.status})`
        );

    }


    return data;
}


// ======================================================
// MOBILE MENU
// ======================================================

const menuBtn =
    document.getElementById(
        "menuBtn"
    );

const navMenu =
    document.getElementById(
        "navMenu"
    );


if (
    menuBtn &&
    navMenu
) {

    menuBtn.addEventListener(
        "click",
        () => {

            navMenu.classList.toggle(
                "active"
            );

        }
    );


    navMenu
        .querySelectorAll("a")
        .forEach(
            link => {

                link.addEventListener(
                    "click",
                    () => {

                        navMenu.classList.remove(
                            "active"
                        );

                    }
                );

            }
        );

}


// ======================================================
// STATS
// ======================================================

async function loadStats() {

    try {

        const data =
            await apiGet(
                "/stats"
            );

        const stats =
            data.stats;


        if (!stats) {
            return;
        }


        const map = {

            matchesPlayed:
                stats.matchesPlayed,

            matchesWon:
                stats.matchesWon,

            winRate:
                stats.winRate

        };


        Object.keys(map)
            .forEach(
                id => {

                    const el =
                        document.getElementById(
                            id
                        );


                    if (
                        el &&
                        map[id] !== null &&
                        map[id] !== undefined
                    ) {

                        el.textContent =
                            map[id];

                    }

                }
            );


    } catch (error) {

        console.error(
            "Failed to load stats:",
            error.message
        );

        // Keep default numbers from index.html

    }

}


// ======================================================
// REGISTRATION ELEMENTS
// ======================================================

const registrationModal =
    document.getElementById(
        "registrationModal"
    );


const registrationForm =
    document.getElementById(
        "registrationForm"
    );


const registrationTournamentId =
    document.getElementById(
        "registrationTournamentId"
    );


const registrationTournamentName =
    document.getElementById(
        "registrationTournamentName"
    );


const registrationTournamentCount =
    document.getElementById(
        "registrationTournamentCount"
    );


const registrationPlayerName =
    document.getElementById(
        "registrationPlayerName"
    );


const registrationGameUsername =
    document.getElementById(
        "registrationGameUsername"
    );


const registrationDiscordUsername =
    document.getElementById(
        "registrationDiscordUsername"
    );


const registrationMessage =
    document.getElementById(
        "registrationMessage"
    );


const registrationSubmit =
    document.getElementById(
        "registrationSubmit"
    );


const closeRegistrationModal =
    document.getElementById(
        "closeRegistrationModal"
    );


// New team registration elements.
// These will work when the updated index.html
// contains them.

const registrationType =
    document.getElementById(
        "registrationType"
    );


const registrationRoleTitle =
    document.getElementById(
        "registrationRoleTitle"
    );


const registrationTeamName =
    document.getElementById(
        "registrationTeamName"
    );


const registrationTeamNameField =
    document.getElementById(
        "registrationTeamNameField"
    );


// ======================================================
// REGISTRATION MESSAGE
// ======================================================

function showRegistrationMessage(
    message,
    type = "info"
) {

    if (!registrationMessage) {
        return;
    }


    registrationMessage.textContent =
        message;


    registrationMessage.className =
        `registration-message ${type}`;

}


function clearRegistrationMessage() {

    if (!registrationMessage) {
        return;
    }


    registrationMessage.textContent =
        "";


    registrationMessage.className =
        "registration-message";

}


// ======================================================
// REGISTRATION HELPERS
// ======================================================

function isTeamTournament(
    tournament
) {

    return String(
        tournament?.tournamentType ||
        ""
    ).toUpperCase() === "TEAM";

}


function getRegistrationType() {

    if (
        registrationType &&
        registrationType.value
    ) {

        return String(
            registrationType.value
        ).toUpperCase();

    }


    return "INDIVIDUAL";

}


function setRegistrationType(
    type
) {

    const normalizedType =
        String(
            type || "INDIVIDUAL"
        ).toUpperCase();


    if (registrationType) {

        registrationType.value =
            normalizedType;

    }


    // ------------------------------------------
    // ROLE TITLE
    // ------------------------------------------

    if (registrationRoleTitle) {

        if (
            normalizedType === "CAPTAIN"
        ) {

            registrationRoleTitle.textContent =
                "REGISTER AS CAPTAIN";

        } else if (
            normalizedType === "PLAYER"
        ) {

            registrationRoleTitle.textContent =
                "REGISTER AS PLAYER";

        } else {

            registrationRoleTitle.textContent =
                "PLAYER REGISTRATION";

        }

    }


    // ------------------------------------------
    // TEAM NAME
    // ------------------------------------------

    if (registrationTeamNameField) {

        if (
            normalizedType === "CAPTAIN"
        ) {

            registrationTeamNameField.style.display =
                "";

        } else {

            registrationTeamNameField.style.display =
                "none";

        }

    }


    if (
        registrationTeamName &&
        normalizedType !== "CAPTAIN"
    ) {

        registrationTeamName.value =
            "";

    }

}


// ======================================================
// UPDATE REGISTRATION COUNT DISPLAY
// ======================================================

function updateRegistrationCountDisplay(
    tournament,
    type = "INDIVIDUAL"
) {

    if (!registrationTournamentCount) {
        return;
    }


    const normalizedType =
        String(
            type || "INDIVIDUAL"
        ).toUpperCase();


    // ------------------------------------------
    // TEAM CAPTAIN
    // ------------------------------------------

    if (
        normalizedType === "CAPTAIN"
    ) {

        const count =
            Number(
                tournament.captainRegistrationCount ??
                tournament.captainCount ??
                tournament.registrationCaptainCount ??
                0
            ) || 0;


        const max =
            Number(
                tournament.maxCaptains
            ) || 0;


        registrationTournamentCount.textContent =
            max > 0
                ? `${count} / ${max}`
                : `${count}`;

        return;

    }


    // ------------------------------------------
    // TEAM PLAYER
    // ------------------------------------------

    if (
        normalizedType === "PLAYER"
    ) {

        const count =
            Number(
                tournament.playerRegistrationCount ??
                tournament.playerCount ??
                tournament.registrationPlayerCount ??
                0
            ) || 0;


        const max =
            Number(
                tournament.maxPlayers
            ) || 0;


        registrationTournamentCount.textContent =
            max > 0
                ? `${count} / ${max}`
                : `${count}`;

        return;

    }


    // ------------------------------------------
    // INDIVIDUAL
    // ------------------------------------------

    const count =
        Number(
            tournament.registrationCount
        ) || 0;


    const max =
        Number(
            tournament.maxPlayers
        ) || 0;


    registrationTournamentCount.textContent =
        max > 0
            ? `${count} / ${max}`
            : `${count}`;

}


// ======================================================
// OPEN REGISTRATION MODAL
// ======================================================

function openRegistrationModal(
    tournament,
    type = "INDIVIDUAL"
) {

    if (!registrationModal) {

        console.error(
            "Registration modal not found in index.html"
        );

        return;

    }


    clearRegistrationMessage();


    // ------------------------------------------
    // TOURNAMENT ID
    // ------------------------------------------

    if (registrationTournamentId) {

        registrationTournamentId.value =
            tournament.id;

    }


    // ------------------------------------------
    // TOURNAMENT NAME
    // ------------------------------------------

    if (registrationTournamentName) {

        registrationTournamentName.textContent =
            `${tournament.name || "Tournament"} • ${
                tournament.season || ""
            }`;

    }


    // ------------------------------------------
    // REGISTRATION TYPE
    // ------------------------------------------

    setRegistrationType(
        type
    );


    // ------------------------------------------
    // REGISTRATION COUNT
    // ------------------------------------------

    updateRegistrationCountDisplay(
        tournament,
        type
    );


    // ------------------------------------------
    // CLEAR OLD INPUTS
    // ------------------------------------------

    if (registrationPlayerName) {

        registrationPlayerName.value =
            "";

    }


    if (registrationGameUsername) {

        registrationGameUsername.value =
            "";

    }


    if (registrationDiscordUsername) {

        registrationDiscordUsername.value =
            "";

    }


    if (registrationTeamName) {

        registrationTeamName.value =
            "";

    }


    // ------------------------------------------
    // ENABLE BUTTON
    // ------------------------------------------

    if (registrationSubmit) {

        registrationSubmit.disabled =
            false;


        if (
            String(type).toUpperCase() ===
            "CAPTAIN"
        ) {

            registrationSubmit.textContent =
                "REGISTER AS CAPTAIN";

        } else if (
            String(type).toUpperCase() ===
            "PLAYER"
        ) {

            registrationSubmit.textContent =
                "REGISTER AS PLAYER";

        } else {

            registrationSubmit.textContent =
                "REGISTER NOW";

        }

    }


    // ------------------------------------------
    // SHOW MODAL
    // ------------------------------------------

    registrationModal.classList.add(
        "active"
    );


    registrationModal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "registration-open"
    );


    // ------------------------------------------
    // FOCUS
    // ------------------------------------------

    setTimeout(
        () => {

            if (
                String(type).toUpperCase() ===
                "CAPTAIN" &&
                registrationTeamName
            ) {

                registrationTeamName.focus();

                return;

            }


            if (registrationPlayerName) {

                registrationPlayerName.focus();

            }

        },
        100
    );

}


// ======================================================
// CLOSE REGISTRATION MODAL
// ======================================================

function closeRegistration() {

    if (!registrationModal) {
        return;
    }


    registrationModal.classList.remove(
        "active"
    );


    registrationModal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.classList.remove(
        "registration-open"
    );


    clearRegistrationMessage();

}


if (closeRegistrationModal) {

    closeRegistrationModal.addEventListener(
        "click",
        closeRegistration
    );

}


// Close when clicking overlay
if (registrationModal) {

    registrationModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                registrationModal
            ) {

                closeRegistration();

            }

        }
    );

}


// Close with ESC
document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            registrationModal &&
            registrationModal.classList.contains(
                "active"
            )
        ) {

            closeRegistration();

        }

    }
);


// ======================================================
// SUBMIT REGISTRATION
// ======================================================

if (registrationForm) {

    registrationForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const tournamentId =
                registrationTournamentId
                    ? registrationTournamentId.value.trim()
                    : "";


            const playerName =
                registrationPlayerName
                    ? registrationPlayerName.value.trim()
                    : "";


            const gameUsername =
                registrationGameUsername
                    ? registrationGameUsername.value.trim()
                    : "";


            const discordUsername =
                registrationDiscordUsername
                    ? registrationDiscordUsername.value.trim()
                    : "";


            const teamName =
                registrationTeamName
                    ? registrationTeamName.value.trim()
                    : "";


            const type =
                getRegistrationType();


            // ------------------------------------------
            // FRONTEND VALIDATION
            // ------------------------------------------

            if (!tournamentId) {

                showRegistrationMessage(
                    "Tournament information is missing.",
                    "error"
                );

                return;

            }


            if (!playerName) {

                showRegistrationMessage(
                    "Please enter your name.",
                    "error"
                );


                if (registrationPlayerName) {

                    registrationPlayerName.focus();

                }


                return;

            }


            if (!gameUsername) {

                showRegistrationMessage(
                    "Please enter your Real Cricket username.",
                    "error"
                );


                if (registrationGameUsername) {

                    registrationGameUsername.focus();

                }


                return;

            }


            if (
                type === "CAPTAIN" &&
                !teamName
            ) {

                showRegistrationMessage(
                    "Please enter your team name.",
                    "error"
                );


                if (registrationTeamName) {

                    registrationTeamName.focus();

                }


                return;

            }


            // ------------------------------------------
            // DISABLE BUTTON
            // ------------------------------------------

            if (registrationSubmit) {

                registrationSubmit.disabled =
                    true;


                registrationSubmit.textContent =
                    "SUBMITTING...";

            }


            showRegistrationMessage(
                "Submitting your registration...",
                "info"
            );


            // ------------------------------------------
            // BUILD REQUEST
            // ------------------------------------------

            const payload = {

                tournamentId:
                    Number(
                        tournamentId
                    ),

                playerName:
                    playerName,

                gameUsername:
                    gameUsername,

                discordUsername:
                    discordUsername,

                registrationType:
                    type

            };


            // Captain needs team name
            if (
                type === "CAPTAIN"
            ) {

                payload.teamName =
                    teamName;

                payload.captainName =
                    playerName;

                payload.captainGameUsername =
                    gameUsername;

            }


            // ------------------------------------------
            // API REQUEST
            // ------------------------------------------

            try {

                const response =
                    await fetch(
                        `${API}/registrations`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );


                let data = null;


                try {

                    data =
                        await response.json();

                } catch (parseError) {

                    throw new Error(
                        "Server returned an invalid response."
                    );

                }


                if (
                    !response.ok ||
                    data.success === false
                ) {

                    throw new Error(
                        data.message ||
                        data.error ||
                        "Registration failed."
                    );

                }


                // --------------------------------------
                // SUCCESS
                // --------------------------------------

                let successMessage =
                    "Registration submitted successfully! Your registration is pending admin approval.";


                if (
                    type === "CAPTAIN"
                ) {

                    successMessage =
                        "Captain registration submitted successfully! Your registration is pending admin approval.";

                } else if (
                    type === "PLAYER"
                ) {

                    successMessage =
                        "Player registration submitted successfully! Your registration is pending admin approval.";

                }


                showRegistrationMessage(
                    successMessage,
                    "success"
                );


                if (registrationSubmit) {

                    registrationSubmit.textContent =
                        "REGISTERED ✓";

                }


                // Update count if backend returned it
                if (
                    registrationTournamentCount
                ) {

                    if (
                        type === "CAPTAIN" &&
                        data.captainRegistered !==
                            undefined &&
                        data.maxCaptains !==
                            undefined
                    ) {

                        registrationTournamentCount.textContent =
                            `${data.captainRegistered} / ${data.maxCaptains}`;

                    } else if (
                        type === "PLAYER" &&
                        data.playerRegistered !==
                            undefined &&
                        data.maxPlayers !==
                            undefined
                    ) {

                        registrationTournamentCount.textContent =
                            `${data.playerRegistered} / ${data.maxPlayers}`;

                    } else if (
                        type === "INDIVIDUAL" &&
                        data.registered !==
                            undefined &&
                        data.maxPlayers !==
                            undefined
                    ) {

                        registrationTournamentCount.textContent =
                            `${data.registered} / ${data.maxPlayers}`;

                    }

                }


                // --------------------------------------
                // RELOAD TOURNAMENTS
                // --------------------------------------

                setTimeout(
                    async () => {

                        closeRegistration();

                        await loadTournaments();

                    },
                    1800
                );


            } catch (error) {

                console.error(
                    "Registration failed:",
                    error.message
                );


                showRegistrationMessage(
                    error.message,
                    "error"
                );


                if (registrationSubmit) {

                    registrationSubmit.disabled =
                        false;


                    if (
                        type === "CAPTAIN"
                    ) {

                        registrationSubmit.textContent =
                            "REGISTER AS CAPTAIN";

                    } else if (
                        type === "PLAYER"
                    ) {

                        registrationSubmit.textContent =
                            "REGISTER AS PLAYER";

                    } else {

                        registrationSubmit.textContent =
                            "REGISTER NOW";

                    }

                }

            }

        }
    );

}


// ======================================================
// TOURNAMENT REGISTRATION BUTTON
// ======================================================

function createRegistrationPanel(
    tournament
) {

    const isTeam =
        isTeamTournament(
            tournament
        );


    // ==================================================
    // TEAM TOURNAMENT
    // ==================================================

    if (isTeam) {

        const captainCount =
            Number(
                tournament.captainRegistrationCount ??
                tournament.captainCount ??
                tournament.registrationCaptainCount ??
                0
            ) || 0;


        const playerCount =
            Number(
                tournament.playerRegistrationCount ??
                tournament.playerCount ??
                tournament.registrationPlayerCount ??
                0
            ) || 0;


        const maxCaptains =
            Number(
                tournament.maxCaptains
            ) || 0;


        const maxPlayers =
            Number(
                tournament.maxPlayers
            ) || 0;


        const registrationOpen =
            Number(
                tournament.registrationOpen
            ) === 1 ||
            tournament.registrationOpen === true;


        const captainFull =
            maxCaptains > 0 &&
            captainCount >= maxCaptains;


        const playerFull =
            maxPlayers > 0 &&
            playerCount >= maxPlayers;


        // ------------------------------------------
        // CAPTAIN STATUS
        // ------------------------------------------

        let captainHTML = "";


        if (!registrationOpen) {

            captainHTML = `
                <div class="team-registration-option closed">

                    <div class="team-registration-info">

                        <span>
                            CAPTAINS
                        </span>

                        <strong>
                            ${captainCount} / ${maxCaptains}
                        </strong>

                    </div>


                    <button
                        type="button"
                        class="registration-btn registration-closed"
                        disabled
                    >
                        REGISTRATION CLOSED
                    </button>

                </div>
            `;

        } else if (captainFull) {

            captainHTML = `
                <div class="team-registration-option full">

                    <div class="team-registration-info">

                        <span>
                            CAPTAINS
                        </span>

                        <strong>
                            ${captainCount} / ${maxCaptains}
                        </strong>

                    </div>


                    <button
                        type="button"
                        class="registration-btn registration-full"
                        disabled
                    >
                        CAPTAIN SLOTS FULL
                    </button>

                </div>
            `;

        } else {

            captainHTML = `
                <div class="team-registration-option open">

                    <div class="team-registration-info">

                        <span>
                            CAPTAINS
                        </span>

                        <strong>
                            ${captainCount} / ${maxCaptains}
                        </strong>

                    </div>


                    <button
                        type="button"
                        class="registration-btn registration-open team-register-btn"
                        data-registration-id="${escapeHTML(
                            tournament.id
                        )}"
                        data-registration-type="CAPTAIN"
                    >
                        REGISTER AS CAPTAIN
                        <span>→</span>
                    </button>

                </div>
            `;

        }


        // ------------------------------------------
        // PLAYER STATUS
        // ------------------------------------------

        let playerHTML = "";


        if (!registrationOpen) {

            playerHTML = `
                <div class="team-registration-option closed">

                    <div class="team-registration-info">

                        <span>
                            PLAYERS
                        </span>

                        <strong>
                            ${playerCount} / ${maxPlayers}
                        </strong>

                    </div>


                    <button
                        type="button"
                        class="registration-btn registration-closed"
                        disabled
                    >
                        REGISTRATION CLOSED
                    </button>

                </div>
            `;

        } else if (playerFull) {

            playerHTML = `
                <div class="team-registration-option full">

                    <div class="team-registration-info">

                        <span>
                            PLAYERS
                        </span>

                        <strong>
                            ${playerCount} / ${maxPlayers}
                        </strong>

                    </div>


                    <button
                        type="button"
                        class="registration-btn registration-full"
                        disabled
                    >
                        PLAYER SLOTS FULL
                    </button>

                </div>
            `;

        } else {

            playerHTML = `
                <div class="team-registration-option open">

                    <div class="team-registration-info">

                        <span>
                            PLAYERS
                        </span>

                        <strong>
                            ${playerCount} / ${maxPlayers}
                        </strong>

                    </div>


                    <button
                        type="button"
                        class="registration-btn registration-open team-register-btn"
                        data-registration-id="${escapeHTML(
                            tournament.id
                        )}"
                        data-registration-type="PLAYER"
                    >
                        REGISTER AS PLAYER
                        <span>→</span>
                    </button>

                </div>
            `;

        }


        return `
            <div class="registration-panel team-registration-panel">

                <div class="team-registration-heading">

                    <span>
                        TEAM REGISTRATION
                    </span>

                    <small>
                        Register separately as captain or player
                    </small>

                </div>


                <div class="team-registration-options">

                    ${captainHTML}

                    ${playerHTML}

                </div>

            </div>
        `;

    }


    // ==================================================
    // INDIVIDUAL TOURNAMENT
    // ==================================================

    const registrationOpen =
        Number(
            tournament.registrationOpen
        ) === 1 ||
        tournament.registrationOpen === true;


    const registered =
        Number(
            tournament.registrationCount
        ) || 0;


    const maxPlayers =
        Number(
            tournament.maxPlayers
        ) || 0;


    const isFull =
        maxPlayers > 0 &&
        registered >= maxPlayers;


    if (isFull) {

        return `
            <div class="registration-panel full">

                <div class="registration-panel-info">

                    <span>
                        REGISTRATION
                    </span>

                    <strong>
                        ${registered} / ${maxPlayers}
                    </strong>

                </div>


                <button
                    type="button"
                    class="registration-btn registration-full"
                    disabled
                >
                    REGISTRATION FULL
                </button>

            </div>
        `;

    }


    if (registrationOpen) {

        return `
            <div class="registration-panel open">

                <div class="registration-panel-info">

                    <span>
                        REGISTRATION
                    </span>

                    <strong>
                        ${registered} / ${maxPlayers}
                    </strong>

                </div>


                <button
                    type="button"
                    class="registration-btn registration-open"
                    data-registration-id="${escapeHTML(
                        tournament.id
                    )}"
                    data-registration-type="INDIVIDUAL"
                >
                    REGISTER NOW
                    <span>→</span>
                </button>

            </div>
        `;

    }


    return `
        <div class="registration-panel closed">

            <div class="registration-panel-info">

                <span>
                    REGISTRATION
                </span>

                <strong>
                    ${registered} / ${maxPlayers}
                </strong>

            </div>


            <button
                type="button"
                class="registration-btn registration-closed"
                disabled
            >
                REGISTRATION CLOSED
            </button>

        </div>
    `;

}


// ======================================================
// TOURNAMENTS
// ======================================================

async function loadTournaments() {

    const container =
        document.getElementById(
            "tournamentContainer"
        );


    if (!container) {
        return null;
    }


    try {

        const data =
            await apiGet(
                "/tournaments"
            );


        const tournaments =
            data.tournaments || [];


        container.innerHTML =
            "";


        if (
            tournaments.length === 0
        ) {

            container.innerHTML =
                `<div class="empty-state">
                    No tournaments available yet.
                </div>`;


            return null;

        }


        tournaments.forEach(
            tournament => {

                const card =
                    document.createElement(
                        "article"
                    );


                card.className =
                    "tournament-card";


                // --------------------------------------
                // REGISTRATION HTML
                // --------------------------------------

                const registrationHTML =
                    createRegistrationPanel(
                        tournament
                    );


                // --------------------------------------
                // TOURNAMENT CARD
                // --------------------------------------

                card.innerHTML = `
                    <div class="tournament-card-content">

                        <span class="tournament-status">
                            ${escapeHTML(
                                tournament.status ||
                                "UPCOMING"
                            )}
                        </span>


                        <h3>
                            ${escapeHTML(
                                tournament.name
                            )}
                        </h3>


                        <p class="season">
                            ${escapeHTML(
                                tournament.season
                            )}
                        </p>


                        <div class="winner-grid">

                            <div class="winner-card">

                                <span>
                                    CHAMPION
                                </span>

                                <strong>
                                    ${escapeHTML(
                                        tournament.champion ||
                                        "TBA"
                                    )}
                                </strong>

                            </div>


                            <div class="winner-card">

                                <span>
                                    RUNNER-UP
                                </span>

                                <strong>
                                    ${escapeHTML(
                                        tournament.runnerUp ||
                                        "TBA"
                                    )}
                                </strong>

                            </div>

                        </div>


                        <p class="tournament-details">
                            ${escapeHTML(
                                tournament.details ||
                                "Tournament details coming soon."
                            )}
                        </p>


                        ${registrationHTML}


                        <button
                            class="tournament-btn"
                            data-id="${escapeHTML(
                                tournament.id
                            )}"
                        >
                            VIEW LEADERBOARD →
                        </button>

                    </div>
                `;


                container.appendChild(
                    card
                );

            }
        );


        // ==================================================
        // VIEW LEADERBOARD BUTTONS
        // ==================================================

        container
            .querySelectorAll(
                ".tournament-btn"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        async () => {

                            await loadLeaderboard(
                                button.dataset.id
                            );


                            const section =
                                document.getElementById(
                                    "leaderboard"
                                );


                            if (section) {

                                section.scrollIntoView({
                                    behavior:
                                        "smooth"
                                });

                            }

                        }
                    );

                }
            );


        // ==================================================
        // REGISTRATION BUTTONS
        // ==================================================

        container
            .querySelectorAll(
                ".registration-open"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        async () => {

                            const id =
                                button.dataset
                                    .registrationId;


                            const type =
                                String(
                                    button.dataset
                                        .registrationType ||
                                    "INDIVIDUAL"
                                ).toUpperCase();


                            if (!id) {
                                return;
                            }


                            try {

                                // ----------------------------------
                                // GET LATEST TOURNAMENT DATA
                                // ----------------------------------

                                const data =
                                    await apiGet(
                                        `/tournaments/${encodeURIComponent(
                                            id
                                        )}`
                                    );


                                if (
                                    !data.tournament
                                ) {

                                    throw new Error(
                                        "Tournament not found."
                                    );

                                }


                                const tournament =
                                    data.tournament;


                                // ----------------------------------
                                // REGISTRATION COUNTS
                                // ----------------------------------

                                if (
                                    data.registrationCount !==
                                    undefined
                                ) {

                                    tournament.registrationCount =
                                        data.registrationCount;

                                }


                                if (
                                    data.captainRegistrationCount !==
                                    undefined
                                ) {

                                    tournament.captainRegistrationCount =
                                        data.captainRegistrationCount;

                                }


                                if (
                                    data.playerRegistrationCount !==
                                    undefined
                                ) {

                                    tournament.playerRegistrationCount =
                                        data.playerRegistrationCount;

                                }


                                // ----------------------------------
                                // CURRENT REGISTRATION STATUS
                                // ----------------------------------

                                const currentOpen =
                                    Number(
                                        tournament.registrationOpen
                                    ) === 1 ||
                                    tournament.registrationOpen === true;


                                if (!currentOpen) {

                                    alert(
                                        "Registration is currently closed."
                                    );


                                    await loadTournaments();

                                    return;

                                }


                                // ----------------------------------
                                // INDIVIDUAL CHECK
                                // ----------------------------------

                                if (
                                    type === "INDIVIDUAL"
                                ) {

                                    const currentCount =
                                        Number(
                                            tournament.registrationCount
                                        ) || 0;


                                    const currentMax =
                                        Number(
                                            tournament.maxPlayers
                                        ) || 0;


                                    if (
                                        currentMax > 0 &&
                                        currentCount >=
                                            currentMax
                                    ) {

                                        alert(
                                            "Registration is full."
                                        );


                                        await loadTournaments();

                                        return;

                                    }

                                }


                                // ----------------------------------
                                // CAPTAIN CHECK
                                // ----------------------------------

                                if (
                                    type === "CAPTAIN"
                                ) {

                                    const captainCount =
                                        Number(
                                            tournament.captainRegistrationCount ??
                                            tournament.captainCount ??
                                            0
                                        ) || 0;


                                    const maxCaptains =
                                        Number(
                                            tournament.maxCaptains
                                        ) || 0;


                                    if (
                                        maxCaptains > 0 &&
                                        captainCount >=
                                            maxCaptains
                                    ) {

                                        alert(
                                            "Captain registration is full."
                                        );


                                        await loadTournaments();

                                        return;

                                    }

                                }


                                // ----------------------------------
                                // PLAYER CHECK
                                // ----------------------------------

                                if (
                                    type === "PLAYER"
                                ) {

                                    const playerCount =
                                        Number(
                                            tournament.playerRegistrationCount ??
                                            tournament.playerCount ??
                                            0
                                        ) || 0;


                                    const maxPlayers =
                                        Number(
                                            tournament.maxPlayers
                                        ) || 0;


                                    if (
                                        maxPlayers > 0 &&
                                        playerCount >=
                                            maxPlayers
                                    ) {

                                        alert(
                                            "Player registration is full."
                                        );


                                        await loadTournaments();

                                        return;

                                    }

                                }


                                // ----------------------------------
                                // OPEN MODAL
                                // ----------------------------------

                                openRegistrationModal(
                                    tournament,
                                    type
                                );


                            } catch (error) {

                                console.error(
                                    "Unable to open registration:",
                                    error.message
                                );


                                alert(
                                    error.message
                                );

                            }

                        }
                    );

                }
            );


        return tournaments[0]?.id || null;


    } catch (error) {

        console.error(
            "Failed to load tournaments:",
            error.message
        );


        container.innerHTML =
            `<div class="empty-state">

                Unable to load tournaments.

                <br>

                <small>
                    ${escapeHTML(
                        error.message
                    )}
                </small>

            </div>`;


        return null;

    }

}


// ======================================================
// LEADERBOARD
// ======================================================

function showLeaderboardMessage(
    box,
    message
) {

    box.innerHTML =
        `<div class="empty-state">
            ${escapeHTML(message)}
        </div>`;

}


async function loadLeaderboard(
    tournamentId
) {

    const box =
        document.getElementById(
            "leaderboardBox"
        );


    if (!box) {
        return;
    }


    try {

        const data =
            await apiGet(
                `/tournaments/${encodeURIComponent(
                    tournamentId
                )}`
            );


        const tournament =
            data.tournament;


        let players =
            data.leaderboard || [];


        // ------------------------------------------
        // TOURNAMENT INFORMATION
        // ------------------------------------------

        const info =
            document.getElementById(
                "leaderboardTournamentInfo"
            );


        if (
            info &&
            tournament
        ) {

            info.textContent =
                `${tournament.name} • ${tournament.season}`;

        }


        // ------------------------------------------
        // NO PLAYERS
        // ------------------------------------------

        if (
            players.length === 0
        ) {

            showLeaderboardMessage(
                box,
                "No leaderboard data available for this tournament."
            );


            return;

        }


        // ------------------------------------------
        // SORT LEADERBOARD
        //
        // 1. Points - HIGHER
        // 2. NRR - HIGHER
        // 3. Wins - HIGHER
        // 4. Matches - HIGHER
        // ------------------------------------------

        players =
            [...players].sort(
                (a, b) => {

                    const pointsA =
                        Number(
                            a.points
                        ) || 0;


                    const pointsB =
                        Number(
                            b.points
                        ) || 0;


                    const nrrA =
                        Number(
                            a.nrr
                        ) || 0;


                    const nrrB =
                        Number(
                            b.nrr
                        ) || 0;


                    const winsA =
                        Number(
                            a.wins
                        ) || 0;


                    const winsB =
                        Number(
                            b.wins
                        ) || 0;


                    const matchesA =
                        Number(
                            a.matches
                        ) || 0;


                    const matchesB =
                        Number(
                            b.matches
                        ) || 0;


                    if (
                        pointsB !==
                        pointsA
                    ) {

                        return (
                            pointsB -
                            pointsA
                        );

                    }


                    if (
                        nrrB !==
                        nrrA
                    ) {

                        return (
                            nrrB -
                            nrrA
                        );

                    }


                    if (
                        winsB !==
                        winsA
                    ) {

                        return (
                            winsB -
                            winsA
                        );

                    }


                    if (
                        matchesB !==
                        matchesA
                    ) {

                        return (
                            matchesB -
                            matchesA
                        );

                    }


                    return 0;

                }
            );


        // ------------------------------------------
        // CREATE RANKS
        // ------------------------------------------

        const rows =
            players
                .map(
                    (player, index) => {

                        const rank =
                            index + 1;


                        const nrr =
                            Number(
                                player.nrr
                            ) || 0;


                        const formattedNRR =
                            nrr > 0
                                ? `+${nrr.toFixed(2)}`
                                : nrr.toFixed(2);


                        return `
                            <tr>

                                <td>
                                    #${rank}
                                </td>


                                <td>
                                    ${escapeHTML(
                                        player.playerName
                                    )}
                                </td>


                                <td>
                                    ${escapeHTML(
                                        player.matches ||
                                        0
                                    )}
                                </td>


                                <td>
                                    ${escapeHTML(
                                        player.wins ||
                                        0
                                    )}
                                </td>


                                <td>

                                    <strong>
                                        ${escapeHTML(
                                            formattedNRR
                                        )}
                                    </strong>

                                </td>


                                <td>

                                    <strong>
                                        ${escapeHTML(
                                            player.points ||
                                            0
                                        )}
                                    </strong>

                                </td>

                            </tr>
                        `;

                    }
                )
                .join("");


        // ------------------------------------------
        // RENDER TABLE
        // ------------------------------------------

        box.innerHTML = `
            <table>

                <thead>

                    <tr>

                        <th>RANK</th>
                        <th>PLAYER</th>
                        <th>MATCHES</th>
                        <th>WINS</th>
                        <th>NRR</th>
                        <th>POINTS</th>

                    </tr>

                </thead>


                <tbody>
                    ${rows}
                </tbody>

            </table>
        `;


    } catch (error) {

        console.error(
            "Failed to load leaderboard:",
            error.message
        );


        showLeaderboardMessage(
            box,
            `Unable to load leaderboard. ${error.message}`
        );

    }

}


// ======================================================
// YOUTUBE
// ======================================================

const videoGrid =
    document.getElementById(
        "videoGrid"
    );


function formatYouTubeDate(
    dateString
) {

    if (!dateString) {
        return "";
    }


    const date =
        new Date(
            dateString
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );

}


function showVideoMessage(
    title,
    text
) {

    if (!videoGrid) {
        return;
    }


    videoGrid.innerHTML = `
        <div class="youtube-empty">

            <h3>
                ${escapeHTML(title)}
            </h3>

            <p>
                ${escapeHTML(text)}
            </p>

        </div>
    `;

}


function renderYouTubeVideos(
    videos
) {

    if (!videoGrid) {
        return;
    }


    if (
        !videos ||
        videos.length === 0
    ) {

        showVideoMessage(
            "No videos found",
            "Try another search."
        );


        return;

    }


    videoGrid.innerHTML =
        "";


    videos.forEach(
        video => {

            const videoId =
                video.id;


            const title =
                video.title ||
                "Cruzeo Playz Video";


            const thumbnail =
                video.thumbnail ||
                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;


            const publishedAt =
                formatYouTubeDate(
                    video.publishedAt
                );


            const link =
                `https://www.youtube.com/watch?v=${encodeURIComponent(
                    videoId
                )}`;


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "video-card";


            card.innerHTML = `
                <a
                    href="${link}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="video-thumbnail"
                >

                    <img
                        src="${escapeHTML(
                            thumbnail
                        )}"
                        alt="${escapeHTML(
                            title
                        )}"
                        loading="lazy"
                    >


                    <span class="youtube-play">
                        ▶
                    </span>

                </a>


                <div class="video-info">

                    <span>
                        CRUZEO PLAYZ
                    </span>


                    <h3>
                        ${escapeHTML(
                            title
                        )}
                    </h3>


                    ${
                        publishedAt
                            ? `<p>${escapeHTML(
                                publishedAt
                            )}</p>`
                            : ""
                    }


                    <a
                        href="${link}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="watch-btn"
                    >
                        WATCH ON YOUTUBE
                    </a>

                </div>
            `;


            videoGrid.appendChild(
                card
            );

        }
    );

}


async function loadYouTubeVideos() {

    if (!videoGrid) {
        return;
    }


    videoGrid.innerHTML =
        `<div class="youtube-loading">
            Loading latest videos...
        </div>`;


    try {

        const data =
            await apiGet(
                "/youtube/videos"
            );


        if (
            !Array.isArray(
                data.videos
            )
        ) {

            throw new Error(
                "YouTube videos unavailable"
            );

        }


        renderYouTubeVideos(
            data.videos
        );


    } catch (error) {

        console.error(
            "Failed to load YouTube videos:",
            error.message
        );


        showVideoMessage(
            "YouTube videos couldn't load",
            error.message
        );

    }

}


async function searchYouTube() {

    const input =
        document.getElementById(
            "videoSearch"
        );


    if (
        !input ||
        !videoGrid
    ) {

        return;

    }


    const query =
        input.value.trim();


    if (!query) {

        loadYouTubeVideos();

        return;

    }


    videoGrid.innerHTML =
        `<div class="youtube-loading">
            Searching YouTube...
        </div>`;


    try {

        const data =
            await apiGet(
                `/youtube/search?q=${encodeURIComponent(
                    query
                )}`
            );


        if (
            !Array.isArray(
                data.videos
            )
        ) {

            throw new Error(
                "Search failed"
            );

        }


        renderYouTubeVideos(
            data.videos
        );


    } catch (error) {

        console.error(
            "YouTube search error:",
            error.message
        );


        showVideoMessage(
            "Search failed",
            error.message
        );

    }

}


const searchBtn =
    document.getElementById(
        "searchBtn"
    );


if (searchBtn) {

    searchBtn.addEventListener(
        "click",
        searchYouTube
    );

}


const videoSearch =
    document.getElementById(
        "videoSearch"
    );


if (videoSearch) {

    videoSearch.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                searchYouTube();

            }

        }
    );

}


// ======================================================
// REVEAL ANIMATION
// ======================================================

function activateRevealElements() {

    const elements =
        document.querySelectorAll(
            ".reveal:not(.reveal-ready)"
        );


    if (
        !("IntersectionObserver" in window)
    ) {

        return;

    }


    const observer =
        new IntersectionObserver(
            entries => {

                entries.forEach(
                    entry => {

                        if (
                            entry.isIntersecting
                        ) {

                            entry.target
                                .classList
                                .add(
                                    "active"
                                );


                            observer.unobserve(
                                entry.target
                            );

                        }

                    }
                );

            },
            {
                threshold: 0.08
            }
        );


    elements.forEach(
        element => {

            element.classList.add(
                "reveal-ready"
            );


            observer.observe(
                element
            );

        }
    );

}


// ======================================================
// ACTIVE NAVIGATION
// ======================================================

function setupActiveNavigation() {

    const links =
        document.querySelectorAll(
            "#navMenu a"
        );


    const sections = [];


    links.forEach(
        link => {

            const id =
                (
                    link.getAttribute(
                        "href"
                    ) || ""
                ).replace(
                    "#",
                    ""
                );


            const section =
                document.getElementById(
                    id
                );


            if (section) {

                sections.push({
                    link,
                    section
                });

            }

        }
    );


    function update() {

        const position =
            window.scrollY + 140;


        let current =
            sections[0];


        sections.forEach(
            item => {

                if (
                    item.section.offsetTop <=
                    position
                ) {

                    current =
                        item;

                }

            }
        );


        links.forEach(
            link =>
                link.classList.remove(
                    "active"
                )
        );


        if (current) {

            current.link.classList.add(
                "active"
            );

        }

    }


    window.addEventListener(
        "scroll",
        update,
        {
            passive: true
        }
    );


    update();

}


// ======================================================
// START
// ======================================================

let appInitialized =
    false;


async function init() {

    if (appInitialized) {
        return;
    }


    appInitialized =
        true;


    activateRevealElements();

    setupActiveNavigation();


    await Promise.allSettled([
        loadStats(),
        loadYouTubeVideos()
    ]);


    const latestTournamentId =
        await loadTournaments();


    if (latestTournamentId) {

        loadLeaderboard(
            latestTournamentId
        );

    } else {

        const box =
            document.getElementById(
                "leaderboardBox"
            );


        if (box) {

            showLeaderboardMessage(
                box,
                "No leaderboard data available yet."
            );

        }

    }

}


init();