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

export function getSourcegraphUrl() {
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
  return;
  configUrl + "-/editor";
}
