function emitNotification(title: string, body: string) {
  const request = new NotificationRequest(
    "com.harrytwyford.sourcegraph.notification"
  );

  request.title = nova.localize(title);
  request.body = nova.localize(body);

  const promise = nova.notifications.add(request);
  promise.then(
    (reply) => {
      console.log(reply);
    },
    (error) => {
      console.error(error);
    }
  );
}

nova.commands.register(
  "com.harrytwyford.sourcegraph.searchInSourcegraph",
  (editor) => {
    let selectedRange = editor.selectedRange;
    console.log("start)");

    if (selectedRange.empty) {
      editor.selectWordsContainingCursors();
      selectedRange = editor.selectedRange;
    }

    if (selectedRange.empty) {
      emitNotification("Failed to search in Sourcegraph", "No text detected.");
      return;
    }

    const text = editor.getTextInRange(selectedRange);

    const queryUrlStr = nova.workspace.config.get(
      "com.harrytwyford.sourcegraph.config.queryUrl",
      "string"
    );
    if (!queryUrlStr) {
      emitNotification(
        "Failed to search in Sourcegraph",
        "Please check that a query URL is set in Settings."
      );
      return;
    }

    const queryUrl = new URL(queryUrlStr);
    queryUrl.searchParams.set("q", text);

    console.log(queryUrl);
    nova.openURL(queryUrl.toString());
  }
);
