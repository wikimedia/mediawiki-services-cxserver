The ContentTranslation registry specifies the different language services that
this server instance provides.

The default registry includes all the services that cxserver is able to support.
You can tweak it for your site by having a different value in your registry.yaml
file. The value in registry.yaml completely overrides the defaults.

Format
------
The registry works according to language pairs. The main keys are source
languages. Under them you'll find target languages. Under the target language
key you'll find the services provided for that language.

Currently the supported service types are:
* "dictionary": word dictionary
* "mt": machine translation

Under the service types you'll find the providers key, which holds an array of
service names.

Example:
```
dictionary:
  Dictd:
    es:
      - ca
  JsonDict:
    es:
      - ca
mt:
  Apertium:
    es:
      - ca
      - pt
```

Query
-----
The services can be queried by using the list method. For example,
to get the dictionary services that translate words from Spanish to Catalan,
use a URL like this:

 http://example.com:8080/v1/list/dictionary/es/ca

Machine translation can be queried by using,

 http://example.com:8080/v1/list/mt/es/pt
