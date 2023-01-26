export function emitNotification(title: string, body: string) {
  const request = new NotificationRequest(
    "com.harrytwyford.sourcegraph.notification"
  );
  request.title = nova.localize(title);
  request.body = nova.localize(body);
  nova.notifications.add(request);
}

export function openUrlAndMaybeLog(url: string) {
  if (nova.inDevMode()) {
    console.log(url);
  }
  nova.openURL(url);
}

function getConfigUrl() {
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
  return configUrl;
}

export function getQueryUrl(
  query: string,
  remoteURL?: string,
  branch?: string,
  fileRelative?: string
) {
  const url = getConfigUrl();
  const parameters = {
    search: encodeURIComponent(query),
    remote_url: encodeURIComponent(remoteURL || ""),
    branch: encodeURIComponent(branch || ""),
    file: encodeURIComponent(fileRelative || ""),
  };
  const uri = new URL("/-/editor", url);
  const parametersString = new URLSearchParams({ ...parameters }).toString();
  uri.search = parametersString;
  return uri.href;
}

/**
 * Uses editor endpoint to construct Sourcegraph file URL
 */
export function getOpenUrl(
  remoteURL: string,
  branch: string,
  fileRelative: string,
  editor: TextEditor
): string {
  const url = getConfigUrl();

  // TODO: Nova returns oddly high values for editor.selectedRange.
  const lineRange = editor.getLineRangeForRange(editor.selectedRange);

  const parameters = {
    remote_url: encodeURIComponent(remoteURL),
    branch: encodeURIComponent(branch),
    file: encodeURIComponent(fileRelative),
    start_row: encodeURIComponent(lineRange.start),
    start_col: encodeURIComponent(editor.selectedRange.start),
    end_row: encodeURIComponent(lineRange.end),
    end_col: encodeURIComponent(editor.selectedRange.end),
  };
  const uri = new URL("/-/editor", url);
  const parametersString = new URLSearchParams({ ...parameters }).toString();
  uri.search = parametersString;
  return uri.href;
}
