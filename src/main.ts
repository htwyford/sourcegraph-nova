import {
  emitNotification,
  openUrlAndMaybeLog,
  getSourcegraphUrl,
} from "./utils";

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
          const url =
            `${getSourcegraphUrl()}` +
            `?search=${encodeURIComponent(reply.textInputValue)}`;

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

// TODO: Fetch remote URL and add it to the URL. Until that is done, this action is disabled.
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

  // TODO: Nova returns oddly high values for editor.selectedRange. For the line below,
  // we get the value [3219, 3219].
  const lineRange = editor.getLineRangeForRange(editor.selectedRange);
  openUrlAndMaybeLog(
    `${getSourcegraphUrl()}` +
      `?file=${encodeURIComponent(relativePath)}` +
      `&start_row=${encodeURIComponent(lineRange.start)}` +
      `&start_col=${encodeURIComponent(String(editor.selectedRange.start))}` +
      `&end_row=${encodeURIComponent(String(lineRange.end))}` +
      `&end_col=${encodeURIComponent(String(editor.selectedRange.end))}`
  );
});
