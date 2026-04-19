//node
import path from 'node:path';
//workspace
import {  
  cwd,
  getManifest, 
  getPackage,
  getProjectPaths,
  getProjectRoot,
  messenger, 
  run
} from './helpers.js';

//--------------------------------------------------------------------//
// Constants

const { error, info, success, warning, system } = messenger('[publish]');

//--------------------------------------------------------------------//
// Helpers

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseArgs() {
  const rawArgs = process.argv.slice(2);

  const allowedFlags = new Set([
    '--dry-run',
    '--login',
    '--no-test',
    '--no-push'
  ]);

  const flags = new Set<string>();
  const values: string[] = [];

  for (const arg of rawArgs) {
    if (arg.startsWith('-')) {
      if (!allowedFlags.has(arg)) {
        throw new Error(`Unknown option: ${arg}`);
      }
      flags.add(arg);
    } else {
      values.push(arg);
    }
  }

  // Expect exactly 1 positional arg: <project>
  if (values.length === 0) {
    throw new Error(
      'Missing required argument: <project>\nUsage: yarn push <project> [options]'
    );
  }

  if (values.length > 1) {
    throw new Error(
      `Too many arguments: ${values.join(' ')}\nUsage: yarn push <project> [options]`
    );
  }

  const project = values[0];

  return {
    project,
    dryRun: flags.has('--dry-run'),
    login: flags.has('--login'),
    noTest: flags.has('--no-test'),
    noPush: flags.has('--no-push')
  };
}

//--------------------------------------------------------------------//
// Main

async function main() {
  const { project: name, dryRun, login, noPush } = parseArgs();

  const manifest = await getManifest();

  const project = manifest.projects[name];
  if (!project) {
    throw new Error(`Unknown project: ${name}`);
  }

  const target = getProjectRoot(project);
  const targets = getProjectPaths(project);

  if (targets.length === 0) {
    throw new Error(`Project "${name}" has no publish paths`);
  }

  const toPublish: Array<{
    target: string,
    name: string,
    version: string
  }> = [];

  for (const target of targets) {
    const config = await getPackage(path.join(target, 'package.json'));
    toPublish.push({
      target,
      name: config.name,
      version: config.version ?? '0.0.1'
    });
  }

  info(`Project: ${name}`);
  info(`Repo: ${project.repository}`);
  info(`Packages to publish:`);

  for (const pkg of toPublish) {
    console.log(` - ${pkg.name}@${pkg.version} -> ${pkg.target}`);
  }

  system(`Pulling latest changes`);
  await run('git', [ 'pull' ], target, { dryRun });

  system(`Installing dependencies`);
  await run('yarn', [], target, { dryRun });

  if (project.build) {
    system(`Building project`);
    await run(project.build, [], cwd, { 
      dryRun, 
      shell: true, 
      log: dryRun ? warning : system 
    });
  }

  if (project.test) {
    system(`Testing project`);
    await run(project.test, [], cwd, { 
      dryRun, 
      shell: true, 
      log: dryRun ? warning : system 
    });
  }

  if (noPush) {
    system(`Skipping git push (--no-push)`);
  } else {
    system(`Staging changes`);
    await run('git', [ 'add', '*' ], target, { dryRun });

    system(`Committing version bump if needed`);
    await run(
      'git',
      [ 'commit', '-m', '"version bump"' ],
      target,
      { dryRun }
    );
    system(`Pushing to GitHub`);
    await run('git', [ 'push' ], target, { dryRun });
  }

  if (login) {
    system(`Running npm login`);
    await run('npm', [ 'login' ], target, { dryRun });
  }

  for (const project of toPublish) {
    system(`Publishing ${project.name}@${project.version}`);
    await run('npm', [ 'publish' ], project.target, { dryRun });

    system(`Waiting 10 seconds`);
    dryRun ? warning(`sleep 10000`) : await sleep(10_000);
  }

  dryRun ? success(`Dry run complete`) : success(`Publish complete`);
}

main().catch(err => {
  error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});