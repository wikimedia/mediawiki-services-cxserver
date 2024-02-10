'use strict';

const fs = require( 'fs' ),
	ArgumentParser = require( 'argparse' ).ArgumentParser,
	sqlite = require( 'sqlite' ),
	sqlite3 = require( 'sqlite3' );

async function createTemplate( db, from, to, templateName ) {
	const mapping = await db.get(
		`SELECT id FROM templates
        WHERE source_lang = ? AND target_lang = ? AND template = ?`,
		from, to, templateName
	);
	if ( mapping && mapping.template_mapping_id ) {
		return mapping.template_mapping_id;
	}
	const result = await db.run(
		`INSERT OR IGNORE INTO templates
        (source_lang, target_lang, template) VALUES(?,?,?)`,
		from, to, templateName
	);
	return result.lastID;
}

async function main( databaseFile, mapping, from, to ) {
	const db = await sqlite.open( { filename: databaseFile, driver: sqlite3.Database } );

	await db.run(
		`CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_lang TEXT NOT NULL,
            target_lang TEXT NOT NULL,
            template TEXT NOT NULL,
            UNIQUE(source_lang, target_lang, template)
        )`
	);
	await db.run(
		`CREATE TABLE IF NOT EXISTS mapping (
            template_mapping_id INTEGER NOT NULL,
            source_param TEXT NOT NULL,
            target_param TEXT NOT NULL,
            score REAL NOT NULL,
            FOREIGN KEY(template_mapping_id) REFERENCES templates(id),
            UNIQUE(template_mapping_id, source_param, target_param)
        )`
	);

	for ( const templateName in mapping ) {
		const mappingData = mapping[ templateName ];
		if ( !mappingData || !mappingData.length ) {
			continue;
		}
		const mappingId = await createTemplate( db, from, to, templateName );
		process.stdout.write( `${ mappingId } ${ from } -> ${ to } ${ templateName }\n` );
		for ( const index in mappingData ) {
			const paramMapping = mappingData[ index ];
			if ( !mappingId || !paramMapping[ from ] || !paramMapping[ to ] ) {
				continue;
			}

			const score = 1 - paramMapping.d;
			db.run(
				`INSERT OR IGNORE INTO mapping
                (template_mapping_id, source_param, target_param, score)
                VALUES(?,?,?,?)`,
				mappingId, paramMapping[ from ], paramMapping[ to ], score
			);
			process.stdout.write( `\t${ paramMapping[ from ] } -> ${ paramMapping[ to ] } (${ score })\n` );
		}
	}
	await db.close();
}

const argparser = new ArgumentParser( {
	add_help: true,
	description: 'Prepare template mapping database'
} );

argparser.add_argument(
	'-d', '--database',
	{
		help: 'template mapping database file',
		default: 'templatemapping.db'
	}
);
argparser.add_argument(
	'-i', '--input',
	{
		help: 'JSON file with mapping.',
		required: true
	}
);
argparser.add_argument(
	'--from',
	{
		help: 'Source language',
		required: true
	}
);
argparser.add_argument(
	'--to',
	{
		help: 'Target language',
		required: true
	}
);
const args = argparser.parse_args();

const input = args.input;
if ( !fs.existsSync( input ) ) {
	throw new Error( `File ${ input } does not exist` );
}

main(
	args.database,
	JSON.parse( fs.readFileSync( input ) ),
	args.from,
	args.to
);
