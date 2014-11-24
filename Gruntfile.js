module.exports = function ( grunt ) {
	grunt.loadNpmTasks( 'grunt-contrib-jshint' );
	grunt.loadNpmTasks( 'grunt-contrib-watch' );
	grunt.loadNpmTasks( 'grunt-jscs-checker' );

	grunt.initConfig( {
		pkg: grunt.file.readJSON( 'package.json' ),
		jshint: {
			options: {
				jshintrc: true
			},
			all: [ '*.js', '{lineardoc,models,mt,pageloader,public,segmentation,tests}/**/*.js' ]
		},
		jscs: {
			src: '<%= jshint.all %>'
		},
		watch: {
			files: [
				'.{jscsrc,jshintignore,jshintrc}',
				'<%= jshint.all %>'
			],
			tasks: [ 'test' ]
		}
	} );

	grunt.registerTask( 'test', [ 'jshint', 'jscs' ] );
	grunt.registerTask( 'default', 'test' );
};
