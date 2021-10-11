# CXServer

ContentTranslation is a tool that allows editors to translate pages from one
language to another with the help of machine translation and other translation
tools.

This is the server component of ContentTranslation.

## Installation

Install the dependencies:

```$ npm install```

## Running the server

```lang=bash
npm start
```

Then browse to ```http://localhost:8080/v2```

## Configuration

An default configuration file is given as config.dev.yaml. Copy it to
config.yaml to customize. Restart server to read changes.

To know more about registry configuration, see doc/Registry.md

## Developing and Debugging

```lang=bash
npm run dev
```

This will run the application in hot reload mode. It means, your code changes
will be immediately reflected in the running server.

This will also enable [nodejs debugging](https://nodejs.org/en/docs/guides/debugging-getting-started/)
in port 9229. To debug in Chrome dev tools, launch `chrome://inspect/` in
Chrome browser. You will see a remote target listed there, corresponding to
cxserver.

If you are using an IDE like VS Code, it can connect to this debugging port and
you can debug directly from your IDE. From 'Debug' menu, select 'attach'. Note
that your launch configuration should look like as follows. The `remoteRoot` is
important

```lang=json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "attach",
            "name": "Attach",
            "port": 9229,
            "localRoot": "${workspaceRoot}/",
            "remoteRoot": "/usr/src/app/"
        },
        {
            "type": "node",
            "request": "launch",
            "name": "Launch Program",
            "program": "${workspaceFolder}/app.js"
        }
    ]
}
```

### Developing using Docker

If you are familiar with Docker, this application can be developed easily using
docker. From the cxserver directory, run this command once to install dependencies

```lang=bash
docker-compose run cxserver npm install
```

Then

```lang=bash
docker-compose up
```

This will start the cxserver in port 4000 (configurable by editing
docker-compose.yaml) and you can launch the browser to localhost:4000/v2. This
will also include hot reloading of your source code changes and opening up the
debugger port as explained above.

## Testing

To run the tests:

```npm test```
