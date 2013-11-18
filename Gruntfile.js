module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-shell');

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    /* tests */
    mochaTest: {
      test: {
        options: {
          require: ['should']
        },
        src: ['test/**/*.js']
      }
    },

    /* browser tests */
    karma: {
      unit: {
        configFile: 'karma.conf.js',
        background: true
      }
    },

    /* test coverage */
    shell: {
      coverage: {
        options: {
          stdout: true
        },
        command: 'istanbul cover --dir=docs/coverage _mocha -- --require="should" --require="sinon"'
      },
      documentation: {
        command: [
          'node_modules/groc/bin/groc "./src/**/*.js" --out=docs "./README.md"',
        ].join(' && ')
      },
      // deploy: {
      //   command: 'npm publish'
      // }
    },

    /* retest on change */
    watch: {
      dev: {
        files: ['src/**/*.js', 'test/**/*.js'],
        tasks: ['test', 'browserify', 'karma:unit:run']
      },
    },


    //publish docs to pages
    // 'gh-pages': {
    //   options: {
    //     base: 'docs'
    //   },
    //   src: ['**']
    // },

    /* include commonjs */
    browserify: {
      dev: {
        files: {
          'build/ticket.js': ['index.js'],
        }
      },
      tests: {
        files: {
          'build/test/t_test.js': ['test/ticket_test.js'],
        },
        options: {
          ignore: ['zombie', 'express', 'supertest']
        }
      }
    },

    /* js hint */
    jshint: {
      options: {
        jshintrc: './.jshintrc',
      },
      files: ['src/**/*.js']
    },

    /* minify js */
    uglify: {
      options: {
        report: 'gzip'
      },
      dist: {
        files: {
          'build/ticket.min.js': ['build/ticket.js']
        }
      }
    }

  });

  grunt.registerTask('default', ['test', 'build']);

  grunt.registerTask('start', ['karma:unit','watch']);
  grunt.registerTask('test', ['jshint', 'mochaTest', 'shell:coverage', 'shell:documentation']);
  grunt.registerTask('build', ['jshint', 'browserify', 'uglify', 'shell:coverage', 'shell:documentation']);
  grunt.registerTask('deploy', ['test', 'build', /*'gh-pages', 'shell:deploy'*/]);

};