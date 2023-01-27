import type {
  Range as LspRange,
  Position as LspPosition,
} from "vscode-languageserver-protocol";

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
  if (configUrl.endsWith("/")) {
    configUrl = configUrl.slice(0, -1);
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
  if (!url) {
    return "";
  }
  return (
    `${url}/-/editor` +
    `?search=${encodeURIComponent(query)}` +
    `&remote_url=${encodeURIComponent(remoteURL || "")}` +
    `&branch=${encodeURIComponent(branch || "")}` +
    `&file=${encodeURIComponent(fileRelative || "")}`
  );
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
  if (!url) {
    return "";
  }

  const lspRange = rangeToLspRange(editor.document, editor.selectedRange);
  if (!lspRange) {
    emitNotification(
      nova.localize("Unable to open file."),
      nova.localize("Cannot find selected range.")
    );
    return "";
  }

  console.log(`lspRange: ${JSON.stringify(lspRange)}`);

  return (
    `${url}/-/editor` +
    `?remote_url=${encodeURIComponent(remoteURL)}` +
    `&branch=${encodeURIComponent(branch)}` +
    `&file=${encodeURIComponent(fileRelative)}` +
    `&start_row=${encodeURIComponent(lspRange.start.line)}` +
    `&start_col=${encodeURIComponent(lspRange.start.character)}` +
    `&end_row=${encodeURIComponent(lspRange.end.line)}` +
    `&end_col=${encodeURIComponent(lspRange.end.character)}`
  );
}

export function rangeToLspRange(
  document: TextDocument,
  range: Range
): LspRange | null {
  const fullContents = document.getTextInRange(new Range(0, document.length));
  let chars = 0;
  let startLspRange: LspPosition | undefined;
  const lines = fullContents.split(document.eol);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const lineLength = lines[lineIndex].length + document.eol.length;
    if (!startLspRange && chars + lineLength >= range.start) {
      const character = range.start - chars;
      startLspRange = { line: lineIndex, character };
    }
    if (startLspRange && chars + lineLength >= range.end) {
      const character = range.end - chars;
      return { start: startLspRange, end: { line: lineIndex, character } };
    }
    chars += lineLength;
  }
  return null;
}
