import { describe, it } from 'node:test';
import { deepEqual } from '../utils/assert.js';
import {
	MwContextualizer,
	Normalizer,
	Parser
} from '../../../lib/lineardoc/index.js';

function normalize( html ) {
	const normalizer = new Normalizer();
	normalizer.init();
	normalizer.write( html.replace( /(\r\n|\n|\t|\r)/gm, '' ) );
	return normalizer.getHtml();
}

function parse( html ) {
	const parser = new Parser( new MwContextualizer() );
	parser.init();
	parser.write( html );
	return parser.builder.doc;
}

/**
 * Build a reference marker span as produced by Parsoid.
 *
 * @param {number} n Reference number
 * @return {string} HTML for the reference marker
 */
function ref( n ) {
	return '<span typeof="mw:Extension/ref" class="mw-ref" rel="dc:references" ' +
		`data-mw="{&quot;name&quot;:&quot;r${ n }&quot;}">` +
		`<a href="./X#cite_note-${ n }"><span class="mw-reflink-text">[${ n }]</span></a></span>`;
}

function segment( inner ) {
	return `<section><p><span class="cx-segment" data-segmentid="1">${ inner }</span></p></section>`;
}

const before = { policy: 'before', punctuation: [ '.', ',' ] };
const after = { policy: 'after', punctuation: [ '.', ',' ] };

describe( 'Reference punctuation adaptation', () => {
	const cases = [
		{
			msg: 'moves reference before the full stop for "before" policy',
			opts: before,
			source: segment( `He was appointed in 2012.${ ref( 1 ) }` ),
			expected: segment( `He was appointed in 2012${ ref( 1 ) }.` )
		},
		{
			msg: 'moves reference after the full stop for "after" policy',
			opts: after,
			source: segment( `He was appointed in 2012${ ref( 1 ) }.` ),
			expected: segment( `He was appointed in 2012.${ ref( 1 ) }` )
		},
		{
			msg: 'leaves already "before" content unchanged for "before" policy',
			opts: before,
			source: segment( `He was appointed in 2012${ ref( 1 ) }.` ),
			expected: segment( `He was appointed in 2012${ ref( 1 ) }.` )
		},
		{
			msg: 'leaves already "after" content unchanged for "after" policy',
			opts: after,
			source: segment( `He was appointed in 2012.${ ref( 1 ) }` ),
			expected: segment( `He was appointed in 2012.${ ref( 1 ) }` )
		},
		{
			msg: 'leaves a reference not adjacent to punctuation unchanged',
			opts: before,
			source: segment( `He was appointed ${ ref( 1 ) } in 2012.` ),
			expected: segment( `He was appointed ${ ref( 1 ) } in 2012.` )
		},
		{
			msg: 'moves a run of references before the full stop',
			opts: before,
			source: segment( `He was appointed in 2012.${ ref( 1 ) }${ ref( 2 ) }` ),
			expected: segment( `He was appointed in 2012${ ref( 1 ) }${ ref( 2 ) }.` )
		},
		{
			msg: 'moves reference before a comma for "before" policy',
			opts: before,
			source: segment( `appointed in 2012,${ ref( 1 ) } later knighted.` ),
			expected: segment( `appointed in 2012${ ref( 1 ) }, later knighted.` )
		},
		{
			// The MT annotation mapper can place a mapped reference outside the
			// segment span, leaving a whitespace-only chunk between the
			// punctuation and the reference (T97231: "fin de la saison. [5]").
			msg: 'skips a whitespace-only chunk between punctuation and reference',
			opts: before,
			source: '<section><p><span class="cx-segment" data-segmentid="1">' +
				`until the end of the season.</span> ${ ref( 1 ) }</p></section>`,
			expected: '<section><p><span class="cx-segment" data-segmentid="1">' +
				`until the end of the season</span>${ ref( 1 ) }.</p></section>`
		},
		{
			// References mapped into the following segment, after a space
			// (T97231: "dans la Coupe de l'EFL.[3][4] En janvier").
			msg: 'moves a run of references from the next segment before the full stop',
			opts: before,
			source: '<section><p><span class="cx-segment" data-segmentid="1">' +
				'appearance in the EFL Cup.</span>' +
				'<span class="cx-segment" data-segmentid="2">' +
				` ${ ref( 1 ) }${ ref( 2 ) } In January 2024 he joined.</span></p></section>`,
			expected: '<section><p><span class="cx-segment" data-segmentid="1">' +
				'appearance in the EFL Cup</span>' +
				'<span class="cx-segment" data-segmentid="2">' +
				`${ ref( 1 ) }${ ref( 2 ) }. In January 2024 he joined.</span></p></section>`
		},
		{
			msg: 'preserves whitespace between the references of a run',
			opts: before,
			source: segment( `He was appointed in 2012.${ ref( 1 ) } ${ ref( 2 ) }` ),
			expected: segment( `He was appointed in 2012${ ref( 1 ) } ${ ref( 2 ) }.` )
		},
		{
			msg: 'skips a whitespace-only chunk between reference and punctuation for "after" policy',
			opts: after,
			source: '<section><p><span class="cx-segment" data-segmentid="1">' +
				`He was appointed in 2012${ ref( 1 ) } </span>. Later he resigned.</p></section>`,
			expected: '<section><p><span class="cx-segment" data-segmentid="1">' +
				`He was appointed in 2012.${ ref( 1 ) }</span> Later he resigned.</p></section>`
		}
	];

	for ( const { msg, opts, source, expected } of cases ) {
		it( msg, () => {
			const result = parse( source ).adaptReferencePunctuation( opts );
			deepEqual(
				normalize( result.getHtml() ),
				normalize( parse( expected ).getHtml() ),
				msg
			);
		} );
	}
} );
