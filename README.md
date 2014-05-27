ContentTranslation is a tool that allows editors to translate pages from
one language to another with the help of machine translation and other
translation tools.

This is the server component of ContentTranslation.

Installation
------------
Install the dependencies:

```$ npm install```

Running the server
------------------

#### Using ```node```

```
$ node Server.js
```

#### Using ```npm```

```
$ npm start
```

#### As a ```cxserver``` command

Following step is to be performed only once. You might have to use ```sudo```.

```
$ npm link .
```

Subsequently, just use following to start the server.

```
$ cxserver
```

Then browse to ```http://localhost:8080/```. You'll see the server playground
page.

### Running it in secure mode (https)

You need to provide SSL certificate to start the server over secure mode.


#### Using ```node```
```
$ node Server.js --secure --key key.pem --cert cert.pem
```

#### As a ```cxserver``` command

Following step is to be performed only once. You might have to use ```sudo```.

```
$ npm link .
```

Subsequently, just use following to start the server.

```
$ cxserver --secure --key key.pem --cert cert.pem
```

Then browse to ```https://localhost:8080/```. You'll see the server playground
page.


Configuration
-------------
An example configuration file is given as config.example.js. Rename that file
to config.js and make your changes. Then restart the server.

Debugging
---------
To run the ContentTranslation server:

```$ npm run-script debug```

It will open Chrome developer tools with the ContentTranslation source code.
You can debug the code just like a web application. You can also edit the code
and save from the debugger.

Testing
-------
To run the tests:

```$ npm test```

To run individual test:

```$ node tests tests/path/to/individual/test```
