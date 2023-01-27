// Forked from https://github.com/sourcegraph/sourcegraph/blob/75bfad82740f2fd1bd8f5a600bef9426bc6ec79f/client/vscode/src/commands/git-helpers.ts.

import { emitNotification } from "./utils";

export interface RepositoryInfo extends Branch, RemoteName {
  /** Git repository remote URL */
  remoteURL: string;

  /** File path relative to the repository root */
  fileRelative: string;
}

export type GitHelpers = typeof gitHelpers;

export interface RemoteName {
  /**
   * Remote name of the upstream repository,
   * or the first found remote name if no upstream is found
   */
  remoteName: string;
}

export interface Branch {
  /**
   * Remote branch name, or 'HEAD' if it isn't found because
   * e.g. detached HEAD state, upstream branch points to a local branch
   */
  branch: string;
}

/**
 * Utility function to return the output of a Process as a Promise<string>.
 * Can only return single-line output from stdout or stderr.
 */
function gitPromise(options: TaskProcessAction): Promise<string> {
  return new Promise((resolve, reject) => {
    const gitExecutable = nova.workspace.config.get(
      "com.harrytwyford.sourcegraph.config.gitExecutable",
      "string"
    );
    if (!gitExecutable) {
      reject("Please specify a git executable in settings.");
      return;
    }
    if (nova.inDevMode()) {
      console.log(
        `Git executable: ${gitExecutable}; options: ${JSON.stringify(options)}`
      );
    }
    const process = new Process(gitExecutable, options);
    process.onStdout((line) => {
      resolve(line.replace("\n", ""));
    });

    process.onStderr((line) => {
      reject(line.replace("\n", ""));
    });

    process.start();
  });
}

/**
 * Returns the Git repository remote URL, the current branch, and the file path
 * relative to the repository root. Returns undefined if no remote is found.
 */
export async function repoInfo(): Promise<RepositoryInfo | undefined> {
  try {
    // Determine repository root directory.
    const filePath = nova.workspace.activeTextEditor?.document.path;
    if (!filePath) {
      emitNotification(
        nova.localize("Cannot complete actions."),
        nova.localize("Cannot find an open file.")
      );
      return;
    }

    const repoRoot = await gitHelpers.rootDirectory();
    // Determine file path relative to repository root, then replace slashes
    // as \\ does not work in Sourcegraph links
    const fileRelative = filePath.slice(repoRoot.length).replace(/\\/g, "/");
    let { branch, remoteName } = await gitRemoteNameAndBranch(
      repoRoot,
      gitHelpers
    );
    const remoteURL = await gitHelpers.remoteUrl(remoteName, repoRoot);

    // TODO: Check if branch exists remotely on Sourcegraph.
    console.log(
      JSON.stringify({
        remoteURL,
        branch: branch || getDefaultBranch(),
        fileRelative,
        remoteName,
      })
    );
    return {
      remoteURL,
      branch: branch || getDefaultBranch(),
      fileRelative,
      remoteName,
    };
  } catch {
    return undefined;
  }
}

async function gitRemoteNameAndBranch(
  repoDirectory: string,
  git: Pick<GitHelpers, "branch" | "remotes" | "upstreamAndBranch">
): Promise<RemoteName & Branch> {
  let remoteName: string | undefined;

  // Used to determine which part of upstreamAndBranch is the remote name, or as fallback if no upstream is set
  const remotes = await git.remotes(repoDirectory);
  const branch = await git.branch(repoDirectory);

  try {
    const upstreamAndBranch = await git.upstreamAndBranch(repoDirectory);
    // Subtract $BRANCH_NAME from $UPSTREAM_REMOTE/$BRANCH_NAME.
    // We can't just split on the delineating `/`, since refnames can include `/`:
    // https://sourcegraph.com/github.com/git/git@454cb6bd52a4de614a3633e4f547af03d5c3b640/-/blob/refs.c#L52-67

    // Example:
    // stdout: remote/two/tj/feature
    // remoteName: remote/two, branch: tj/feature

    const branchPosition = upstreamAndBranch.lastIndexOf(branch);
    const maybeRemote = upstreamAndBranch.slice(0, branchPosition - 1);
    if (branchPosition !== -1 && maybeRemote) {
      remoteName = maybeRemote;
    }
  } catch {
    // noop. Upstream may not be set.
  }

  // If we cannot find the remote name deterministically, we use the first
  // Git remote found.
  if (!remoteName) {
    if (remotes.length > 1) {
      console.log(`no upstream found, using first git remote: ${remotes[0]}`);
    }
    remoteName = remotes[0];
  }

  // Throw if a remote still isn't found
  if (!remoteName) {
    throw new Error("no configured git remotes");
  }

  return { remoteName, branch };
}

