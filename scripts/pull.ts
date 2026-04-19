//node
import path from 'node:path';
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

const { error, success, system, warning } = messenger('[sync]');

//--------------------------------------------------------------------//
// Main

async function main() {
  const manifest = await getManifest();
  const projects = manifest.projects;

  let updated = 0;
  let skipped = 0;

  for (const [ name, project ] of Object.entries(projects)) {
    if (!project.repository) {
      warning(`[${name}] Skipping (no repository)`);
      skipped++;
      continue;
    }

    const target = getProjectRoot(project);
    const gitDir = path.join(target, '.git');

    if (!(await exists(target)) || !(await exists(gitDir))) {
      warning(`[${name}] Skipping (not cloned yet)`);
      skipped++;
      continue;
    }

    system(`[${name}] Pulling latest changes`);

    await run('git', [ 'pull' ], target);
    updated++;
  }

  success(`Update phase done (${updated} updated, ${skipped} skipped)`);
}

main().catch(err => {
  error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});