HTTP Proxy
==========

A local http proxy. Useful when you have two or more local http servers and want to
access them all via the same URL, like `http://localhost`.

# Quick start

Create a configuration file, for example `conf/app.json`:

```
{
  "port": 80,
  "proxy": {
    "rules": {
      "/api1": "http://localhost:8081",
      "/api2": "http://localhost:8082"
    },
    "default": "http://localhost:8080"
  }
}
```

This configuration file will cause the http proxy to listen on port 80,
proxy all requests to `/api1` to `http://localhost:8081`, proxy all requests
to `/api2` to `http://localhost:8082`, and all other requests to
`http://localhost:8080`. In this example, the is an http server on port 8080
that servers the website static files, and two separate http servers on ports
8081 and 8082 that each serve an API.

Then start the service:

```
node src/index.js --conf conf/app.json
```

# Configuration

The http proxy port can be specified with the `port` attribute in the
configuration file, or with the environment variable `PORT`, or with the
default value of `80`.

The proxy rules including default route MUST be specified in the configuration file.

The path to the configuration file can be specified with the `--conf` command
line option or with the environment variable `HTTP_PROXY_CONFIG_PATH`.

Example configuration file to serve anything that routes to localhost:

```
{
  "port": 80,
  "vhost": {
    "_default": {
      "proxy": {
        "rules": {
          "/api": "http://localhost:7522/api"
        },
        "default": "http://localhost:7523"
      }    
    }
  }
}
```

Example configuration file with one virtual host and no default:

```
{
  "port": 80,
  "vhost": {
    "my-virtual-host.test": {
      "proxy": {
        "rules": {
          "/api": "http://localhost:7522/api"
        },
        "default": "http://localhost:7523"
      }    
    }
  }
}
```

Example configuration file with two virtual hosts and a default:

```
{
  "port": 80,
  "vhost": {
    "vhost1.test": {
      "proxy": {
        "rules": {
          "/api": "http://localhost:7522/api"
        },
        "default": "http://localhost:7523"
      }    
    },
    "vhost2.test": {
      "proxy": {
        "rules": {
          "/api": "http://localhost:7524/api"
        },
        "default": "http://localhost:7525"
      }
    },
    "_default": {
      "proxy": {
        "default": "http://localhost:7527"
      }    
    }
  }
}
```

# Developer setup

The `./conf` directory is listed in the `.gitignore` file so you can place
configuration files there for local use. 

# Operation

## Environment variables

PORT
: where the proxy should accept connections
: an integer, e.g. `80`

Linux:

```
export PORT=80
```

Windows PowerShell:

```
$env:PORT="80"
```

## Start

```
node src/index.js --conf path/to/config/file.json
```

## Stop

Sometimes `Ctrl+C` doesn't work to stop the service, so the alternative is
to navigate to `http://localhost:81` in your browser (this URL is displayed
when the service starts) and this will shutdown the service immediately.
