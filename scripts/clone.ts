//node
import path from 'node:path';
import { rm } from 'node:fs/promises';
//workspace
import { 
  exists, 
  getManifest, 
  getProjectRoot, 
  messenger, 
  run
} from './helpers.js';

//--------------------------------------------------------------------//
// Constants

const { error, info, success, warning } = messenger('[clone]');

//--------------------------------------------------------------------//
// Main

async function main() {
  const args = new Set(process.argv.slice(2));
  const force = args.has('--force');

  const manifest = await getManifest();
  const projects = manifest.projects;

  let cloned = 0;
  let skipped = 0;

  for (const [ name, project ] of Object.entries(projects)) {
    const repository = project.repository?.trim();
    const target = getProjectRoot(project);

    if (!repository) {
      warning(`[${name}] Skipping (no repository)`);
      skipped++;
      continue;
    }

    const alreadyExists = await exists(target);

    if (alreadyExists && force) {
      warning(`[${name}] Removing existing ${target}`);
      await rm(target, { recursive: true, force: true });
    }

    if (await exists(target)) {
      warning(`[${name}] Skipping (already exists)`);
      skipped++;
      continue;
    }

    info(`[${name}] Cloning from ${repository}`);
    const args = [ 'clone', repository, path.basename(target) ];
    await run('git', args, path.dirname(target));
    cloned++;
  }

  success(`Done (${cloned} cloned, ${skipped} skipped)`);
}

main().catch(err => {
  error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});