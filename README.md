# Web Security Lab

An interactive lab that demonstrates four common web vulnerabilities. Each one has a **vulnerable version** you can attack and a **secure version** that blocks the same attack. Built with plain HTML, CSS and JavaScript. No libraries, no server.

**Live demo:** https://fevenadane586-design.github.io/web-security-lab/

## Modules

| # | Vulnerability | Attack shown | Fix shown | OWASP Top 10 (2021) |
|---|---|---|---|---|
| 1 | Cross-Site Scripting | Script injected through a comment box | Insert input as text, not HTML | A03 Injection |
| 2 | SQL Injection (simulated) | Login bypass with `' OR '1'='1` | Parameterized queries | A03 Injection |
| 3 | Insecure password storage | Cracking stolen passwords with a wordlist | Salted PBKDF2 hashing | A02 Cryptographic Failures |
| 4 | Brute force | Wordlist attack on a login | Lockout after 5 failed attempts | A07 Identification and Authentication Failures |

## How it works

- **XSS:** the vulnerable version uses `innerHTML`, so an injected `<img onerror=...>` tag runs code. The secure version uses `textContent`, so the same input is displayed as harmless text.
- **SQL injection:** a simplified simulation builds the query string the way a vulnerable app would, then compares it with a parameterized version where input is passed separately as data. It uses fake in-memory data, not a real database.
- **Password storage:** compares plain text, unsalted SHA-256 and salted PBKDF2 (100,000 iterations) using the Web Crypto API, then runs a small wordlist attack against each.
- **Brute force:** simulates a wordlist attack against an account with and without lockout.

## What I learned

- How injection flaws happen when data and code are mixed
- Why output encoding and parameterized queries are the real fixes
- The difference between plain text, fast hashes and slow salted hashes
- Why defenses are layered: lockouts, rate limits, MFA and strong passwords
- How to map vulnerabilities to the OWASP Top 10

## Limitations

- The SQL injection module is a simulation that recognizes common patterns, not a real database.
- The lockout is simulated, and real systems should also use rate limiting and MFA.
- Educational use only. Never test these techniques on systems you do not own or have permission to test.

## Future improvements

- Add a CSRF module
- Add an insecure direct object reference (IDOR) module
- Add a Content Security Policy demo

## License

MIT
