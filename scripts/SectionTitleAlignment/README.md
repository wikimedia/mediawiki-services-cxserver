# Section title database

To identify the sections present in one language and not in another language version of an article, we use section titles as proxy. It is difficult to compare two paragraphs of text in two different languages to see if the content is same. Checking titles is also not easy, but we we use some heuristics as workaround.

At present in cxserver we use the three strategies

- Identify section title and corresponding title in another language using the similarity score using an embedding model. This works is tracked at https://phabricator.wikimedia.org/T293511. We use crosslingual embedding models for this work. After extracting and collecting titles from database dumps, cosine similarity across these titles were calculated and a database of title pair mappings were created. A threshold score is set to filter only good enough candidates. The source code for this approach is at https://gitlab.wikimedia.org/mnz/section-alignment/
- Calculate the section title alignment based on past translations by CX users. We use CX Parallel corpus dumps, extract all translations by users for section titles. This pairs are supposed to be better than other options since this had gone through a human review. Extracted title pairs are also put into section title pair database. See parse-cx-corpus.py
- Calculate frequent section titles in English, then use machine translation to get translation title into target language. This is possible only if we have a usable MT engine between English and that language. See alignwithmt.js.

The result of all three approaches above are a inserted into a database called section title database.

There are two versions of this database.

- An sqlite database that is used on non-production settings. This is also the database where were insert new items whenever run the above three steps.
- A production mysql database where the content from above sqlite db is exported. See https://phabricator.wikimedia.org/T306963 where we did our first export.

## Known Limitations

- The crosslingual embedding works very poorly for non-latin, low resource languages. Trying some new crosslingual lingual embedding models might improve this problem a little bit, but not in a major way as vector embedding efficiency for smaller languages remains a challenge.
- The second approach of using CX parallel corpus has a chicken-egg problem. We want translators to translate the section titles to get the alignment, but to that we need section alignment. When section titles are the frequent titles we see in articles, this works well. But when there is no exact match, it fails.
- The third approach of MT works only when there is MT. It also has another problem - MT works better if there is a full sentence, NMT systems are bad at translating phrases. For example "Introduction" will get translated to "Introduction to bible".
- All the three approaches has a common problem too. We are searching for alignments using exact string match technique. If any spelling variations or stylistic alternatives are present in the section title, all of the above approaches will fail to report a section alignment.

## Parse Content translation parallel corpus to extract all section title mappings

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
python parse-cx-corpus.py
```
