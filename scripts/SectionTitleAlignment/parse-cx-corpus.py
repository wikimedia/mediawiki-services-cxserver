import ijson
from lxml import html
import sqlite3
from pathlib import Path
import re
import traceback
import sys


def get_database():
    connection = sqlite3.connect('section-titles.db')
    cursor = connection.cursor()
    # Drop the table if it exists
    cursor.execute('DROP TABLE IF EXISTS titles')
    # Create table
    cursor.execute("""
            CREATE TABLE titles
            (source_language TEXT,
            target_language TEXT,
            source_title TEXT,
            target_title TEXT,
            frequency INTEGER)
        """)
    cursor.execute('DROP INDEX IF EXISTS title_source_target')

    cursor.execute("""
        CREATE INDEX title_source_target
        ON titles (source_language, target_language);
        """)
    connection.commit()
    return cursor


def parse_file(filename, db):
    file = open(filename)
    sections = ijson.parse(file)
    index = 0
    section = dict()
    for prefix, event, value in sections:
        if prefix == 'item' and event == 'start_map':
            section = dict()
        elif prefix == 'item.sourceLanguage' and event == 'string':
            section['sourceLanguage'] = value
        elif prefix == 'item.targetLanguage' and event == 'string':
            section['targetLanguage'] = value
        elif prefix == 'item.source.content' and event == 'string':
            # h2, h3, h4 tags are matched
            match = re.search(r"(</h[2-4])", value)
            if match and match.start() >= 0:
                # Parse and build the document from HTML
                doc = html.fromstring(value)
                # Extract the text value from section header html
                title = ''.join([element.xpath("string()").strip()
                                 for element in doc.cssselect('h2, h3, h4')])
                if title:
                    section['sourceHeader'] = title
        elif section.get('sourceHeader') and prefix == 'item.target.content' and event == 'string':
            # This is target title
            match = re.search(r"(</h[2-4])", value)
            if match and match.start() >= 0:
                doc = html.fromstring(value)
                title = ''.join([element.xpath("string()").strip()
                                 for element in doc.cssselect('h2, h3, h4')])
                if title and title != section.get('sourceHeader'):
                    # If both source and target headers are same, don't add.
                    section['targetHeader'] = title

        elif prefix == 'item' and event == 'end_map':
            if 'sourceHeader' in section and 'targetHeader' in section:
                # Make sure both titles are present
                params = (
                    section['sourceLanguage'], section['targetLanguage'],
                    section['sourceHeader'], section['targetHeader'],
                )
                frequency = db.execute(
                    """
                        SELECT frequency from titles
                        WHERE source_language=?
                        AND target_language=? AND source_title=?
                        AND target_title=?
                    """, params).fetchone()
                if frequency is None:
                    # Item does not exist in database table
                    db.execute("""
                        INSERT INTO titles VALUES(?,?,?,?, 1)
                        """, params)
                else:
                    # Item already exists. Increment the count for frequency tracking
                    frequency = frequency[0]+1
                    db.execute("""
                            UPDATE titles SET frequency=?
                            WHERE source_language=? AND target_language=?
                            AND source_title=? AND target_title=?
                        """, (frequency, *params))
                index += 1

    print('Inserted %d items' % (index))


def main():
    db = get_database()
    folder = "dumps.wikimedia.org/other/contenttranslation"
    # Recursively find the files matching the pattern
    for path in sorted(Path(folder).rglob('cx-corpora.*.html.json')):
        print('Reading %s' % (path.name))
        try:
            parse_file(path.absolute(), db)
            db.connection.commit()
            # Remove the file
            path.unlink()
        except ijson.JSONError:
            traceback.print_exc(file=sys.stderr)
            print('Invalid JSON %s' % (path.name))
            continue

    db.connection.close()


if __name__ == '__main__':
    main()
