import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createDatabase, type Queryable } from './database';

export type InstallStatus = {
  installed: boolean;
  installerEnabled: boolean;
  companyConfigured: boolean;
  ownerCreated: boolean;
  databaseReady: boolean;
};

type InstallChecks = InstallStatus & {
  migrationsRan: boolean;
  defaultRolesExist: boolean;
  defaultPermissionsExist: boolean;
  foundationCompleted: boolean;
  installerLocked: boolean;
  completionFlagSet: boolean;
};

const REQUIRED_ROLES = ['Owner', 'Admin', 'Office', 'Dispatcher', 'Technician', 'Client', 'Vendor'];
const REQUIRED_PERMISSIONS = 36;
const INSTALLATION_VERSION = process.env.npm_package_version ?? '1.0.0';

const asBoolean = (value: unknown) => value === true || value === 'true';

export async function runMigrations(db: Queryable = createDatabase()) {
  const migrationsDir = path.resolve('migrations');
  for (const file of ['001_foundation.sql', '002_seed_foundation.sql']) {
    await db.query(await readFile(path.join(migrationsDir, file), 'utf8'));
  }
}

export async function getInstallChecks(db: Queryable = createDatabase()): Promise<InstallChecks> {
  try {
    await db.query('select 1');

    const tableResult = await db.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'public' and table_name = any($1)`,
      [['app_settings', 'company_settings', 'users', 'roles', 'permissions', 'user_roles', 'installer_state']]
    );
    const tables = new Set(tableResult.rows.map((row) => row.table_name));
    const migrationsRan = ['app_settings', 'company_settings', 'users', 'roles', 'permissions', 'user_roles', 'installer_state'].every((table) => tables.has(table));

    if (!migrationsRan) return emptyChecks({ databaseReady: true });

    const settings = await db.query<{ key: string; value: unknown }>(
      `select key, value from app_settings where key in ('installation.completed', 'foundation.install.completed')`
    );
    const settingsByKey = new Map(settings.rows.map((row) => [row.key, row.value]));
    const completionFlagSet = asBoolean(settingsByKey.get('installation.completed'));
    const foundationCompleted = asBoolean(settingsByKey.get('foundation.install.completed'));

    const company = await db.query<{ exists: boolean }>(
      `select exists(select 1 from company_settings where nullif(trim(company_name), '') is not null) as exists`
    );
    const owner = await db.query<{ exists: boolean }>(
      `select exists(
        select 1
        from users u
        join user_roles ur on ur.user_id = u.id
        join roles r on r.id = ur.role_id
        where r.name = 'Owner'
      ) as exists`
    );
    const roles = await db.query<{ count: string }>(`select count(*) from roles where name = any($1)`, [REQUIRED_ROLES]);
    const permissions = await db.query<{ count: string }>(`select count(*) from permissions`);
    const installer = await db.query<{ locked: boolean }>(
      `select exists(select 1 from installer_state where locked = true) as locked`
    );

    const companyConfigured = Boolean(company.rows[0]?.exists);
    const ownerCreated = Boolean(owner.rows[0]?.exists);
    const defaultRolesExist = Number(roles.rows[0]?.count ?? 0) >= REQUIRED_ROLES.length;
    const defaultPermissionsExist = Number(permissions.rows[0]?.count ?? 0) >= REQUIRED_PERMISSIONS;
    const installerLocked = Boolean(installer.rows[0]?.locked);
    const installed = Boolean(
      completionFlagSet &&
      foundationCompleted &&
      installerLocked &&
      companyConfigured &&
      ownerCreated &&
      defaultRolesExist &&
      defaultPermissionsExist
    );

    return {
      installed,
      installerEnabled: !installed,
      companyConfigured,
      ownerCreated,
      databaseReady: true,
      migrationsRan,
      defaultRolesExist,
      defaultPermissionsExist,
      foundationCompleted,
      installerLocked,
      completionFlagSet,
    };
  } catch {
    return emptyChecks();
  }
}

export async function getInstallStatus(db: Queryable = createDatabase()): Promise<InstallStatus> {
  const checks = await getInstallChecks(db);
  return {
    installed: checks.installed,
    installerEnabled: checks.installerEnabled,
    companyConfigured: checks.companyConfigured,
    ownerCreated: checks.ownerCreated,
    databaseReady: checks.databaseReady,
  };
}

export async function completeInstallation(input: { companyName?: string; ownerName?: string; ownerEmail?: string; theme?: unknown } = {}, db: Queryable = createDatabase()) {
  await runMigrations(db);

  const companyName = input.companyName?.trim() || 'ContractorOS';
  const ownerName = input.ownerName?.trim() || 'Owner';
  const ownerEmail = input.ownerEmail?.trim() || 'owner@example.com';

  await db.query(
    `insert into company_settings (company_name)
     select $1
     where not exists (select 1 from company_settings)`,
    [companyName]
  );
  await db.query(
    `update company_settings set company_name = coalesce(nullif(company_name, ''), $1), updated_at = now()
     where id = (select id from company_settings order by created_at asc limit 1)`,
    [companyName]
  );

  const owner = await db.query<{ id: string }>(
    `insert into users (name, email, status)
     values ($1, $2, 'active')
     on conflict (email) do update set name = excluded.name, status = 'active', updated_at = now()
     returning id`,
    [ownerName, ownerEmail]
  );
  await db.query(
    `insert into user_roles (user_id, role_id)
     select $1, id from roles where name = 'Owner'
     on conflict do nothing`,
    [owner.rows[0].id]
  );

  await db.query(
    `insert into installer_state (step, completed, locked, summary)
     values ('finish', true, true, $1::jsonb)
     on conflict do nothing`,
    [JSON.stringify({ completedBy: ownerEmail })]
  );
  await db.query(`update installer_state set completed = true, locked = true, updated_at = now()`);

  await upsertSetting(db, 'foundation.install.completed', true);
  await upsertSetting(db, 'installation.completed', true);
  await upsertSetting(db, 'installation.completed_at', new Date().toISOString());
  await upsertSetting(db, 'installation.version', INSTALLATION_VERSION);
  if (input.theme) await upsertSetting(db, 'theme.settings', input.theme);

  return getInstallStatus(db);
}

export async function resetInstallation(db: Queryable = createDatabase()) {
  await runMigrations(db);
  await upsertSetting(db, 'installation.completed', false);
  await db.query(`update installer_state set locked = false, updated_at = now()`);
  return getInstallStatus(db);
}

async function upsertSetting(db: Queryable, key: string, value: unknown) {
  await db.query(
    `insert into app_settings (key, value, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [key, JSON.stringify(value)]
  );
}

function emptyChecks(overrides: Partial<InstallChecks> = {}): InstallChecks {
  return {
    installed: false,
    installerEnabled: true,
    companyConfigured: false,
    ownerCreated: false,
    databaseReady: false,
    migrationsRan: false,
    defaultRolesExist: false,
    defaultPermissionsExist: false,
    foundationCompleted: false,
    installerLocked: false,
    completionFlagSet: false,
    ...overrides,
  };
}
