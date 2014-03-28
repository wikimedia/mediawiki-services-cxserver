module.exports = function ( grunt ) {
	grunt.loadNpmTasks( 'grunt-contrib-jshint' );
	grunt.loadNpmTasks( 'grunt-contrib-watch' );
	grunt.loadNpmTasks( 'grunt-jscs-checker' );

	grunt.initConfig( {
		pkg: grunt.file.readJSON( 'package.json' ),
		jshint: {
			options: {
				jshintrc: '.jshintrc'
			},
			all: ['*.js', '{models,mt,pageloader,public,segmentation,tests}/**/*.js']
		},
		jscs: {
			src: ['<%= jshint.all %>']
		},
		watch: {
			files: ['<%= jshint.all %>', '.{jshintrc,jshintignore}'],
			tasks: ['test']
		}
	} );

	grunt.registerTask( 'test', ['jshint', 'jscs'] );
	grunt.registerTask( 'default', 'test' );
};
