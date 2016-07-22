var gulp = require('gulp');
var watch = require('gulp-watch');
var browserSync = require('browser-sync').create();

gulp.task('serve', function() {
    browserSync.init({
        server: '../',
        startPath: 'benchmark'
    });

    gulp.watch(['*.html', 'src/*.js']).on('change', browserSync.reload);
});

gulp.task('default', ['serve']);
