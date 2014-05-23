Dict client in nodejs
=====================

This is a Dict dictionary protocol client written in javascript.

It exposes a simple api to check the word definitions in the available backends.

```javascript
getDefinition( 'swim', 'en', 'de' ).then( function (data) {
     console.log(data)
} );
```

The backend dictionaries are listed in DictRegistry.json in the form of a json registry.
It provides a handy translation of ISO 639 two letter language codes to the available dictionary
identifiers.
