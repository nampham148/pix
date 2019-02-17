function urlencode(s) {
  return s.replace(/:/g, "%3A").replace(/\//g, "%2F");
}

module.exports = function(params) {
  let s = "https://accounts.google.com/o/oauth2/v2/auth?";
  let redirect_uri = params["redirect_uri"];
  s += "redirect_uri=" + urlencode(redirect_uri);
  s += "&prompt=consent&response_type=code&";
  let client_id = params["client_id"];
  s += "client_id=" + client_id;
  let scope = params["scope"];
  s += "&scope=" + urlencode(scope) + "&access_type=offline";
}