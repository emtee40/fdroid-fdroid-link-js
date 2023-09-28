// SPDX-FileCopyrightText: 2023 Michael Pöhn <michael.poehn@fsfe.org>
// SPDX-License-Identifier: AGPL-3.0-or-later

const trustedRepos = [
    "f-droid.org/repo",
    "f-droid.org/archive",
    "f-droid.org/fdroid/repo",
    "f-droid.org/fdroid/archive",
    "fdroidorg6cooksyluodepej4erfctzk7rrjpjbbr6wx24jh3lqyfwyd.onion/fdroid/repo",
    "fdroidorg6cooksyluodepej4erfctzk7rrjpjbbr6wx24jh3lqyfwyd.onion/fdroid/archive",
];

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

const sanitizedQueryParamOrNull = function (urlObj, ) {
    
}

const fingerprintRegex = /[0-9a-fA-F]{64}/;
const repoPathRegex = /(\/fdroid\/repo|f-droid\.org\/repo)/;

const parseFDroidLink = function(locationUrl) {
  const err = [];
  const warn = [];

  const hasHash = (new URL(window.location)).hash.length > 0;
  const url = new URL(urlFragmentToQuery(window.location));

  if (duplicatesInSearchParams(url.searchParams)) {
    err.push('parameter duplicates are not allowed');
  }

  if (!url.searchParams.has("repo")) {
    err.push('parameter missing: repo');
  }

  for (const key of url.searchParams.keys()) {
    if (!["repo", "fingerprint", "package"].includes(key)) {
      err.push(`parameter not supported: ${encodeURI(key)}`);
    }
  }

  var repo = encodeURI(stripTrailingQuestionmark(
    filterXSS(url?.searchParams?.get('repo'))
  ));
  if (repo !== null && !repoPathRegex.test(repo)) {
    warn.push("repo address might be malformed (missing '/fdroid/repo')");
  }

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
    scheme = "http";
    // http is allowed when explicitly requested
    // (useful for debugging and testing)
    warn.push("not using https");
  } else if (repo.startsWith("fdroidrepos://")) {
    repo = repo.replace("fdroidrepos://", "");
  }

  if ( ! trustedRepos.includes(repo) ) {
    warn.push("3rd party repository: F-Droid does not check apps in this repository for anti-features, trackers or malware!");
  }

  var fingerprint = encodeURI(stripTrailingQuestionmark(filterXSS(url.searchParams?.get('fingerprint'))));
  if ( fingerprint.length == 0 ) {
    warn.push("fingerprint missing");
  } else if(!fingerprintRegex.test(fingerprint)) {
    warn.push("fingerprint malformed");
  }

  var args = [];

  if (fingerprint) {
    args.push(`fingerprint=${fingerprint}`);
  }

  var argsString = "";
  if (args.length > 0) {
    argsString = args.join("&");
  }

  const repoScheme = scheme === "http" ? "fdroidrepo" : "fdroidrepos";

  return {
    // repo: encodeURI(repo),
    // packageName: encodeURI(url?.searchParams?.get('package')),
    // fingerprint: encodeURI(fingerprint),
    windowLocationHasHash: hasHash,
    repoLink: encodeURI(`${repoScheme}://${repo}?${argsString}`),
    httpAddress: encodeURI(`${scheme}://${repo}?${argsString}`),
    httpLink: encodeURI(`https://fdroid.link/#repo=${scheme}://${repo}&${argsString}`),
    err: err ?? [],
    warn: warn ?? [],
  };
}

const renderErrors = function(err) {
  if (err.length > 0) {
    const errList = err.join("</li><li>");
    return `
      <div class="flx-c-row err-frame">
        <h2 class="flx-i-start m-0">🚫</h2>
        <ul class="flx-i-start m-0"><li>${errList}</li></ul>
      </div>
    `;
  }
  return "";
}

const renderWarnings = function(warn) {
  if (warn.length > 0) {
    const warnList = warn.join("</li><li>");
    return `
      <div class="flx-c-row warn-frame">
        <h2 class="flx-i-start m-0">⚠️</h2>
        <ul class="flx-i-start m-0"><li>${warnList}</li></ul>
      </div>
    `;
  }
  return "";
}

const renderLink = function(lnk) {
  return `
    <div class="row">
      <div class="link-block col-md-4 p-top-4 p-bottom-2">
        <center>
          <a href="${lnk.httpLink}">
            <p class="big-icon-font">📋</p>
            <p class="txt-normal-color">
              Share Repo link
            </p>
            <small class="word-wrap-break-word">${lnk.httpLink}</small>
          </a>
        </center>
        <p class="p-top-2 txt-justify"><small>
          Recommended universal F-Droid repository link format. Links like this
          should work well in almost all situations and places.
        </small></p>
      </div>
      <div class="link-block col-md-4 p-top-4 p-bottom-2">
        <center>
          <a href="${lnk.repoLink}">
            <p class="big-icon-font">📲</p>
            <p class="txt-normal-color">
	      Android Repo link
            </p>
            <small class="word-wrap-break-word">${lnk.repoLink}</small>
          </a>
        </center>
        <p class="p-top-2 txt-justify"><small>
          This is a standardized link format which in theory should work to uniquely
          identify an F-Droid repository everywhere. In practice many apps
          do not support custom URL schemas, so links like this won't be clickable
          in most places.
        </small></p>
      </div>
      <div class="link-block col-md-4 p-top-4 p-bottom2">
        <center>
          <a href="${lnk.httpAddress}">
            <p class="big-icon-font">🌐</p>
            <p class="txt-normal-color">
              Repo Web link
            </p>
            <small class="word-wrap-break-word">${lnk.httpAddress}</small>
          </a>
        </center>
        <p class="p-top-2 txt-justify"><small>
          This is the actual location of the repository on the Internet. This
          link format became impractical when Google started pushing-back
          against 3rd party client apps.
        </small></p>
      </div>
    </div>
  `;
}

const renderFooter = function() {
  return ` (${fdroidLinkJsVersion})`;
}

const run = function() {
  const lnk = parseFDroidLink(window.location)

  if (lnk.windowLocationHasHash) {
    document.getElementById("err").innerHTML = renderErrors(lnk.err);
    document.getElementById("warn").innerHTML = renderWarnings(lnk.warn);
    if (lnk.err.length <= 0) {
      document.getElementById("link").innerHTML = renderLink(lnk);
    }
    document.getElementById("appVersion").innerHTML = renderFooter();
    document.getElementById("welcome-message").innerHTML = "";
  }
}

run();
addEventListener("hashchange", (event) => { run(); });
