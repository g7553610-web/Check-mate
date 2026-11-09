/* ========================================= 
   CHECKMATE AI 
   AUTHENTICATION & HISTORY STORAGE 
========================================= */ 


const STORAGE_KEYS = { 
    USERS: "checkmate_users", 
    SESSION: "checkmate_session", 
    HISTORY_PREFIX: "checkmate_history_" 
}; 


function hashPassword(password) { 

    let hash = 0; 

    for (let i = 0; i < password.length; i++) { 
        const char = password.charCodeAt(i); 
        hash = ((hash << 5) - hash) + char; 
        hash |= 0; 
    } 

    return `h_${hash}_${password.length}`; 
} 


function getUsers() { 

    try { 
        const raw = localStorage.getItem(STORAGE_KEYS.USERS); 
        return raw ? JSON.parse(raw) : []; 
    } catch (err) { 
        console.error("Could not read users:", err); 
        return []; 
    } 
} 


function saveUsers(users) { 

    try { 
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)); 
        return true; 
    } catch (err) { 
        console.error("Could not save users:", err); 
        return false; 
    } 
} 


function findUserByEmail(email) { 

    const normalized = email.trim().toLowerCase(); 
    return getUsers().find(u => u.email === normalized) || null; 
} 


function getSession() { 

    try { 
        const raw = localStorage.getItem(STORAGE_KEYS.SESSION); 
        return raw ? JSON.parse(raw) : null; 
    } catch (err) { 
        console.error("Could not read session:", err); 
        return null; 
    } 
} 


function setSession(session) { 

    try { 
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session)); 
        return true; 
    } catch (err) { 
        console.error("Could not save session:", err); 
        return false; 
    } 
} 


function clearSession() { 
    localStorage.removeItem(STORAGE_KEYS.SESSION); 
} 


function isLoggedIn() { 
    return getSession() !== null; 
} 


function isGuest() { 
    const session = getSession(); 
    return session !== null && session.guest === true; 
} 


function signUp(name, email, password) { 

    const normalizedEmail = email.trim().toLowerCase(); 

    if (!normalizedEmail || !password || !name.trim()) { 
        return { ok: false, message: "Please fill in every field." }; 
    } 

    if (password.length < 6) { 
        return { ok: false, message: "Password must be at least 6 characters." }; 
    } 

    if (findUserByEmail(normalizedEmail)) { 
        return { ok: false, message: "An account with this email already exists." }; 
    } 

    const users = getUsers(); 

    const newUser = { 
        id: `user_${Date.now()}_${Math.floor(Math.random() * 10000)}`, 
        name: name.trim(), 
        email: normalizedEmail, 
        passwordHash: hashPassword(password), 
        createdAt: new Date().toISOString() 
    }; 

    users.push(newUser); 

    if (!saveUsers(users)) { 
        return { 
            ok: false, 
            message: "Could not create account. Storage may be full or disabled." 
        }; 
    } 

    setSession({ 
        userId: newUser.id, 
        name: newUser.name, 
        email: newUser.email, 
        guest: false 
    }); 

    return { ok: true, user: newUser }; 
} 


function logIn(email, password) { 

    const normalizedEmail = email.trim().toLowerCase(); 

    if (!normalizedEmail || !password) { 
        return { ok: false, message: "Please enter your email and password." }; 
    } 

    const user = findUserByEmail(normalizedEmail); 

    if (!user || user.passwordHash !== hashPassword(password)) { 
        return { ok: false, message: "Incorrect email or password." }; 
    } 

    setSession({ 
        userId: user.id, 
        name: user.name, 
        email: user.email, 
        guest: false 
    }); 

    return { ok: true, user }; 
} 


function continueAsGuest() { 

    const guestId = `guest_${Date.now()}`; 

    setSession({ 
        userId: guestId, 
        name: "Guest", 
        email: null, 
        guest: true 
    }); 
} 


function logOut() { 
    clearSession(); 
    window.location.reload(); 
} 


function historyKeyForCurrentUser() { 

    const session = getSession(); 
    if (!session) return null; 

    return `${STORAGE_KEYS.HISTORY_PREFIX}${session.userId}`; 
} 


