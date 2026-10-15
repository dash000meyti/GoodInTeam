# Module: Password vault (zero-knowledge)

A personal, end-to-end encrypted store for passwords, server/database credentials, API keys,
SSH keys, `.env` files, cards and secure notes. Everything is encrypted **in the browser**; the
server only ever stores ciphertext and can't read any of it — not even with full database and
disk access.

## Files

```
src/lib/vault-crypto.ts (+ .test.ts)          Web Crypto primitives + high-level flows (isomorphic)
src/lib/totp.ts (+ .test.ts)                  RFC 4226/6238 HOTP/TOTP, otpauth:// parsing
src/server/modules/vault/{schemas,service,actions,tools}.ts
src/app/[locale]/panel/vault/{page,loading}.tsx
src/components/vault/
  vault-provider.tsx     in-memory session key + auto-lock (React context)
  vault-app.tsx          setup / unlock / workspace switch, list + filters, tabs
  setup-wizard.tsx       first run (explain → master password → recovery key)
  unlock-screen.tsx      master password, recovery-key flow, reset
  item-form.tsx          typed create/edit dialog (encrypts before sending)
  item-detail.tsx        drawer: reveal, copy (auto-clear), TOTP ring, open URL
  item-row.tsx           list row with quick copy
  vault-settings.tsx     change password, rotate recovery key, backup/restore, plain export, reset
  password-generator.tsx password/passphrase generator (+ popover for fields)
  generator.ts, strength.ts, wordlist.ts, formats.ts, item-types.ts (+ tests)
src/i18n/messages/{fa,en}/vault.ts
```

## Threat model

| Threat                                           | Outcome                                                                                                                                               |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB / backup / disk stolen                        | Attacker gets salts, wrapped keys, ciphertexts. Offline guessing costs PBKDF2-SHA256 × 600 000 per guess against the master password.                 |
| Server operator / admin / teammate               | Same as above. Every staff user has their own vault (`vault_keys.user_id`); no role can read another user's items — the owner included.               |
| API token / MCP agent (possibly prompt-injected) | Only `vault_status` exists: counts per type. No tool returns titles, ciphertexts or key material.                                                     |
| Network observer                                 | HTTPS + only ciphertext in transit. Web Crypto requires a secure context, so the vault refuses to run on plain HTTP (except `localhost`).             |
| Someone at an unlocked, unattended computer      | Auto-lock (10 min idle, 5 min hidden tab), manual lock, clipboard auto-clear; the plaintext export re-asks for the master password.                   |
| Malicious/compromised server code or XSS         | **Not covered** (as with any web-based vault): code served by the server could capture the master password. Keep the server and dependencies trusted. |
| Lost master password **and** lost recovery key   | Data is unrecoverable by design. "Erase vault" lets the user start over.                                                                              |

The server _does_ see non-secret metadata: item **type**, linked project/client, favorite flag,
timestamps (created/updated/last viewed) and the item count. Titles, URLs, usernames and every
field are inside the ciphertext.

## Crypto parameters

| What            | Value                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------- |
| Vault key       | random AES-GCM 256 (`generateKey`, extractable only so it can be wrapped)                                      |
| Item encryption | AES-256-GCM, fresh random 96-bit IV per write, payload = JSON (see below)                                      |
| Master KEK      | PBKDF2-SHA256, **600 000** iterations, 16-byte random salt → AES-GCM 256, non-extractable, `wrapKey/unwrapKey` |
| Key wrapping    | `wrapKey("raw", vaultKey, KEK, AES-GCM + random 96-bit IV)` → 48 bytes (key + tag)                             |
| Recovery key    | 32 random bytes shown as 13 groups of 4 base32 chars (`ABCD-EFGH-…`)                                           |
| Recovery KEK    | PBKDF2-SHA256, **100 000** iterations (the key is 256-bit random), own 16-byte salt                            |
| Session key     | the unwrapped vault key re-imported **non-extractable** (`encrypt/decrypt` only)                               |
| Password input  | Unicode NFC + Persian/Arabic-Indic digits → ASCII before PBKDF2 (layout-independent). Never change this.       |

`vault_keys` row: `{ kdf: "PBKDF2-SHA256", iterations, salt, wrapped_key, wrap_iv, recovery_salt,
recovery_wrapped_key, recovery_iv }` — all base64. `RECOVERY_ITERATIONS` is a constant (not stored);
changing it would break existing recovery keys.

Item payload (encrypted):

```ts
{ v: 1, type, title, fields: { url?, username?, password?, totp?, host?, … }, custom: [{ label, value, concealed }], env: [{ key, value }] }
```

The plaintext `type` column is a copy for server-side counting/filtering; the UI trusts the type
inside the ciphertext.

## Flows

