# Connecting MongoDB Atlas (persistent storage)

## Why this is needed

Right now the server runs in **in-memory demo mode**: no `MONGODB_URI` is set, so
all data (students, PINs, teacher accounts) lives only in the Node process's RAM.
That's why `teacher@demo.com` / `teacher123` stopped working — the dev server
runs with `node --watch`, which restarts the process on every file save, and a
restart wipes everything that isn't in a real database.

Once Atlas is connected, every account and every student's progress survives
restarts, deploys, and crashes.

---

## Step 1 — Create an Atlas account and cluster *(you've done this)*

1. Sign up / log in at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a **Project**, then **Build a Database** → choose the free **M0** tier.
3. Wait ~1–3 minutes for the cluster to finish provisioning.

## Step 2 — Create a database user *(you've done this)*

Atlas → **Security → Database Access → Add New Database User**.
Set a username and password (Atlas can autogenerate a strong password —
copy it now, you can't view it again later, only reset it).

## Step 3 — Allow your IP to connect

Atlas → **Security → Network Access → Add IP Address**.

- For local development, click **"Add Current IP Address"**.
- If your IP changes often (home Wi-Fi, hotspot, hackathon venue Wi-Fi), you
  can instead add `0.0.0.0/0` ("Allow access from anywhere"). This is fine for
  a demo/hackathon project but **not** something to leave on for a real
  production app with sensitive data.

Without this step, the server will time out trying to connect — this is the
single most common Atlas connection failure.

## Step 4 — Get the connection string *(you've done this)*

Atlas → **Database** → **Connect** on your cluster → **Drivers** → copy the
string. It looks like:

```
mongodb+srv://<username>:<password>@cluster0.ab1cd.mongodb.net/?retryWrites=true&w=majority
```

## Step 5 — Fill in `server/.env`

A `server/.env` file has already been created for you with a template. Open it
and replace the placeholders on the `MONGODB_URI` line:

| Placeholder | Replace with |
|---|---|
| `<USERNAME>` | the database user's username from Step 2 |
| `<PASSWORD>` | that user's password from Step 2 |
| `<CLUSTER-ADDRESS>` | the `clusterX.xxxxx.mongodb.net` part from your Step 4 connection string |
| `<DATABASE-NAME>` | any name you choose, e.g. `foundational-learning` — Atlas creates it automatically the first time data is written, it does not need to exist beforehand |

**If your password contains special characters** (`@ : / ? # % & + space`),
URL-encode them or the connection string won't parse correctly:

| Character | Encode as |
|---|---|
| `@` | `%40` |
| `#` | `%23` |
| `:` | `%3A` |
| `/` | `%2F` |
| `?` | `%3F` |
| space | `%20` |

Example of a fully filled-in line (fake credentials):

```
MONGODB_URI=mongodb+srv://flrAdmin:p%40ss123@cluster0.ab1cd.mongodb.net/foundational-learning?retryWrites=true&w=majority
```

Leave `PORT` and `CLIENT_ORIGIN` as they are unless you've changed your dev
setup.

## Step 6 — Restart the server and verify

Stop the currently running dev server (Ctrl+C in its terminal, or close it),
then from `server/`:

```
npm run dev
```

You should see this in the terminal instead of the "in-memory demo mode" message:

```
Connected to MongoDB Atlas.
```

Confirm it from the browser or curl too:

```
curl http://localhost:4000/api/health
```

should now return `"storage":"mongodb"` instead of `"storage":"in-memory"`.

If instead you see `MongoDB connection failed (...) — falling back to
in-memory demo mode`, see Troubleshooting below — the app is designed to never
crash on a bad connection string, it just silently falls back, so this
message is the only signal something's wrong.

## Step 7 — Re-create your accounts

The `teacher@demo.com` account (and any student PINs) you created earlier only
ever existed in RAM — they are **not** in Atlas. Once Atlas is connected,
register them again and they'll persist from now on:

```
curl -X POST http://localhost:4000/api/auth/teacher/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Teacher","email":"teacher@demo.com","password":"teacher123"}'
```

The `demo-child-0001` seed student is re-created automatically on every boot
(it's idempotent — `seedDemoData.js` checks if it already exists first), so
you don't need to do anything for that one.

---

## Troubleshooting

**`MongoServerError: bad auth : authentication failed`**
Wrong username or password in the URI, or the password has an un-encoded
special character. Double-check Step 5.

**Connection just hangs / times out**
Your IP isn't in the Atlas Network Access allowlist. Redo Step 3.

**`querySrv ENOTFOUND` or similar DNS error**
Typo in the cluster address, or you're on a network that blocks SRV DNS
lookups (some corporate/hotel Wi-Fi does this). Double-check the
`<CLUSTER-ADDRESS>` part, or try a different network.

**Server still says "in-memory demo mode" after filling in `.env`**
`node --watch` restarts on file changes but `.env` is only read once at
process boot via `dotenv/config` — make sure you actually stopped and
restarted the server (not just saved a source file) after editing `.env`.

**Login still fails after connecting Atlas**
That specific account doesn't exist in Atlas yet — see Step 7. Logging in and
registering are different endpoints; connecting a database doesn't create
accounts by itself.
