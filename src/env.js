// https://www.jvandemo.com/how-to-use-environment-variables-to-configure-your-angular-application-without-a-rebuild/
(function (window) {
  window.__env = window.__env || {};

  // environment-dependent settings
  window.__env.apiUrl = "http://localhost:5275/";
  window.__env.https = false;
  window.__env.version = "0.0.10";
  window.__env.cacheDisabled = false;
})(this);
