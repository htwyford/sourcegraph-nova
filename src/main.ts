function emitNotification(title: string, body: string) {
  const request = new NotificationRequest(
    "com.harrytwyford.sourcegraph.notification"
  );

  request.title = nova.localize(title);
  request.body = nova.localize(body);

  nova.notifications.add(request);
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
  "com.harrytwyford.sourcegraph.searchInSourcegraph",
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
    // console.log(url);
    nova.openURL(url);
  }
);
