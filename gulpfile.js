const gulp = require('gulp');
const npmDist = require('gulp-npm-dist');
const gulpzip = require('gulp-zip');
const gulpClean = require('gulp-clean');
const browserSync = require('browser-sync').create();

gulp.task('serve', gulp.series(build, copyLibs, dev_serve, dev_watch));
gulp.task('build', gulp.series(build, copyLibs));
gulp.task('zip', gulp.series(zip));
gulp.task('clean', gulp.series(clean));

gulp.task('copy:libs', gulp.series(copyLibs));

function clean(done) {
  gulp.src('./dist', {read: false, allowEmpty: true}).pipe(gulpClean());
  gulp.src('./dist.zip', {read: false, allowEmpty: true}).pipe(gulpClean());
  done();
}

function copyLibs(done) {
  gulp.src(npmDist(), {base:'./node_modules'}).pipe(gulp.dest('./dist/libs'));
  done();
};

function build(done) {
  gulp.src(['./src/**/*.js']).pipe(gulp.dest('./dist'));
  gulp.src(['./html/**/*.html']).pipe(gulp.dest('./dist'));
  done();
}

function zip(done) {
  gulp.src('./dist/**/*').pipe(gulpzip('dist.zip')).pipe(gulp.dest('./'));
  done();
}

function dev_serve(done) {
  browserSync.init({
    server: 'dist',
    host: "0.0.0.0",
    port: 8339,
    listFiles: true,
    open: false
  });

  done();
}

function dev_watch(done) {
  gulp.watch(['src/**/*.js']).on("all", gulp.series('build', browserSync.reload));
  gulp.watch(['html/**/*.html']).on("all", gulp.series('build', browserSync.reload));
}

// exports.default = serve
// exports.serve = serve