- **Setup** (no `vault_keys` row): explain → choose master password (≥ 12 chars, mixed classes or a
  4+ word passphrase, not common/repetitive; strength meter + "suggest a passphrase") → the browser
  creates the vault key, wraps it with the password and a new recovery key → the recovery key is
  shown **once** (copy / `.txt` download, required "I saved it" checkbox) → `setupVaultAction`
  stores the material. A second setup is refused (`conflict`) so two tabs can't create two keys.
- **Unlock**: derive KEK → unwrap. A wrong password fails AES-GCM authentication → "not correct".
  There is no server round-trip, so there is nothing to rate-limit online; PBKDF2 makes offline
  guessing expensive.
- **Recovery**: recovery key → unwrap (extractable) → user must choose a new master password → a
  new recovery key is generated and shown → both wraps are saved together (`updateVaultKeysAction`)
  and the old recovery key stops working.
- **Change master password** (settings): current password → unwrap → re-wrap with the new one.
  Items are untouched (same vault key).
- **New recovery key** (settings): master password → new recovery key shown once → saved.
- **Erase vault**: typed confirmation → deletes keys and items (only the caller's).

## Session & auto-lock

The unlocked key lives only in React state inside `VaultProvider` (mounted by the vault page) —
never in `localStorage`, `sessionStorage`, IndexedDB or cookies. Decrypted items live in component
state of the unlocked workspace and disappear when it unmounts on lock.

- Locks after **10 minutes** without interaction on the vault page, and when the tab has been
  hidden for **5 minutes**; manual "Lock" button in the header.
- Next.js keeps recently visited routes alive (React `<Activity>`), so the idle timer is _not_
  tied to effect cleanup: leaving the vault page keeps the countdown running, activity on other
  pages doesn't extend it, and open drawers/dialogs with secrets are closed when the page is hidden.
- Timers may be throttled in background tabs, so elapsed time is re-checked on every interaction
  and when the tab becomes visible again.
- Locking also wipes a pending clipboard secret.

## Items & UI

Types with tailored forms: login (URL, username, password, TOTP, notes), server (host, user,
password, panel URL), database (engine, host, port, db, user, password, connection string),
API key (service, key, secret), SSH key (host, user, private key, passphrase), `.env` (key/value
rows, paste a `.env` file, copy/download as `.env`), card, secure note, other — plus custom fields
(label / value / hidden) on every type. Items can link to a project and (admins) a client.

The list is decrypted in the browser (cached per `id:iv`), searchable over titles, URLs, usernames,
hosts, services and non-hidden custom fields (never secrets), filterable by type, project and
favorites. The detail drawer reveals secrets on demand, copies with a **30-second clipboard
auto-clear** (countdown toast), shows a live TOTP code with a countdown ring, password strength,
and records "last viewed" (`viewVaultItemAction`, no refresh).

Generator: random passwords (8–64, upper/lower/digits/symbols, avoid look-alikes; at least one char
of each class, uniform via rejection sampling) or passphrases (3–12 words from an 830-word list,
separator, capitalisation, number).

## Backup, restore, export

- **Encrypted backup** (`good-team-vault-backup-YYYY-MM-DD.json`): the `vault_keys` material plus
  every item's ciphertext. Safe to store; opens only with the master password or recovery key that
  was valid when it was made.
- **Restore**: items that decrypt with the current key are uploaded as is; otherwise the user enters
  the backup's master password or recovery key, the browser decrypts each item and re-encrypts it
  with the current key. Items whose id already exists are skipped (idempotent).
- **Unencrypted export** (CSV or JSON): strong warning, "I understand" checkbox and master
  password re-entry. CSV columns: `type,title,url,username,password,totp,notes,project,client,favorite,extra`
  (`extra` = JSON of the remaining fields). Values are written verbatim (no spreadsheet-formula
  escaping, to keep secrets intact).

## Access

owner/admin/member: their own vault only (`vault_*.user_id = actor`). Clients: no vault — the page
redirects, actions and the tool are role-gated, and the service asserts staff.

## API — why there are no secret tools <a id="api"></a>

Only **`vault_status`** is exposed (is the vault set up, item count per type, favorites). There is
intentionally no tool that lists, reads, creates or exports items:

1. The server cannot decrypt anything, so a "read" tool could only return ciphertext — useless to an
   agent and pure risk.
2. API tokens are long-lived bearer secrets that end up in agent configs and CI; a token must never
   become a path to bulk-exfiltrate the vault, not even encrypted.
3. LLM agents can be prompt-injected by the content they read; secrets should stay a deliberate,
   human, in-browser action.

## Tests

- Unit: `src/lib/vault-crypto.test.ts`, `src/lib/totp.test.ts`, `src/components/vault/*.test.ts`.
- End to end: `e2e/vault.spec.ts` (`pnpm test:e2e`) sets up a vault for the demo member, stores a
  login, locks and unlocks, and asserts that the master password, recovery key, item title and
  secret never appear in any request sent to the server; it erases the vault afterwards.
