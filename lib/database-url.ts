function hasPgParts() {
  return Boolean(
    process.env.PGHOST &&
      process.env.PGPORT &&
      process.env.PGUSER &&
      process.env.PGPASSWORD &&
      process.env.PGDATABASE
  );
}

function buildDatabaseUrlFromPgParts() {
  if (!hasPgParts()) {
    return null;
  }

  const user = encodeURIComponent(process.env.PGUSER!);
  const password = encodeURIComponent(process.env.PGPASSWORD!);
  const host = process.env.PGHOST!;
  const port = process.env.PGPORT!;
  const database = process.env.PGDATABASE!;

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

export function getDatabaseUrl() {
  return process.env.DATABASE_URL || buildDatabaseUrlFromPgParts();
}
