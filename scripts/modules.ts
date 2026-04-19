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

const { error, success, system, warning } = messenger('[modules]');

//--------------------------------------------------------------------//
// Main

async function main() {
  const manifest = await getManifest();
  const projects = manifest.projects;

  for (const [ name, project ] of Object.entries(projects)) {
    const target = getProjectRoot(project);

    system(`[${name}] Running yarn install in ${target}...`);
    const env = { ...process.env };
    delete env.NODE_OPTIONS;
    await run('yarn', [], target, { env, log: warning });
  }

  success('Done');
}

main().catch(err => {
  error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});