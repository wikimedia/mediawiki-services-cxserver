/**
 * Custom error class for MTClient-related errors.
 */
export default class MTClientError extends Error {
	/*
     * @param {string} message
     * @param {number} code
     */
	constructor( message, code ) {
		super( message );
		this.code = code;
		this.name = 'MTClientError';
	}
}
