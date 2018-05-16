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

```$ npm start```

Then browse to ```http://localhost:8080/v1```. You'll see the server playground
page.

Configuration
-------------
An default configuration file is given as config.dev.yaml. Copy it to config.yaml
to customize. Restart server to read changes.

To know more about registry configuration, see doc/Registry.md

Debugging
---------
You can debug ContentTranslation with Chrome developer tools and inbuilt
debugger from nodejs just like a web application. You can also edit the code
and save from the debugger.

Testing
-------
To run the tests:

```$ npm test```
