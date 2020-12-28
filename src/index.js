/* eslint-disable */

const assert = require('assert');
const http = require('http'); // a node built-in module (https://nodejs.org/api/http.html), NOT the npmjs package
const httpProxy = require('http-proxy');
const HttpProxyRules = require('http-proxy-rules');
const fs = require('fs');
const yargs = require('yargs');

const { argv } = yargs
    .scriptName('http-proxy')
    .option('conf', {
        describe: 'path to configuration file',
        type: 'string',
        requiresArg: true,
    })
    .strict();

let conf = null;
if (argv.conf) {
  if (fs.existsSync(argv.conf)) {
    const text = fs.readFileSync(argv.conf).toString();
    conf = JSON.parse(text);
  }
  else {
    console.log(`file not found: ${argv.conf}`);
    process.exit(1);
  }
} else {
  const { HTTP_PROXY_CONFIG_PATH } = process.env;

  if (HTTP_PROXY_CONFIG_PATH && fs.existsSync(HTTP_PROXY_CONFIG_PATH)) {
    const text = fs.readFileSync(argv.conf).toString();
    conf = JSON.parse(text);
  }  
}

if (!conf) {
  console.log(`error: configuration file is required`);
  process.exit(1);
}

let PORT = conf.port;
if (!PORT) {
  PORT = process.env.PORT;
}

// validate configuration settings
assert(PORT, 'port is required; specify in configuration file or in process.env.PORT');

// check if we have virtual host definitions, each with their own proxy rules; otherwise, just take the entire configuration as a default vhost definition
const vhost = conf['vhost'] || { '_default': conf };
const vhostRules = {};
Object.getOwnPropertyNames(vhost).forEach((item) => {
  let vhostName = (''+item).toLowerCase(); // vhost names can only be lowercase strings
  vhostRules[vhostName] = new HttpProxyRules(vhost[item].proxy);
});
//const configuredProxyRules = conf['proxy'];
//assert(configuredProxyRules, 'proxy is required; specify in configuration file');

// var proxyRules = new HttpProxyRules(configuredProxyRules);

const proxyOptions = {
  prependPath: true,
}

const proxyHandler = httpProxy.createProxyServer(proxyOptions);
const httpHandler = http.createServer(function (req, res) {
  // req object contains the following keys: "_readableState","readable","_events","_eventsCount","_maxListeners","socket","connection","httpVersionMajor","httpVersionMinor","httpVersion","complete","headers","rawHeaders","trailers","rawTrailers","aborted","upgrade","url","method","statusCode","statusMessage","client","_consuming","_dumped"
  // the "url" property value only contains the path like "/" or "/favicon.ico"
  // the "headers" property value is an object that contains the following keys: "host", "connection", "cache-control", "upgrade-insecure-requests", "user-agent", "accept", "accept-encoding", "accept-language"
  // look for a matching virtual host using the http 'host' header
  // NOTE: `req` is the standard nodejs request object, NOT an express.js request object, so we don't have req.hostname
  let vhostName = (''+req.headers.host).toLowerCase(); // vhost names can only be lowercase strings
  // if (!vhostName.match(/^[a-z0-9](?:[a-z0-9]|-[a-z0-9])(?:\.[a-z0-9](?:[a-z0-9]|-[a-z0-9]))*$/)) {
  //  TODO: validate the hostname with a regular expression; the one above hasn't been tested but it's meant to be very simple,
  //  just ensure that each domain part has only letters, digits, and hyphens, and that each domain part does not start or end
  //  with a hyphen, and that if there's a period then it's followed by another valid domain part.
  //  another validation should be that the total length is less than 256, before we even do the regular expression match.
  //  also our expression should allow "localhost" to match even though it's not a domain name
  // }
  let vhostMatch;
  if (vhost[vhostName]) {
    vhostMatch = vhostName;
  } else if (vhost._default) {
    vhostMatch = '_default';
  } else {
    vhostMatch = null;
  }

  console.log(`vhostMatch: ${vhostName} ${req.url} -> ${vhostMatch}`);
  // let target = proxyRules.match(req);
  if(vhostMatch) {
    try {
      let target = vhostRules[vhostMatch].match(req);
      proxyHandler.web(req, res, { target }, function (err) {
        // handle an error from the proxied request, for example connection refused or connection timeout
        console.error('http proxy failed', err);
        res.writeHead(502, {'Content-Type': 'text/plain'});
        res.end('Bad gateway');
      });
    }
    catch(err) {
      // handle an error from our code like .match or the proxyHandler.web function before it makes the proxied request
      console.error('http proxy failed', err);
      res.writeHead(502, {'Content-Type': 'text/plain'});
      res.end('Bad gateway');
    }
  }
  else {
    res.writeHead(404, {'Content-Type': 'text/plain'});
    res.end(`Not configured for site: ${vhostName}`);
  }
});
/*
httpHandler.on('upgrade', function(req, socket, head) {
  console.log('websocket request'); // : %o', req);
  try {
    proxyHandler.ws(req, socket, head);
  }
  catch(err) {
    console.error('websocket proxy failed', err);
  }
});
*/

httpHandler.listen(PORT);

console.log('http service started on port %s', PORT);
console.log('to shutdown the service, connect to http://localhost:81');

// sometimes ctrl+c in terminal doesn't stop the proxy, so this
// second listener can just be accessed like http://localhost:81 to
// shutdown the proxy
const shutdownHttpHandler = http.createServer(function (req, res) {
  console.info('shutdown');
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('OK');
  process.exit(0);
});
shutdownHttpHandler.listen(81);


['SIGINT', 'SIGTERM', 'SIGQUIT']
  .forEach(signal => process.on(signal, async () => {
      // shutdown express server
      httpHandler.close(() => {
        console.log(`http service caught signal: ${signal}`);
        process.exit();
      });
  }));

