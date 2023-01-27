import {
  emitNotification,
  openUrlAndMaybeLog,
  getQueryUrl,
  getOpenUrl,
} from "./utils";

import { repoInfo, RepositoryInfo } from "./git";

nova.commands.register(
  "com.harrytwyford.sourcegraph.searchSelection",
  (editor) => {
    let selectedRange = editor.selectedRange;

    if (selectedRange.empty) {
      editor.selectWordsContainingCursors();
      selectedRange = editor.selectedRange;
    }

    if (selectedRange.empty) {
      emitNotification(
        nova.localize("Failed to search in Sourcegraph"),
        nova.localize("No text detected.")
      );
      return;
    }

    const query = editor.getTextInRange(selectedRange);

    const repoPromise = repoInfo(editor.document.uri.fsPath);
    repoPromise.then((repositoryInfo: RepositoryInfo | undefined) => {
      let url = "";
      if (!repositoryInfo) {
        url = getQueryUrl(query);
      } else {
        const { remoteURL, branch, fileRelative } = repositoryInfo;
        url = getQueryUrl(query, remoteURL, branch, fileRelative);
      }
      openUrlAndMaybeLog(url);
    });
  }
);

nova.commands.register(
  "com.harrytwyford.sourcegraph.searchString",
  (_editor) => {
    const request = new NotificationRequest(
      "com.harrytwyford.sourcegraph.enterString"
    );

    request.title = nova.localize("Enter a search string");
    request.type = "input";
    request.actions = [nova.localize("Search"), nova.localize("Cancel")];

    const promise = nova.notifications.add(request);
    promise.then(
      (reply) => {
        if (reply.textInputValue) {
          const url = getQueryUrl(reply.textInputValue);
          openUrlAndMaybeLog(url);
        }
      },
      (error) => {
        emitNotification(
          nova.localize("Could not complete search."),
          nova.localize(`An error has occurred: ${error}`)
        );
      }
    );
  }
);

nova.commands.register("com.harrytwyford.sourcegraph.open", (editor) => {
  const fullPath = nova.workspace.activeTextEditor?.document.path;
  let relativePath;
  if (fullPath && nova.workspace.path) {
    relativePath = fullPath.replace(nova.workspace.path, "");
  }

  if (!relativePath) {
    emitNotification(
      nova.localize("Cannot complete search."),
      nova.localize("Unable to find active file.")
    );
    return;
  }

  const repoPromise = repoInfo(editor.document.uri.fsPath);
  repoPromise.then((repositoryInfo: RepositoryInfo | undefined) => {
    let url = "";
    if (!repositoryInfo) {
      emitNotification(
        nova.localize("Unable to open on Sourcegraph"),
        nova.localize("Cannot find repository information.")
      );
      return;
    } else {
      const { remoteURL, branch, fileRelative } = repositoryInfo;
      url = getOpenUrl(remoteURL, branch, fileRelative, editor);
    }
    openUrlAndMaybeLog(url);
  });
});
