// SPDX-FileCopyrightText: 2023 Michael Pöhn <michael.poehn@fsfe.org>
// SPDX-License-Identifier: AGPL-3.0-or-later

const FINGERPRINT_OFFICIAL = "43238D512C1E5EB2D6569F4A3AFBF5523418B82E0A3ED1552770ABB9A9C9CCAB";
const REPOS_OFFICIAL = [
    "f-droid.org/repo",
    "f-droid.org/archive",
    "f-droid.org/fdroid/repo",
    "f-droid.org/fdroid/archive",
    "fdroidorg6cooksyluodepej4erfctzk7rrjpjbbr6wx24jh3lqyfwyd.onion/fdroid/repo",
    "fdroidorg6cooksyluodepej4erfctzk7rrjpjbbr6wx24jh3lqyfwyd.onion/fdroid/archive",
];


const duplicatesInSearchParams = function(searchParams) {
  const keys = Array.from(searchParams.keys());
  return !((new Set(keys)).size === keys.length);
}


const fingerprintRegex = /[0-9a-fA-F]{64}/;
const repoPathRegex = /(\/fdroid\/repo|f-droid\.org\/repo|\/fdroid\/archive|f-droid\.org\/archive)$/;


// Parse a link of the form
// https://fdroid.link/#https://mirror.example.com/fdroid/repo?fingerprint=43238D512C1E5EB2D6569F4A3AFBF5523418B82E0A3ED1552770ABB9A9C9CCAB
const parseFDroidLink = function(location) {
  const err = [];
  const warn = [];
  const info = [];

  // Get the repo url, stripping the leading fdroid.link part (by taking the hash) and the #
  var rawRepoUrl = new URL(location).hash.replace("#", "")

  // Normalise fdroidrepo[s]:// to http[s]://, since browsers' URL class won't recognise the custom scheme.
  rawRepoUrl = rawRepoUrl.replace("fdroidrepos://", "https://").replace("fdroidrepo://", "http://");

  var repoUrl;
  try {
    repoUrl = new URL(rawRepoUrl);
  } catch (e) {
    err.push("Repo URL not parseable");
    return {
      err: err,
      warn: warn,
    };
  }

  // Get a clean repo URL. Just host (includes possible ports) and path. No scheme, no search parameters.

  if (repoUrl.pathname === null || repoUrl.pathname.length == 0 || repoUrl.pathname == "/") {
    warn.push("Path missing")
  }

  if (repoUrl.host.length == 0) {
    warn.push("Repo address might be malformed (missing host or scheme)");
  }

  var repoUrlPlain = repoUrl.host + repoUrl.pathname;
  if (repoUrlPlain !== null && !repoPathRegex.test(repoUrlPlain)) {
    warn.push("Repo address might be malformed (missing '/fdroid/repo')");
  }

  // Handle search parameters

  if (duplicatesInSearchParams(repoUrl.searchParams)) {
    err.push('Duplicate parameter are not allowed');
  }

  for (const key of repoUrl.searchParams.keys()) {
    if (!["fingerprint"].includes(key)) {
      err.push(`Parameter not supported: '${filterXSS(key)}'`);
    }
  }

  var fingerprint = repoUrl.searchParams?.get('fingerprint');
  if ( fingerprint === null || fingerprint.length == 0 ) {
    warn.push("Fingerprint missing. The fingerprint is important to ensure the repository is signed by a trusted key.");
  } else if(!fingerprintRegex.test(fingerprint)) {
    warn.push("Fingerprint malformed");
  }

  if (! REPOS_OFFICIAL.includes(repoUrlPlain)) {
    if (fingerprint === FINGERPRINT_OFFICIAL ){
      info.push("This is a mirror of the main F-Droid repo. Its content is signed by F-Droid and checked for anti-features, trackers, and malware.");
    } else {
      warn.push("This is a third-party repository. F-Droid does not check apps in this repository for anti-features, trackers, or malware!");
    }
  }

  var args = [];

  if (fingerprint) {
    args.push(`fingerprint=${fingerprint}`);
  }

  var argsString = "";
  if (args.length > 0) {
    argsString = "?" + args.join("&");
  }

  // http is allowed when explicitly requested
  // (useful for debugging and testing)
  const isSecure = repoUrl.protocol == "https:";
  const repoScheme = isSecure ? "fdroidrepos" : "fdroidrepo";
  const httpScheme = isSecure ? "https" : "http";

  return {
    repoLink: encodeURI(`${repoScheme}://${repoUrlPlain}${argsString}`),
    httpAddress: encodeURI(`${httpScheme}://${repoUrlPlain}${argsString}`),
    httpLink: encodeURI(`https://fdroid.link/#${httpScheme}://${repoUrlPlain}${argsString}`),
    err: err,
    warn: warn,
    info: info,
  };
}

