The ContentTranslation registry specifies the different language services that
this server instance provides.

The default registry includes all the services that cxserver is able to support.
You can tweak values and location of your configuration files in config.yaml
file.

Format
------
Config files are split into multiple files as per service providers.

List of languages supported by cxserver are in config/languages.yaml

Each service provider has a separate config for language pairs. The main keys
are source languages. Under them you'll find target languages.

For example, in config/Apertium.yaml:
```
af:
  - nl
en:
  - ca
  - eo
  - es
  - gl
  - sh
```

Currently the supported service types are:

* mt: machine translation

In main configuration file, under the service types you'll find the API URL,
languages and optional API key.

Example:
```
mt:
  Apertium:
    api: http://apertium.wmflabs.org
    languages: config/Apertium.yaml
  Yandex:
    api: https://translate.yandex.net
    key: null
    languages: config/Yandex.yaml
```

Query
-----
The services can be queried by using the list method. For example, machine translation can be queried by using,

http://example.com:8080/v1/list/mt/es/pt

