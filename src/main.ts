function emitNotification(title: string, body: string) {
  const request = new NotificationRequest(
    "com.harrytwyford.sourcegraph.notification"
  );

  request.title = nova.localize(title);
  request.body = nova.localize(body);

  nova.notifications.add(request);
}

function openUrlAndMaybeLog(url: string) {
  if (nova.inDevMode()) {
    console.log(url);
  }

  nova.openURL(url);
}

function getSourcegraphUrl() {
  let configUrl = nova.workspace.config.get(
    "com.harrytwyford.sourcegraph.config.queryUrl",
    "string"
  );
  if (!configUrl) {
    emitNotification(
      nova.localize("Failed to search in Sourcegraph"),
      nova.localize("Please check that a valid query URL is set in Settings.")
    );
    return;
  }
  if (!configUrl.endsWith("/")) {
    configUrl = configUrl + "/";
  }
  return configUrl + "-/editor";
}

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

    const fullPath = nova.workspace.activeTextEditor?.document.path;
    let relativePath;
    if (fullPath && nova.workspace.path) {
      relativePath = fullPath.replace(nova.workspace.path, "");
    }

    let url = `${getSourcegraphUrl()}` + `?search=${encodeURIComponent(query)}`;
    if (relativePath) {
      url = url + `&file=${encodeURIComponent(relativePath)}`;
    }

    openUrlAndMaybeLog(url);
  }
);

nova.commands.register(
  "com.harrytwyford.sourcegraph.searchString",
  (editor) => {
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
          const url =
            `${getSourcegraphUrl()}` +
            `?search=${encodeURIComponent(reply.textInputValue)}`;

          openUrlAndMaybeLog(url);
        }
      },
      (error) => {
        emitNotification(
          nova.localize("Could not complete search."),
          nova.localize("An unknown error has occurred.")
        );
      }
    );
  }
);
