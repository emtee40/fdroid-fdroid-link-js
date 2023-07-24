// SPDX-FileCopyrightText: 2023 Michael Pöhn <michael.poehn@fsfe.org>
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * replace the first occurence of the character '#' with '?' in a string.
 */
const urlFragmentToQuery = function(url) {
    const urlFragSplit = String(url).split("#");
    return urlFragSplit[0] + "?" + urlFragSplit.slice(1, urlFragSplit.length).join("#");
};

const duplicatesInSearchParams = function(searchParams) {
  const keys = Array.from(searchParams.keys());
  return !((new Set(keys)).size === keys.length);
}

const stripTrailingQuestionmark = function (str) {
  return str.endsWith("?") ? str.substring(0, str.length-1) : str;
}

const parseFDroidLink = function(locationUrl) {
  const err = [];
  const warn = [];
  const url = new URL(urlFragmentToQuery(window.location));

  if(duplicatesInSearchParams(url.searchParams)){
    err.push('parameter duplicates are not allowed');
  }

  if(!url.searchParams.has("repo")) {
    err.push('parameter missing: repo');
  }

  for (const key of url.searchParams.keys()) {
    if (!["repo", "fingerprint", "package"].includes(key)) {
      err.push(`parameter not supported: ${key}`);
    }
  }

  var repo = stripTrailingQuestionmark(
    filterXSS(url?.searchParams?.get('repo'))
  );

  // always assume https if no scheme is specified
  var scheme = "https";
  if (repo.startsWith("http://")) {
    repo = repo.replace("http://", "");
    scheme = "http";
    // http is allowed when explicitly requested
    // (useful for debugging and testing)
    warn.push("not using https");
  } else if (repo.startsWith("https://")) {
    repo = repo.replace("https://", "");
  } else if (repo.startsWith("fdroidrepo://")) {
    repo = repo.replace("fdroidrepo://", "");
  } else if (repo.startsWith("fdroidrepos://")) {
    repo = repo.replace("fdroidrepos://", "");
  }

  var fingerprint = stripTrailingQuestionmark(
    filterXSS(url?.searchParams?.get('fingerprint'))
  );

  var args = [];

  if (fingerprint) {
    args.push(`fingerprint=${fingerprint}`);
  }

  argsString = "";
  if (args.length > 0) {
    argsString = `?${args.join("&")}`;
  }

  return {
    // repo: encodeURI(repo),
    // packageName: encodeURI(url?.searchParams?.get('package')),
    // fingerprint: encodeURI(fingerprint),
    repoLink: `fdroidrepo://${repo}${argsString}`,
    httpLink: `${scheme}://${repo}${argsString}`,
    err: err ?? [],
    warn: warn ?? [],
  };
}

const renderErrors = function(err) {
  if (err.length > 0) {
    const errList = err.join("</li><li>");
    return `
      <h2>errors</h2>
      <ul><li>${errList}</li></ul>
    `;
  }
  return "";
}

const renderWarnings = function(warn) {
  if (warn.length > 0) {
    const warnList = warn.join("</li><li>");
    return `
      <h2>warnings</h2>
      <ul><li>${warnList}</li></ul>
    `;
  }
  return "";
}

const renderLink = function(lnk) {
  return `
    <a href="${lnk.repoLink}">${lnk.repoLink}</a>
    <br />
    <a href="${lnk.httpLink}">${lnk.httpLink}</a>
  `;
}

const renderFooter = function() {
  return `
    F-Droid Link JS (${fdroidLinkJsVersion}),
    © 2023 The F-Droid Team,
    AGPL-3.0-or-later
    (<a href="https://gitlab.com/uniqx/fdroid-link-js">source code</a>)
  `;
}

const run = function() {
  const lnk = parseFDroidLink(window.location)
  document.getElementById("err").innerHTML = renderErrors(lnk.err);
  document.getElementById("warn").innerHTML = renderWarnings(lnk.warn);
  if (lnk.err.length <= 0) {
    document.getElementById("link").innerHTML = renderLink(lnk);
  }
  document.getElementById("footer").innerHTML = renderFooter();
}

run();
