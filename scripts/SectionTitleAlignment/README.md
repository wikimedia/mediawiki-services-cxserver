# Parse Content translation parallel corpus to extract all section title mappings

Download the entire Content translation parallel corpus. Change the date in the URL below for latest dumps.

```lang=bash
wget --recursive --no-parent -nc -A .html.json.gz https://dumps.wikimedia.org/other/contenttranslation/20210402/
```

Extract the dumps

```lang=bash
gunzip -rfkv dumps.wikimedia.org/other/contenttranslation
```

Install the dependencies for the python program. It is recommended to use a virtual environment.

```lang=bash
python -m venv ENV_DIR
source ENV_DIR/bin/activate
pip install -r requirements.txt
```

Run the parser on this corpus. It will read every dump, identify and extract section titles, and add to the sqlite database.

```lang=bash
python parse.py
```
