const $ = function (id) { return document.getElementById(id); };
const enc = new TextEncoder();

function hex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(function (b) { return b.toString(16).padStart(2, "0"); })
    .join("");
}

function setResult(el, text, good) {
  el.textContent = text;
  el.className = "result " + (good ? "good" : "bad");
}

// ---------- Tabs ----------
document.querySelectorAll(".tabs button").forEach(function (btn) {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".tabs button").forEach(function (b) { b.classList.remove("active"); });
    document.querySelectorAll(".module").forEach(function (s) { s.classList.remove("active"); });
    btn.classList.add("active");
    $(btn.dataset.tab).classList.add("active");
  });
});

// ---------- Module 1: XSS ----------
const xssPayload = '<img src=x onerror="document.getElementById(\'xss-banner\').style.display=\'block\'">';

$("xss-example").addEventListener("click", function () {
  $("xss-input").value = xssPayload;
});

$("xss-post").addEventListener("click", function () {
  const comment = $("xss-input").value;
  $("xss-banner").style.display = "none";
  $("xss-vuln").innerHTML = comment;      // VULNERABLE: input is parsed as HTML
  $("xss-secure").textContent = comment;  // SECURE: input is shown as plain text
});

// ---------- Module 2: SQL injection (simulation) ----------
const users = [
  { username: "admin", password: "Sup3rS3cret!" },
  { username: "feven", password: "hunter2" }
];

function simulateVulnerableQuery(u, p) {
  const tautology = /'\s*or\s+'?(\w+)'?\s*=\s*'?\1/i;
  const comment = /^([^']*)'\s*(--|#)/;

  if (tautology.test(u) || tautology.test(p)) return users[0];

  const c = u.match(comment);
  if (c) {
    return users.find(function (x) { return x.username === c[1]; }) || null;
  }
  return users.find(function (x) { return x.username === u && x.password === p; }) || null;
}

$("sqli-example").addEventListener("click", function () {
  $("sqli-user").value = "admin' --";
  $("sqli-pass").value = "anything";
});

$("sqli-run").addEventListener("click", function () {
  const u = $("sqli-user").value;
  const p = $("sqli-pass").value;

  // Vulnerable: input is concatenated into the query
  const query = "SELECT * FROM users WHERE username = '" + u + "' AND password = '" + p + "'";
  $("sqli-vq").textContent = query;
  const hit = simulateVulnerableQuery(u, p);
  const injected = u.indexOf("'") !== -1 || p.indexOf("'") !== -1;
  if (hit && injected) {
    setResult($("sqli-vr"), "ATTACK SUCCEEDED: logged in as " + hit.username + " without the password.", false);
  } else if (hit) {
    setResult($("sqli-vr"), "Normal login as " + hit.username + ".", true);
  } else {
    setResult($("sqli-vr"), "Login failed.", true);
  }

  // Secure: parameterized query, input is only ever data
  $("sqli-sq").textContent =
    "SELECT * FROM users WHERE username = ? AND password = ?\nparameters: " + JSON.stringify([u, p]);
  const safeHit = users.find(function (x) { return x.username === u && x.password === p; });
  if (safeHit) {
    setResult($("sqli-sr"), "Normal login as " + safeHit.username + ".", true);
  } else if (injected) {
    setResult($("sqli-sr"), "Attack blocked: the input was treated as plain data.", true);
  } else {
    setResult($("sqli-sr"), "Login failed.", true);
  }
});

// ---------- Module 3: Password storage ----------
const wordlist = ["123456", "password", "qwerty", "letmein", "welcome", "hunter2", "Summer2024", "iloveyou", "admin123", "password123"];
let record = null;

async function sha256(text) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(text)));
}

async function pbkdf2(password, salt) {
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
    base, 256
  );
  return hex(bits);
}

$("st-register").addEventListener("click", async function () {
  const password = $("st-pass").value;
  if (!password) return;

  const salt = crypto.getRandomValues(new Uint8Array(16));
  record = {
    password: password,
    unsalted: await sha256(password),
    salt: salt,
    salted: await pbkdf2(password, salt)
  };

  $("st-plain").textContent = "password: " + record.password;
  $("st-unsalted").textContent = "hash: " + record.unsalted;
  $("st-salted").textContent = "salt: " + hex(salt) + "\nhash: " + record.salted;
  ["st-plain-r", "st-unsalted-r", "st-salted-r"].forEach(function (id) {
    $(id).textContent = "";
  });
});

$("st-attack").addEventListener("click", async function () {
  if (!record) {
    setResult($("st-plain-r"), "Store a password first.", false);
    return;
  }

  // Plain text: the attacker just reads it
  setResult($("st-plain-r"), "Cracked instantly: " + record.password, false);

  // Unsalted SHA-256: hash every word and compare
  let start = performance.now();
  let found = null;
  for (const word of wordlist) {
    if (await sha256(word) === record.unsalted) { found = word; break; }
  }
  let ms = Math.round(performance.now() - start);
  if (found) {
    setResult($("st-unsalted-r"), "Cracked: " + found + " (" + ms + " ms)", false);
  } else {
    setResult($("st-unsalted-r"), "Not in wordlist (" + ms + " ms)", true);
  }

  // Salted PBKDF2: the attacker must run the slow function for every guess
  start = performance.now();
  found = null;
  for (const word of wordlist) {
    if (await pbkdf2(word, record.salt) === record.salted) { found = word; break; }
  }
  ms = Math.round(performance.now() - start);
  if (found) {
    setResult($("st-salted-r"), "Cracked: " + found + " (" + ms + " ms). Weak passwords fall to any method.", false);
  } else {
    setResult($("st-salted-r"), "Not cracked (" + ms + " ms for just 10 guesses)", true);
  }
});

// ---------- Module 4: Brute force ----------
const TARGET = "Summer2024";
const guesses = ["123456", "password", "qwerty", "letmein", "welcome", "admin123", "iloveyou", "monkey", "Summer2024", "dragon", "football", "abc123"];

$("bf-run").addEventListener("click", function () {
  // No protection: the attacker keeps guessing until it works
  const vlog = [];
  let cracked = false;
  for (let i = 0; i < guesses.length && !cracked; i++) {
    const ok = guesses[i] === TARGET;
    vlog.push("Attempt " + (i + 1) + ": " + guesses[i] + " -> " + (ok ? "SUCCESS" : "wrong"));
    if (ok) cracked = true;
  }
  $("bf-vlog").textContent = vlog.join("\n");
  setResult($("bf-vr"), cracked ? "Password cracked in " + vlog.length + " attempts." : "Not cracked.", !cracked);

  // Lockout: the account locks after 5 failures
  const slog = [];
  let fails = 0;
  let locked = false;
  let securedCracked = false;
  for (let i = 0; i < guesses.length; i++) {
    const ok = guesses[i] === TARGET;
    slog.push("Attempt " + (i + 1) + ": " + guesses[i] + " -> " + (ok ? "SUCCESS" : "wrong"));
    if (ok) { securedCracked = true; break; }
    fails++;
    if (fails >= 5) {
      locked = true;
      slog.push("ACCOUNT LOCKED after 5 failed attempts. The remaining " + (guesses.length - 5) + " guesses are blocked.");
      break;
    }
  }
  $("bf-slog").textContent = slog.join("\n");
  setResult(
    $("bf-sr"),
    securedCracked ? "Password cracked." : "Attack stopped. No password found.",
    !securedCracked
  );
});