export const gitHelpers = {
  /**
   * Returns the repository root directory for any directory within the
   * repository.
   */
  async rootDirectory(): Promise<string> {
    const options = {
      args: ["rev-parse", "--show-toplevel"],
      cwd: nova.workspace.path,
    };

    try {
      const stdout = await gitPromise(options);
      return stdout;
    } catch (err) {
      emitNotification(
        nova.localize("Something's gone wrong."),
        nova.localize(`Unable to fetch git root directory. ${err}`)
      );
    }

    return "";
  },

  /**
   * Returns the names of all git remotes, e.g. ["origin", "foobar"]
   *  TODO: Add ability to fetch multiple lines from processPromise. Right now
   *  this will just return the first remote.
   */
  async remotes(repoDirectory: string): Promise<string[]> {
    const options = {
      args: ["remote"],
      cwd: repoDirectory,
    };
    try {
      const stdout = await gitPromise(options);
      return stdout.split("\n");
    } catch (err) {
      emitNotification(
        nova.localize("Something's gone wrong."),
        nova.localize(`Unable to fetch git remotes. ${err}`)
      );
    }

    return [""];
  },

  /**
   * Returns the remote URL for the given remote name.
   * e.g. `origin` -> `git@github.com:foo/bar`
   */
  async remoteUrl(remoteName: string, repoDirectory: string): Promise<string> {
    const options = {
      args: ["remote", "get-url", remoteName],
      cwd: repoDirectory,
    };

    try {
      const stdout = await gitPromise(options);
      return stdout;
    } catch (err) {
      emitNotification(
        nova.localize("Something's gone wrong."),
        nova.localize(`Unable to fetch git remote URL. ${err}`)
      );
    }

    return "";
  },

  /**
   * Returns either the current branch name of the repository OR in all
   * other cases (e.g. detached HEAD state), it returns "HEAD".
   */
  async branch(repoDirectory: string): Promise<string> {
    const options = {
      args: ["rev-parse", "--abbrev-ref", "HEAD"],
      cwd: repoDirectory,
    };

    try {
      const stdout = await gitPromise(options);
      return stdout;
    } catch (err) {
      emitNotification(
        nova.localize("Something's gone wrong."),
        nova.localize(`Unable to fetch git branch. ${err}`)
      );
    }

    return "";
  },

  /**
   * Returns a string in the format $UPSTREAM_REMOTE/$BRANCH_NAME, e.g. "origin/branch-name", throws if not found
   */
  async upstreamAndBranch(repoDirectory: string): Promise<string> {
    var options = {
      args: ["rev-parse", "--abbrev-ref", "HEAD@{upstream}"],
      cwd: repoDirectory,
    };

    try {
      const stdout = await gitPromise(options);
      return stdout;
    } catch (err) {
      emitNotification(
        nova.localize("Something's gone wrong."),
        nova.localize(`Unable to fetch git upstream and branch. ${err}`)
      );
    }

    return "";
  },
};

function getDefaultBranch(): string {
  return (
    nova.workspace.config.get(
      "com.harrytwyford.sourcegraph.config.defaultBranch",
      "string"
    ) || ""
  );
}