function getHistory() { 

    const key = historyKeyForCurrentUser(); 
    if (!key) return []; 

    try { 
        const raw = localStorage.getItem(key); 
        return raw ? JSON.parse(raw) : []; 
    } catch (err) { 
        console.error("Could not read history:", err); 
        return []; 
    } 
} 


function saveHistoryEntry(entry) { 

    const key = historyKeyForCurrentUser(); 
    if (!key) return false; 

    const history = getHistory(); 

    const alreadySaved = history.some( 
        item => 
            item.white === entry.white && 
            item.black === entry.black && 
            item.endTime === entry.endTime 
    ); 

    if (alreadySaved) { 
        return { ok: true, duplicate: true }; 
    } 

    history.unshift(entry); 

    const trimmed = history.slice(0, 50); 

    try { 
        localStorage.setItem(key, JSON.stringify(trimmed)); 
        return { ok: true, duplicate: false }; 
    } catch (err) { 
        console.error("Could not save history entry:", err); 
        return { ok: false, message: "Could not save. Local storage may be full." }; 
    } 
} 


function deleteHistoryEntry(entryId) { 

    const key = historyKeyForCurrentUser(); 
    if (!key) return false; 

    const history = getHistory().filter(item => item.id !== entryId); 

    try { 
        localStorage.setItem(key, JSON.stringify(history)); 
        return true; 
    } catch (err) { 
        console.error("Could not delete history entry:", err); 
        return false; 
    } 
} 


document.addEventListener("DOMContentLoaded", () => { 

    const overlay = document.getElementById("auth-overlay"); 
    const loginForm = document.getElementById("login-form"); 
    const signupForm = document.getElementById("signup-form"); 
    const loginError = document.getElementById("login-error"); 
    const signupError = document.getElementById("signup-error"); 
    const guestBtn = document.getElementById("guest-btn"); 
    const logoutBtn = document.getElementById("logout-btn"); 
    const navUsername = document.getElementById("nav-username"); 
    const tabs = document.querySelectorAll(".auth-tab"); 


    function refreshAuthUI() { 

        const session = getSession(); 

        if (session) { 

            overlay.classList.add("hidden"); 
            document.body.classList.remove("auth-locked"); 

            navUsername.textContent = session.guest 
                ? "Guest" 
                : session.name; 

            logoutBtn.classList.remove("hidden"); 

        } else { 

            overlay.classList.remove("hidden"); 
            document.body.classList.add("auth-locked"); 

            navUsername.textContent = "Guest"; 
            logoutBtn.classList.add("hidden"); 

        } 
    } 


    refreshAuthUI(); 


    tabs.forEach(tab => { 

        tab.addEventListener("click", () => { 

            tabs.forEach(t => t.classList.remove("active")); 
            tab.classList.add("active"); 

            const target = tab.dataset.tab; 

            if (target === "login") { 
                loginForm.classList.remove("hidden"); 
                signupForm.classList.add("hidden"); 
            } else { 
                signupForm.classList.remove("hidden"); 
                loginForm.classList.add("hidden"); 
            } 

            loginError.textContent = ""; 
            signupError.textContent = ""; 
        }); 
    }); 


    loginForm.addEventListener("submit", event => { 

        event.preventDefault(); 

        const email = document.getElementById("login-email").value; 
        const password = document.getElementById("login-password").value; 

        const result = logIn(email, password); 

        if (!result.ok) { 
            loginError.textContent = result.message; 
            return; 
        } 

        loginError.textContent = ""; 
        refreshAuthUI(); 

        if (typeof onAuthReady === "function") { 
            onAuthReady(); 
        } 
    }); 


    signupForm.addEventListener("submit", event => { 

        event.preventDefault(); 

        const name = document.getElementById("signup-name").value; 
        const email = document.getElementById("signup-email").value; 
        const password = document.getElementById("signup-password").value; 

        const result = signUp(name, email, password); 

        if (!result.ok) { 
            signupError.textContent = result.message; 
            return; 
        } 

        signupError.textContent = ""; 
        refreshAuthUI(); 

        if (typeof onAuthReady === "function") { 
            onAuthReady(); 
        } 
    }); 


    guestBtn.addEventListener("click", () => { 

        continueAsGuest(); 
        refreshAuthUI(); 

        if (typeof onAuthReady === "function") { 
            onAuthReady(); 
        } 
    }); 


    logoutBtn.addEventListener("click", () => { 
        logOut(); 
    }); 

});