//workspace
import { 
  getDependencyFields,
  getManifest,
  getPackage, 
  getProjectJsons, 
  messenger, 
  savePackage,
  tab,
  unique
} from './helpers.js';

//--------------------------------------------------------------------//
// Constants

const { error, info, success, warning, system } = messenger('[sync]');

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
      `Too many arguments: ${values.join(' ')}\nUsage: yarn sync [project] [--dry-run]`
    );
  }

  return {
    project: values[0] ?? null,
    dryRun: flags.has('--dry-run')
  };
}

//--------------------------------------------------------------------//
// Main

async function main() {
  const { project, dryRun } = parseArgs();

  dryRun && warning('Running in dry-run mode (no files will be changed)');

  const manifest = await getManifest();
  const common = manifest.common;
  const projects = manifest.projects;

  if (Object.keys(common).length === 0) {
    throw new Error('No "common" object found in root package.json');
  }

  const selectedProjects = project
    ? Object.entries(projects).filter(([ name ]) => name === project)
    : Object.entries(projects);

  if (project && selectedProjects.length === 0) {
    throw new Error(`Unknown project: ${project}`);
  }

  const packageJsonPaths: string[] = [];

  for (const [, project] of selectedProjects) {
    packageJsonPaths.push(...getProjectJsons(project, true));
  }

  const files = unique(packageJsonPaths);

  if (files.length === 0) {
    error('No package.json files found');
    return;
  }

  let filesChanged = 0;
  let entriesChanged = 0;

  for (const filepath of files) {
    const config = await getPackage(filepath);
    let changed = false;

    console.log('');
    system(`Checking ${filepath}`);

    for (const field of getDependencyFields(config)) {
      const dependencies = config[field];
      if (!dependencies) {
        continue;
      }

      for (const [name, version] of Object.entries(dependencies)) {
        const commonVersion = common[name];
        if (!commonVersion) {
          continue;
        }

        if (version === commonVersion) {
          continue;
        }

        dependencies[name] = commonVersion;
        changed = true;
        entriesChanged++;

        const message =
          `Updated ${tab(field, 18)} ${tab(name, 20)} ` +
          `from ${tab(version, 10)} to ${tab(commonVersion, 10)} `;

        dryRun ? warning(message) : info(message);
      }
    }

    if (changed) {
      filesChanged++;
      !dryRun && await savePackage(filepath, config);
    } else {
      info('No changes needed');
    }
  }

  if (dryRun) {
    success(
      `Dry run complete (${filesChanged} files would change, ${entriesChanged} entries would update)`
    );
  } else {
    success(
      `Done (${filesChanged} files changed, ${entriesChanged} entries updated)`
    );
  }
}

main().catch(err => {
  error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});