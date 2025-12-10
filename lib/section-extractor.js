/**
 * Extracts only first-level section titles (== Title ==) from wikitext
 *
 * @param {string} wikitext - The page wikitext
 * @return {string[]} - Array of section titles
 */
const extractSections = ( wikitext ) => {
	const sections = [];
	// Match only level 1 headings: == Title ==
	const headingRegex = /^==\s*([^=]+?)\s*==\s*$/gm;
	let match;

	while ( ( match = headingRegex.exec( wikitext ) ) !== null ) {
		sections.push( match[ 1 ].trim() );
	}

	return sections;
};

/**
 * Extracts first-level section titles (== Title ==) from wikitext with their sizes
 *
 * @param {string} wikitext - The page wikitext
 * @return {{ title: string, size: number }[]} - Array of objects with {title: string, size: number}
 */
const extractSectionsWithSizes = ( wikitext ) => {
	const sections = [];
	// Match only level 1 headings: == Title ==
	const headingRegex = /^==\s*([^=]+?)\s*==\s*$/gm;
	const matches = [];
	let match;

	// First, collect all matches with their positions
	while ( ( match = headingRegex.exec( wikitext ) ) !== null ) {
		matches.push( {
			title: match[ 1 ].trim(),
			startIndex: match.index,
			endIndex: headingRegex.lastIndex
		} );
	}

	// Add lead section (content before first heading)
	if ( matches.length > 0 ) {
		const firstHeadingStart = matches[ 0 ].startIndex;
		const leadSectionSize = [ ...wikitext.slice( 0, Math.max( 0, firstHeadingStart ) ) ].length;
		sections.push( {
			title: '__LEAD_SECTION__',
			size: leadSectionSize
		} );
	} else {
		// If no headings, entire page is lead section
		sections.push( {
			title: '__LEAD_SECTION__',
			size: wikitext.length
		} );
	}

	// Calculate size for each section
	for ( let i = 0; i < matches.length; i++ ) {
		const currentMatch = matches[ i ];
		const nextMatch = matches[ i + 1 ];

		// Section starts after the heading ends
		const sectionStartByte = currentMatch.endIndex;
		// Section ends at the start of next heading, or end of document
		const sectionEndByte = nextMatch ? nextMatch.startIndex : wikitext.length;

		// Convert byte positions to codepoint positions
		const sectionStartCodepoint = [ ...wikitext.slice( 0, Math.max( 0, sectionStartByte ) ) ].length;
		const sectionEndCodepoint = [ ...wikitext.slice( 0, Math.max( 0, sectionEndByte ) ) ].length;

		// Calculate size in codepoints
		const size = sectionEndCodepoint - sectionStartCodepoint;

		sections.push( {
			title: currentMatch.title,
			size: size
		} );
	}

	return sections;
};

export { extractSections, extractSectionsWithSizes };
