module.exports = function(grunt) {
    var devTasks = [
        //'exec:version',
        'exec:clean_js',
        'exec:react',
        'exec:sass',
        'concat',
        'exec:debug_css',
        'exec:debug_js',
        //'exec:genversion',
        //'exec:version',
    ];

    grunt.initConfig({
        exec: {
            version: {
                cmd: 'cat _version.txt',
            },
            react: {
                cmd: './node_modules/.bin/babel app/comp > app/js/gen/build-comp.js',
            },
            genversion: {
                cmd: 'cat app/css/gen/build.css app/js/build.js | md5sum | cut -d " " -f 1 > _version.txt',
            },
            debug_css: {
                cmd: 'cp app/css/build.css public/assets/css/build.min.css',
            },
            clean_js: {
                cmd: 'touch app/js/gen/_.js && rm app/js/gen/*.js',
            },
            debug_js: {
                cmd: 'cp app/js/build.js public/assets/js/build.min.js',
            },
            prod_js: {
                cmd: './node_modules/.bin/uglifyjs app/js/build.js > public/assets/js/build.min.js',
            },
            prod_css: {
                cmd: './node_modules/.bin/cleancss app/css/build.css > public/assets/css/build.min.css',
            },
            sass: {
                cmd: './node_modules/.bin/sass app/css/portal.scss app/css/gen/build.css',
            },  
        },
        
        concat: {
            js: {
                src: [
                    'app/js/jquery.js',
                    'app/js/react.min.js',
                    'app/js/react-dom.min.js',
                    'app/js/jquery-ui.js',
                    'app/js/moment.min.js',
                    'app/js/lodash.min.js',
                    'app/js/global.js',
                    'app/js/app.js',
                    'app/js/*Mixin.js',
                    'app/js/gen/build-comp.js',
                ],
                dest: 'app/js/build.js',
            },
            css: {
                src: [
                    'app/css/font-awesome.css',
                    'app/css/bootstrap.css',
                    'app/css/gen/build.css',
                ],
                dest: 'app/css/build.css',
            },
        },
        
        watch : {
            scripts: {
                files: ['app/**/*.jsx', 'app/**/*.sass', 'app/**/*.scss'],
                tasks: devTasks,
            }
        }
    });

    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');

    var production = [
        'exec:clean_js',
        'exec:react',
        'exec:sass',
        'concat',
        'exec:prod_css',
        'exec:prod_js',
    ];

    grunt.registerTask('production', production);
    grunt.registerTask('build', production);

    grunt.registerTask('default', devTasks);
};
