//node
import fs from 'node:fs/promises';
import path from 'node:path';
//workspace
import {
  getProjectRoot,
  getManifest,
  messenger
} from './helpers.js';

//--------------------------------------------------------------------//
// Constants

const { error, warning, system } = messenger('[suite]');

//--------------------------------------------------------------------//
// Helpers

function parseArgs() {
  const rawArgs = process.argv.slice(2);

  const allowedFlags = new Set([
    '--dry-run'
  ]);

  const flags = new Set<string>();
  const values: string[] = [];

  for (const arg of rawArgs) {
    if (arg.startsWith('-')) {
      if (!allowedFlags.has(arg)) {
        throw new Error(`Unknown option: ${arg}`);
      }

      if (flags.has(arg)) {
        throw new Error(`Duplicate option: ${arg}`);
      }

      flags.add(arg);
      continue;
    }

    values.push(arg);
  }

  if (values.length > 1) {
    throw new Error(
      `Too many arguments: ${values.join(' ')}\nUsage: yarn remove [folder] [--dry-run]`
    );
  }

  return {
    folder: values[0] ?? null,
    dryRun: flags.has('--dry-run')
  };
}

//--------------------------------------------------------------------//
// Main

async function main() {
  const { folder, dryRun } = parseArgs();
  if (!folder) {
    error('No folder specified. Usage: yarn remove [folder] [--dry-run]');
    process.exit(1);
  }
  const manifest = await getManifest();
  const projects = Object.entries(manifest.projects);
  dryRun && warning('Running in dry-run mode. No files will be removed.');
  for (const [ name, project ] of projects) {
    if (project.disabled) {
      warning(`Project ${name} is disabled. Skipping.`);
      continue;
    }
    const target = getProjectRoot(project);
    const destination = path.join(target, folder);
    //if destination does not exist, skip
    if (!await fs.stat(destination).then(() => true).catch(() => false)) {
      warning(`Folder ${destination} does not exist. Skipping.`);
      continue;
    }
    system(`Removing ${destination}...`);
    if (!dryRun) {
      await fs.rm(destination, { recursive: true, force: true });
    }
  }
}

main().catch(err => {
  error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});