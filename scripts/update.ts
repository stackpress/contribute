//workspace
import type { PackageJson } from './types.js';
import { 
  getDependencyFields,
  getManifest,
  getPackage, 
  getProjectJsons,
  messenger, 
  savePackage,
  unique
} from './helpers.js';

//--------------------------------------------------------------------//
// Constants

const { error, info, success, warning, system } = messenger('[update]');

//--------------------------------------------------------------------//
// Helpers

function getArgv() {
  const [, , oldVersion, newVersion, project] = process.argv;

  if (!oldVersion || !newVersion) {
    throw new Error(
      'Usage: yarn update <old-version> <new-version> [project]'
    );
  }

  return { oldVersion, newVersion, project };
}

//--------------------------------------------------------------------//
// Main

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const { oldVersion, newVersion, project } = getArgv();

  const manifest = await getManifest();
  const projects = manifest.projects;

  const selectedProjects = project && project !== '--dry-run'
    ? Object.entries(projects).filter(([name]) => name === project)
    : Object.entries(projects);

  if (project && selectedProjects.length === 0) {
    throw new Error(`Unknown project: ${project}`);
  }

  const packageJsonPaths: string[] = [];

  for (const [, project] of selectedProjects) {
    packageJsonPaths.push(...getProjectJsons(project, true));
  }

  const uniquePackageJsonPaths = unique(packageJsonPaths);

  if (uniquePackageJsonPaths.length === 0) {
    warning('No package.json files found to process');
    return;
  }

  // First pass:
  // Build an allow-list of internal package names from the selected paths.
  const allowedNames = new Set<string>();

  for (const filepath of uniquePackageJsonPaths) {
    try {
      const pkg = await getPackage(filepath);
      if (pkg.name) {
        allowedNames.add(pkg.name);
      }
    } catch (err) {
      error(`Skipping unreadable file: ${filepath}`);
      if (err instanceof Error) {
        error(err.message);
      }
    }
  }

  let filesChanged = 0;
  let versionsChanged = 0;

  dryRun && warning(
    `Dry run mode: no files will be written.`
  );

  // Second pass:
  // Update package version and matching internal dependency versions.
  for (const filepath of uniquePackageJsonPaths) {
    let changed = false;
    let config: PackageJson;

    try {
      config = await getPackage(filepath);
    } catch (err) {
      error(`Skipping unreadable file: ${filepath}`);
      if (err instanceof Error) {
        error(err.message);
      }
      continue;
    }

    if (config.version === oldVersion) {
      config.version = newVersion;
      changed = true;
      versionsChanged++;
      system(`Updated version in ${filepath}`);
    }

    for (const field of getDependencyFields(config)) {
      const deps = config[field];
      if (!deps) {
        continue;
      }

      for (const [name, version] of Object.entries(deps)) {
        if (version !== oldVersion) {
          continue;
        }

        if (!allowedNames.has(name)) {
          continue;
        }

        deps[name] = newVersion;
        changed = true;
        versionsChanged++;
        info(
          `Updated ${field} ${name} in ${filepath}`
        );
      }
    }

    if (changed) {
      if (!dryRun) {
        await savePackage(filepath, config);
      }
      filesChanged++;
    }
  }

  success(
    `Done (${filesChanged} files changed, ${versionsChanged} version entries updated)`
  );
}

main().catch(err => {
  error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});