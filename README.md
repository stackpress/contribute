# Contribute

Thanks for being a Stackpress contributor! This is a workspace for contributors.

## Setup

To use this project, just run the following instructions.

 1. `yarn clone` - Clones all the git repos to the specified `projects.[name].root` folder.
 2. `yarn modules` - Runs `yarn install` on the specified `projects.[name].root` folder.
 3. `yarn connect` - Creates symlinks of `projects` in the `node_modules` between `projects`.

## Tools

The following tools are available for contributors.

 - `yarn pull` - Pulls the latest commits from all the projects
 - `yarn lib [script]` - runs a `package.json` script found in `@stackpress/lib`
 - `yarn idea [script]` - runs a `package.json` script found in `@stackpress/idea`
 - `yarn ingest [script]` - runs a `package.json` script found in `@stackpress/ingest`
 - `yarn inquire [script]` - runs a `package.json` script found in `@stackpress/inquire`
 - `yarn reactus [script]` - runs a `package.json` script found in `reactus`
 - `yarn stackpress [script]` - runs a `package.json` script found in `stackpress`

## Publishing

The following tools are meant for contributors with publishing powers.

 - `yarn sync` - updates all project dependencies with package 
   versions found in the `common` object in this `package.json`.
 - `yarn update [current version] [new version] [?project]` - updates 
   all the publishable versions to the new specified version
 - `yarn publish` - publishes all projects to npm