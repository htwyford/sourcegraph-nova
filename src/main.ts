function emitNotification(title: string, body: string) {
  const request = new NotificationRequest(
    "com.harrytwyford.sourcegraph.notification"
  );

  request.title = nova.localize(title);
  request.body = nova.localize(body);

  nova.notifications.add(request);
}

nova.commands.register(
  "com.harrytwyford.sourcegraph.searchInSourcegraph",
  (editor) => {
    console.log("start");
    let selectedRange = editor.selectedRange;

    if (selectedRange.empty) {
      editor.selectWordsContainingCursors();
      selectedRange = editor.selectedRange;
    }

    if (selectedRange.empty) {
      emitNotification("Failed to search in Sourcegraph", "No text detected.");
      return;
    }

    const text = editor.getTextInRange(selectedRange);

    const configUrl = nova.workspace.config.get(
      "com.harrytwyford.sourcegraph.config.queryUrl",
      "string"
    );
    if (!configUrl || !configUrl.includes("%s")) {
      emitNotification(
        "Failed to search in Sourcegraph",
        "Please check that a valid query URL is set in Settings."
      );
      return;
    }

    const queryUrl = configUrl.replace("%s", encodeURIComponent(text));

    console.log(queryUrl);
    nova.openURL(queryUrl.toString());
  }
);
