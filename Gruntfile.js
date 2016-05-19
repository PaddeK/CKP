var path = require('path');

module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('manifest.json'),
        clean: ['build', '<%= pkg.name %>.zip'],
        fileindex: {
            services: {
                options: {
                    format: function (list) {
					    return 'document.write(\'<script type="text/javascript" src="/' + list.join('"></script>\');\ndocument.write(\'<script type="text/javascript" src="/') + '"></script>\');';
				    }
                },
                files: [{dest: 'services/index.js', src: ['services/*.js', '!services/index.js'], filter: 'isFile'}]
            },
            filemanager: {
                options: {
                    format: function (list) {
					    return 'document.write(\'<script type="text/javascript" src="/' + list.join('"></script>\');\ndocument.write(\'<script type="text/javascript" src="/') + '"></script>\');';
				    }
                },
                files: [{dest: 'services/filemanager/index.js', src: ['services/filemanager/*.js', '!services/filemanager/index.js'], filter: 'isFile'}]
            },
            directives: {
                options: {
                    format: function (list) {
                        return 'document.write(\'<script type="text/javascript" src="/' + list.join('"></script>\');\ndocument.write(\'<script type="text/javascript" src="/') + '"></script>\');';
                    }
                },
                files: [{dest: 'directives/index.js', src: ['directives/*.js', '!directives/index.js'], filter: 'isFile'}]
            },
            optionscontrollers: {
                options: {
                    format: function (list) {
					    return 'document.write(\'<script type="text/javascript" src="/' + list.join('"></script>\');\ndocument.write(\'<script type="text/javascript" src="/') + '"></script>\');';
				    }
                },
                files: [{dest: 'options/controllers/index.js', src: ['options/controllers/*.js', '!options/controllers/index.js'], filter: 'isFile'}]
            },
            popupscontrollers: {
                options: {
                    format: function (list) {
					    return 'document.write(\'<script type="text/javascript" src="/' + list.join('"></script>\');\ndocument.write(\'<script type="text/javascript" src="/') + '"></script>\');';
				    }
                },
                files: [{dest: 'popups/controllers/index.js', src: ['popups/controllers/*.js', '!popups/controllers/index.js'], filter: 'isFile'}]
            },
            optionspartials: {
                options: {
                    format: function (list) {
                        var routes = {};

					    list.forEach(function (file) {
                            var name = path.basename(file, '.html');

                            routes[name] = {
                                url: '/' + file,
                                ctrl: name[0].toUpperCase() + name.slice(1) + 'Controller'
                            }
                        });

                        return JSON.stringify(routes, null, 4);
				    }
                },
                files: [{dest: 'options/routes.json', src: ['options/partials/*.html'], filter: 'isFile'}]
            },
            popupspartials: {
                options: {
                    format: function (list) {
                        var routes = {};

					    list.forEach(function (file) {
                            var name = path.basename(file, '.html');

                            routes[name] = {
                                url: '/' + file,
                                ctrl: name[0].toUpperCase() + name.slice(1) + 'Controller'
                            }
                        });

                        return JSON.stringify(routes, null, 4);
				    }
                },
                files: [{dest: 'popups/routes.json', src: ['popups/partials/*.html'], filter: 'isFile'}]
            }
        },
        usebanner: {
            banner: {
                options: {
                    position: 'top',
                    banner: '/*! <%= pkg.name %>, '
                            + 'Copyright <%= grunt.template.today("yyyy") %> Steven Campbell\n'
                            + '*/',
                    linebreak: true
                },
                files: [
                    {expand: true, src: 'popups/**/*.js', cwd:'build/'},
                    {expand: true, src: 'background/**/*.js', cwd:'build/'},
                    {expand: true, src: 'services/**/*.js', cwd:'build/'},
                    {expand: true, src: 'options/**/*.js', cwd:'build/'},
                    {expand: true, src: 'directives/**/*.js', dest:'build/'},
                    {expand: true, src: ['*.js', '!Gruntfile.js', '!tests/*', '!bower_components/**/*', '!nodes_modules/**/*'], cwd:'build/'}
                ]
            }
        },
        copy: {
            bower: {
                files: [
                    {expand: true, cwd: 'bower_components/Case/dist/', src: 'case.min.js', dest: 'lib/'},
                    {expand: true, cwd: 'bower_components/json-formatter/dist/', src: 'json-formatter.min.js', dest: 'lib/'},
                    {expand: true, cwd: 'bower_components/json-formatter/dist/', src: 'json-formatter.min.css', dest: 'lib/'},
                    {expand: true, cwd: 'bower_components/angular/', src: 'angular.min.css', dest: 'lib/'},
                    {expand: true, cwd: 'bower_components/angular/', src: 'angular.min.js', dest: 'lib/'},
                    {expand: true, cwd: 'bower_components/angular/', src: 'angular-csp.css', dest: 'lib/'},
                    {expand: true, cwd: 'bower_components/angular-animate/', src: 'angular-animate.min.js', dest: 'lib/'},
                    {expand: true, cwd: 'bower_components/angular-route/', src: 'angular-route.min.js', dest: 'lib/'},
                    {expand: true, cwd: 'bower_components/angular-sanitize/', src: 'angular-sanitize.min.js', dest: 'lib/'},
                    {expand: true, cwd: 'bower_components/animate.css/', src: 'animate.css', dest: 'lib/'}
                ]
            },
            appjs: {
                files: [
                    {expand: true, src: 'popups/**/*.js', dest:'build/'},
                    {expand: true, src: 'background/**/*.js', dest:'build/'},
                    {expand: true, src: 'services/**/*.js', dest:'build/'},
                    {expand: true, src: 'options/**/*.js', dest:'build/'},
                    {expand: true, src: 'directives/**/*.js', dest:'build/'},
                    {expand: true, src: 'lib/**/*.js', dest:'build/'},
                    {expand: true, src: ['*.js', '!Gruntfile.js', '!tests/*', '!bower_components/**/*', '!nodes_modules/**/*'], dest:'build/'}
                ]
            }
        },
        less: {
            target: {
                options: {
                    ieCompat: false,
                    banner: '/*! <%= pkg.name %>, '
                            + 'Copyright <%= grunt.template.today("yyyy") %> Steven Campbell\n'
                            + '    This file is generated.\n'
                            + '*/\n'
                },
                files: {
                    "popups/popup.css": "popups/popup.less",
                    "options/options.css": "options/options.less"
                }
            }
        },
        cssmin: {
            target: {
                files: [
                    {expand: true, src: 'popups/**/*.css', dest:'build/'},
                    {expand: true, src: 'options/**/*.css', dest:'build/'},
                    {expand: true, src: 'lib/**/*.css', dest:'build/'},
                    {expand: true, src: '*.css', dest:'build/'}
                ]
            }
        },
        htmlmin: {
            options: {},
            files: {expand: true, src: ['**/*.html', '!node_modules/**/*.html', '!tests/**/*', '!bower_components/**/*'], dest: 'build/'}
        },
        compress: {
            options: {
                archive: "<%= pkg.name %>.zip"
            },
            target: {
                files: [
                    {expand: true, cwd: 'build/', src: '**/*', dest:'/'},
                    {expand: true, src: 'lib/*.js', dest: '/'},
                    {expand: true, src: 'manifest.json', dest: '/'},
                    {expand: true, src: 'license.txt', dest: '/'},
                    {expand: true, src: 'assets/**/*', dest: '/'}
                ]
            }
        },
        watch: {
            less: {
                files: ['**/*.less', '!bower_components/**/*', '!node_modules/**/*'],
                tasks: ['less'],
                options: {}
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-htmlmin');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-banner');
    grunt.loadNpmTasks('grunt-fileindex');

    // Default task(s).
    grunt.registerTask('default', ['clean', 'fileindex']);
    grunt.registerTask('index', ['fileindex']);
    grunt.registerTask('package', ['clean', 'index', 'copy:bower', 'copy:appjs', 'usebanner', 'less', 'cssmin', 'htmlmin', 'compress']);
    grunt.registerTask('updatelib', ['copy:bower']);
    //grunt.registerTask('styles', ['watch']);
};