const renderErrors = function(err) {
  if (err.length > 0) {
    const errList = err.join("</li><li>");
    return `
      <div class="flx-c-row err-frame">
        <h2 class="flx-i-start m-0">🚫</h2>
        <ul class="flx-i-start m-0"><li>${filterXSS(errList)}</li></ul>
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
        <ul class="flx-i-start m-0"><li>${filterXSS(warnList)}</li></ul>
      </div>
    `;
  }
  return "";
}

const renderInfos = function(info) {
  if (info.length > 0) {
    const infoList = info.join("</li><li>");
    return `
      <div class="flx-c-row info-frame">
        <h2 class="flx-i-start m-0">ℹ️</h2>
        <ul class="flx-i-start m-0"><li>${filterXSS(infoList)}</li></ul>
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
          <a href="${encodeURI(filterXSS(lnk.httpLink))}">
            <p class="big-icon-font">📋</p>
            <p class="txt-normal-color">
              Share Repo Link
            </p>
            <small class="word-wrap-break-word">${encodeURI(filterXSS(lnk.httpLink))}</small>
          </a>
        </center>
        <p class="p-top-2 txt-justify"><small>
          This link is in F-Droid's universal repository link format.
          It is recommended for sharing links to repositories.
          This link will directly open in F-Droid (if F-Droid is installed),
          otherwise it will open this page in the browser.
        </small></p>
      </div>
      <div class="link-block col-md-4 p-top-4 p-bottom-2">
        <center>
          <a href="${encodeURI(filterXSS(lnk.repoLink))}">
            <p class="big-icon-font">📲</p>
            <p class="txt-normal-color">
              Android Deep Link
            </p>
            <small class="word-wrap-break-word">${encodeURI(filterXSS(lnk.repoLink))}</small>
          </a>
        </center>
        <p class="p-top-2 txt-justify"><small>
          This link will open the repository directly in F-Droid (if you are on Android and have F-Droid installed).
        </small></p>
      </div>
      <div class="link-block col-md-4 p-top-4 p-bottom2">
        <center>
          <a href="${encodeURI(filterXSS(lnk.httpAddress))}">
            <p class="big-icon-font">🌐</p>
            <p class="txt-normal-color">
              Repo Web Link
            </p>
            <small class="word-wrap-break-word">${encodeURI(filterXSS(lnk.httpAddress))}</small>
          </a>
        </center>
        <p class="p-top-2 txt-justify"><small>
          This link is a normal link pointing to the location of the repository on the Internet.
        </small></p>
      </div>
    </div>
  `;
}

const renderFooter = function() {
  return ` (${fdroidLinkJsVersion})`;
}

const run = function () {
  if (window.location.hash.length > 0) {
    const lnk = parseFDroidLink(window.location)
    document.getElementById("err").innerHTML = renderErrors(lnk.err);
    document.getElementById("warn").innerHTML = renderWarnings(lnk.warn);
    document.getElementById("info").innerHTML = renderInfos(lnk.info);
    document.getElementById("link").innerHTML = lnk.err.length <= 0 ? renderLink(lnk) : "";
    document.getElementById("welcome-message").innerHTML = "";
  }

  document.getElementById("appVersion").innerHTML = renderFooter();
}

run();
addEventListener("hashchange", (event) => { run(); });
