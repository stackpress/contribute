//node
import path from 'node:path';
import { lstat } from 'node:fs/promises';
//workspace
import {
  exists, 
  getManifest, 
  getPackage, 
  getProjectRoot,
  getProjectPaths,
  messenger, 
  run
} from './helpers.js';

//--------------------------------------------------------------------//
// Constants

const { error, success, system, warning } = messenger('[sync]');

//--------------------------------------------------------------------//
// Helpers

async function isSymlink(path: string) {
  try {
    const stats = await lstat(path);
    return stats.isSymbolicLink();
  } catch (err) {
    return false;
  }
}

function parseArgs() {
  const rawArgs = process.argv.slice(2);

  const allowedFlags = new Set([ '--dry-run' ]);

  const flags = new Set<string>();

  for (const arg of rawArgs) {
    if (!arg.startsWith('-')) continue;
    if (!allowedFlags.has(arg)) {
      throw new Error(`Unknown option: ${arg}`);
    }
    flags.add(arg);
  }

  return { dryRun: flags.has('--dry-run') };
}

//--------------------------------------------------------------------//
// Main

async function main() {
  const { dryRun } = parseArgs();
  const runOptions = { dryRun, log: warning };
  const manifest = await getManifest();
  const projects = manifest.projects;
  //collect all possible things to link
  const links: { key: string, name: string, path: string }[] = [];
  for (const [ key, project ] of Object.entries(projects)) {
    const folders = getProjectPaths(project);
    for (const folder of folders) {
      const config = await getPackage(path.join(folder, 'package.json'));
      system(`Adding ${config.name} from ${key} to links`);
      links.push({ key, name: config.name, path: folder });
    }
  }
  //next loop through all projects again
  for (const [ key, project ] of Object.entries(projects)) {
    //get the root path
    const root = getProjectRoot(project);
    //loop through links
    for (const link of links) {
      //skip if link is in the same project
      if (link.key === key) continue;
      //see if [root]/node_modules/[link.name] exists
      const target = path.join(root, 'node_modules', link.name);
      if (await exists(target)) {
        if (await isSymlink(target)) {
          //relink it
          system(`Relinking ${link.name} in ${key}`);
          await run('rm', [ target ], root, runOptions);
        } else {
          //remove it
          system(`Replacing ${link.name} in ${key}`);
          await run('rm', [ '-rf', target ], root, runOptions);
        }
        //once removed, we can link it
        const dirname = path.dirname(target);
        const basename = path.basename(target);
        const args = [ '-s', link.path, basename ];
        await run('ln', args, dirname, runOptions);
        success(`Linked ${link.name} in ${key}`);
      }
    }
  }
}

main().catch(err => {
  error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});