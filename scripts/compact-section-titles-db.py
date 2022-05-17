# This script assumes that the a database dump of section titles from
# https://analytics.wikimedia.org/published/datasets/one-off/section_alignment_subset/
# is downloaded already.

from typing import *
import sqlite3
import logging
import argparse
import requests
import json
import re


log = logging.getLogger()

# The table titles should be present already. If not:
# CREATE TABLE titles
#             (source_language varbinary(63),
#             target_language varbinary(63),
#             source_title TEXT,
#             target_title TEXT,
#             frequency INTEGER);


# CREATE INDEX title_source_target
# ON titles (source_language, target_language);


def get_all_language_pairs_in_CX():
    # Minimum number of translations to consider a language pair
    min_translations = 10
    api: str = "https://en.wikipedia.org/w/api.php?action=query&list=contenttranslationstats&format=json"
    languages = {}
    pages = json.loads(requests.get(api).text)["query"]["contenttranslationstats"][
        "pages"
    ]
    pairCount: int = 0
    for page in pages:
        extistingTargetLanguages = languages.get(page["sourceLanguage"], [])
        if (
            page["targetLanguage"] not in extistingTargetLanguages
            and page["status"] != "draft"
            and int(page["translators"]) > min_translations
        ):
            extistingTargetLanguages.append(page["targetLanguage"])
            languages[page["sourceLanguage"]] = extistingTargetLanguages
            pairCount = pairCount + 1

    log.info(f"Found {pairCount} language pairs in CX")
    return languages


def get_section_titles(database, sourceLanguage, targetLanguage, rank):
    titlepairs = {}
    connection = sqlite3.connect(database)
    db = connection.cursor()
    pairs = db.execute(
        """
        SELECT source_title, target_title
        FROM titles
        WHERE source_language=?
			AND target_language=?
			AND rank <= ?
            AND source_title != ""
            AND target_title != ""
            AND probability > 0.6
			AND source_title != target_title
        """,
        (sourceLanguage + "wiki", targetLanguage + "wiki", rank),
    )

    for (sourcetitle, targettitle) in pairs:
        # Filter out titles with special characters since they are rare
        if re.search(r"[,:\[\]<>\-'\\/\"+]+", sourcetitle) or re.search(r"[,:\[\]<>\-'\\/\"+]+", targettitle):
            continue
        if re.search(r"^[0-9:\-()\s\"]+$", sourcetitle) or re.search(r"^[0-9:\-()\s\"]+$", targettitle):
            continue
        # This takes care of duplicates too.
        titlepairs[sourcetitle] = targettitle

    connection.close()
    return titlepairs


def add_section_titles(database, sourceLanguage, targetLanguage, titleMapping):
    connection = sqlite3.connect(database)
    db = connection.cursor()
    params = []
    # We set a special frequency value for ML based alignment. This is actually
    # arbitrary, but somewhat close to a possibly valid translation in comparison with
    # high frequency translation by a human translations.
    frequency = 1
    for sourceTitle in titleMapping:
        targetTitle = titleMapping[sourceTitle]
        params.append(
            (sourceLanguage, targetLanguage, sourceTitle, targetTitle, frequency)
        )

    db.executemany(
        """
		INSERT INTO titles VALUES(?,?,?,?,?)
	""",
        params,
    )
    connection.commit()
    connection.close()


def main(options):
    languagePairs = get_all_language_pairs_in_CX()
    # languagePairs = {"en": ["or"], "ml": ["en"]}
    index = 0
    sourcedb = options.source.name
    targetdb = options.target.name
    for sourceLanguage in languagePairs:
        targetLanguages = languagePairs.get(sourceLanguage)
        for targetLanguage in targetLanguages:
            title_mappings = get_section_titles(
                sourcedb, sourceLanguage, targetLanguage, 1
            )
            add_section_titles(targetdb, sourceLanguage, targetLanguage, title_mappings)
            log.info(
                f"{sourceLanguage}->{targetLanguage} Added {len(title_mappings)} section titles"
            )


if __name__ == "__main__":
    logging.basicConfig(level="INFO")
    parser = argparse.ArgumentParser(
        description="Add section titles mapping from a database", add_help=True
    )
    parser.add_argument(
        "-s",
        "--source",
        help="Source database",
        required=True,
        type=argparse.FileType("r"),
    )
    parser.add_argument(
        "-t",
        "--target",
        help="Target database",
        required=True,
        type=argparse.FileType("r"),
    )
    options = parser.parse_args()
    main(options)
