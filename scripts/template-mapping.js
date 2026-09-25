import { existsSync, readFileSync } from 'fs';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';

function createTemplate( db, from, to, templateName ) {
	const mapping = db.prepare(
		`SELECT id FROM templates
        WHERE source_lang = ? AND target_lang = ? AND template = ?`
	).get( from, to, templateName );
	if ( mapping && mapping.id ) {
		return mapping.id;
	}
	const result = db.prepare(
		`INSERT OR IGNORE INTO templates
        (source_lang, target_lang, template) VALUES(?,?,?)`
	).run( from, to, templateName );
	return result.lastInsertRowid;
}

async function main( databaseFile, mapping, from, to ) {
	const db = new DatabaseSync( databaseFile );

	db.exec(
		`CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_lang TEXT NOT NULL,
            target_lang TEXT NOT NULL,
            template TEXT NOT NULL,
            UNIQUE(source_lang, target_lang, template)
        )`
	);
	db.exec(
		`CREATE TABLE IF NOT EXISTS mapping (
            template_mapping_id INTEGER NOT NULL,
            source_param TEXT NOT NULL,
            target_param TEXT NOT NULL,
            score REAL NOT NULL,
            FOREIGN KEY(template_mapping_id) REFERENCES templates(id),
            UNIQUE(template_mapping_id, source_param, target_param)
        )`
	);

	const insertMapping = db.prepare(
		`INSERT OR IGNORE INTO mapping
        (template_mapping_id, source_param, target_param, score)
        VALUES(?,?,?,?)`
	);
	for ( const templateName in mapping ) {
		const mappingData = mapping[ templateName ];
		if ( !mappingData || !mappingData.length ) {
			continue;
		}
		const mappingId = createTemplate( db, from, to, templateName );
		process.stdout.write( `${ mappingId } ${ from } -> ${ to } ${ templateName }\n` );
		for ( const index in mappingData ) {
			const paramMapping = mappingData[ index ];
			if ( !mappingId || !paramMapping[ from ] || !paramMapping[ to ] ) {
				continue;
			}

			const score = 1 - paramMapping.d;
			insertMapping.run( mappingId, paramMapping[ from ], paramMapping[ to ], score );
			process.stdout.write( `\t${ paramMapping[ from ] } -> ${ paramMapping[ to ] } (${ score })\n` );
		}
	}
}

const usage = `Prepare template mapping database

Usage: node scripts/template-mapping.js -i <file> --from <lang> --to <lang> [-d <file>]

Options:
  -d, --database  template mapping database file (default: templatemapping.db)
  -i, --input     JSON file with mapping (required)
  --from          Source language (required)
  --to            Target language (required)
  -h, --help      Show this help message
`;

const { values: args } = parseArgs( {
	options: {
		database: { type: 'string', short: 'd', default: 'templatemapping.db' },
		input: { type: 'string', short: 'i' },
		from: { type: 'string' },
		to: { type: 'string' },
		help: { type: 'boolean', short: 'h' }
	}
} );

if ( args.help ) {
	process.stdout.write( usage );
	process.exit( 0 );
}
if ( !args.input || !args.from || !args.to ) {
	process.stderr.write( usage );
	process.exit( 1 );
}

const input = args.input;
if ( !existsSync( input ) ) {
	throw new Error( `File ${ input } does not exist` );
}

main(
	args.database,
	JSON.parse( readFileSync( input ) ),
	args.from,
	args.to
);
