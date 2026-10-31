const http = require('http');
const fs = require('fs');
const { Client } = require('pg');

const PORT = Number(process.env.PORT || 8080);
const DATABASE_URL = process.env.DATABASE_URL;

function previewInfo() {
  return {
    preview: process.env.STACKBLAZE_PREVIEW === 'true',
    prNumber: process.env.STACKBLAZE_PR_NUMBER || null,
    branch: process.env.STACKBLAZE_PR_BRANCH || null,
    dataMode: process.env.STACKBLAZE_PREVIEW_DATA_MODE || null,
    seedPath: process.env.STACKBLAZE_PREVIEW_SEED_PATH || null,
    source: process.env.STACKBLAZE_PREVIEW_SOURCE || null,
  };
}

async function ensureSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS visits (
      id SERIAL PRIMARY KEY,
      note TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function runSeedIfConfigured(client) {
  const path = process.env.STACKBLAZE_PREVIEW_SEED_PATH;
  if (!path || !fs.existsSync(path)) return { ran: false, path: path || null };
  const sql = fs.readFileSync(path, 'utf8');
  await client.query(sql);
  return { ran: true, path };
}

async function withDb(fn) {
  // Stackblaze injects the Postgres add-on as PGHOST/PGUSER/PGPASSWORD/…,
  // which pg reads by itself; DATABASE_URL wins when set.
  if (!DATABASE_URL && !process.env.PGHOST) {
    throw new Error('Neither DATABASE_URL nor PGHOST is set');
  }
  const client = new Client(DATABASE_URL ? { connectionString: DATABASE_URL } : {});
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

const server = http.createServer(async (req, res) => {
  const send = (code, body) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body, null, 2));
  };

  try {
    if (req.url === '/health') {
      return send(200, { ok: true, ...previewInfo() });
    }

    if (req.url === '/' || req.url === '/api') {
      const payload = await withDb(async (client) => {
        await ensureSchema(client);
        const seed = await runSeedIfConfigured(client);
        await client.query(
          'INSERT INTO visits (note) VALUES ($1)',
          [`boot-${Date.now()}`],
        );
        const count = await client.query('SELECT COUNT(*)::int AS n FROM visits');
        return {
          message: 'Stackblaze preview demo (PR #2)',
          visitCount: count.rows[0].n,
          seed,
          ...previewInfo(),
        };
      });
      return send(200, payload);
    }

    send(404, { error: 'not found' });
  } catch (err) {
    send(500, { error: err.message, ...previewInfo() });
  }
});

server.listen(PORT, () => {
  console.log(`preview-demo listening on :${PORT}`);
});
