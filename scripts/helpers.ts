//node
import path from 'node:path';
import { constants } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
//workspace
import type { 
  PackageJson,
  RunOptions,
  WorkspaceConfig, 
  WorkspaceProject 
} from './types.js';

export const cwd = process.cwd();

/**
 * Checks if a file or directory exists at the given path
 */
export async function exists(filepath: string) {
  try {
    await access(filepath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

/**
 * Returns the dependency fields (dependencies, devDependencies) 
 * that are present in the given package.json config
 */
export function getDependencyFields(config: PackageJson) {
  return [ 'dependencies', 'devDependencies' ].filter(
    field => typeof config[field as keyof PackageJson] === 'object'
  ) as Array<'dependencies' | 'devDependencies'>;
};

/**
 * Reads the workspace manifest (package.json) and 
 * returns its content as a WorkspaceConfig object
 */
export async function getManifest() {
  const packageJsonPath = path.join(cwd, 'package.json');
  return getPackage<WorkspaceConfig>(packageJsonPath);
};

/**
 * Reads a json file and returns its content as an object
 */
export async function getPackage<T = PackageJson>(filepath: string): Promise<T> {
  const raw = await readFile(filepath, 'utf8');
  return JSON.parse(raw) as T;
};

/**
 * Returns the absolute paths to the package.json files of a project
 */
export function getProjectJsons(project: WorkspaceProject, examples = false) {
  return getProjectPaths(project, examples).map(
    folder => path.join(folder, 'package.json')
  );
};

/**
 * Returns the absolute path to the root of a project
 */
export function getProjectRoot(project: WorkspaceProject) {
  return path.join(cwd, project.root);
};

/**
 * Returns the absolute paths of a project
 */
export function getProjectPaths(project: WorkspaceProject, examples = false) {
  const paths = project.publish.map(
    example => path.join(cwd, project.root, example)
  );
  if (examples) {
    paths.push(...project.examples.map(
      example => path.join(cwd, project.root, example)
    ));
  }
  return paths;
};

/**
 * Returns a list of control methods for the terminal
 */
export function messenger(brand = '') {
  const controls = {
    brand,
    
    /**
     * Outputs an colorful (red) log 
     */
    error(message: string, variables: string[] = []) {
      controls.output(message, variables, '\x1b[31m%s\x1b[0m');
    },

    /**
     * Outputs an colorful (blue) log 
     */
    info(message: string, variables: string[] = []) {
      controls.output(message, variables, '\x1b[34m%s\x1b[0m');
    },

    /**
     * Outputs a log 
     */
    output(
      message: string, 
      variables: string[] = [],
      color?: string
    ) {
      //add variables to message
      for (const variable of variables) {
        message = message.replace('%s', variable);
      }
      //add brand to message
      message = `${controls.brand} ${message}`.trim();
      //colorize the message
      if (color) {
        console.log(color, message);
        return;
      }
      //or just output the message
      console.log(message);
    },

    /**
     * Outputs a success log 
     */
    success(message: string, variables: string[] = []) {
      controls.output(message, variables, '\x1b[32m%s\x1b[0m');
    },

    /**
     * Outputs a system log 
     */
    system(message: string, variables: string[] = []) {
      controls.output(message, variables, '\x1b[35m%s\x1b[0m');
    },

    /**
     * Outputs a warning log 
     */
    warning(message: string, variables: string[] = []) {
      controls.output(message, variables, '\x1b[33m%s\x1b[0m');
    }
  };

  return controls;
};

/**
 * Runs a command in the terminal and returns a promise that resolves 
 * when the command is successful, or rejects when the command fails
 */
export function run(
  command: string, 
  args: string[], 
  cwd?: string,
  options: RunOptions = {}
): Promise<void> {
  const { 
    env = process.env,
    stdio = 'inherit',
    dryRun = false, 
    allowFailure = false, 
    shell = false, 
    log = () => {}
  } = options;
  if (dryRun) {
    log(`Dry run: ${command} ${args.join(' ')} (cwd: ${cwd})`);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    log(`Running: ${command} ${args.join(' ')} (cwd: ${cwd})`);
    const child = spawn(command, args, { stdio, cwd, shell, env });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0 || allowFailure) {
        return resolve();
      }
      reject(new Error(
        `Command failed: ${command} ${args.join(' ')} (exit ${code})`
      ));
    });
  });
};

/**
 * Returns a new array with unique values from the given array
 */
export function unique<T>(values: T[]) {
  return [ ...new Set(values) ];
};

/**
 * Writes an object to a json file, creating the file if it doesn't exist
 */
export async function savePackage(filepath: string, data: unknown) {
  await writeFile(filepath, JSON.stringify(data, null, 2) + '\n', 'utf8');
};

/**
 * Add spaces to the end of a string so the total length of the string is equal to the given length
 */
export function tab(string: string, length: number) {
  return string + ' '.repeat(Math.max(0, length - string.length));
};