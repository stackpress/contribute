import type { StdioOptions } from 'node:child_process';

export type WorkspaceConfig = {
  projects: Record<string, WorkspaceProject>,
  common: Record<string, string>
};

export type WorkspaceProject = {
  repository: string,
  root: string,
  build: string,
  test: string,
  examples: string[],
  publish: string[]
};

export type PackageJson = {
  name: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export type RunOptions = {
  env?: NodeJS.ProcessEnv,
  stdio?: StdioOptions,
  dryRun?: boolean,
  allowFailure?: boolean,
  shell?: boolean,
  log?: (message: string) => void
};