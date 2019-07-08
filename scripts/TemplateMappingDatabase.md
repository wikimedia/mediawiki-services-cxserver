Template Mapping Database and scripts
=====================================

The template mapping json files prepared from https://github.com/digitalTranshumant/templatesAlignment
are processed using the scripts here.

The distance value in the json files(`d` value) is converted to a score between 0 and 1. A score of 1 is very good,
a score of 0 is very bad.

There is an assumption about the json file names. It should be of the format `templatesAligned_from_XX_to_XX.json`.
Example: templatesAligned_from_ar_to_fa.json. This is because the content in JSON does not define the source and target
language for convenient lookup.

Also see https://phabricator.wikimedia.org/T221211

Database structure
------------------

```sql
CREATE TABLE templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_lang TEXT NOT NULL,
    target_lang TEXT NOT NULL,
    template TEXT NOT NULL,
    UNIQUE(source_lang, target_lang, template)
)

CREATE TABLE mapping (
    template_mapping_id INTEGER NOT NULL,
    source_param TEXT NOT NULL,
    target_param TEXT NOT NULL,
    score REAL NOT NULL,
    FOREIGN KEY(template_mapping_id) REFERENCES templates(id),
    UNIQUE(template_mapping_id, source_param, target_param)
)
```
