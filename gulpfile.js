// SPDX-FileCopyrightText: 2023 Michael Pöhn <michael.poehn@fsfe.org>
// SPDX-License-Identifier: AGPL-3.0-or-later

const gulp = require('gulp');
const npmDist = require('gulp-npm-dist');
const gulpzip = require('gulp-zip');
const gulpClean = require('gulp-clean');
const browserSync = require('browser-sync').create();
const fs = require('fs');

gulp.task('serve', gulp.series(build, writeVersion, copyLibs, copyStatic, copyWellKnown, dev_serve, dev_watch));
gulp.task('build', gulp.series(build, writeVersion, copyLibs, copyStatic, copyWellKnown));
gulp.task('zip', gulp.series(zip));
gulp.task('clean', gulp.series(clean));

gulp.task('copy:libs', gulp.series(copyLibs));

function clean(done) {
  gulp.src('./dist', {read: false, allowEmpty: true}).pipe(gulpClean());
  gulp.src('./dist.zip', {read: false, allowEmpty: true}).pipe(gulpClean());
  done();
}

function writeVersion(done) {
  if (!fs.existsSync("dist")) {
    fs.mkdirSync("dist");
  }
  const packageJson = JSON.parse(fs.readFileSync('./package.json'));
  fs.writeFileSync('dist/version.js', `const fdroidLinkJsVersion = "v${packageJson.version}";`);
  done();
}

function copyLibs(done) {
  gulp.src(npmDist(), {base:'./node_modules'}).pipe(gulp.dest('./dist/libs'));
  done();
};

function copyStatic(done) {
  gulp.src([
    './static/**/*.png',
    './static/**/*.ico',
    './static/**/*.map',
    './static/**/*.css',
  ]).pipe(gulp.dest('./dist/static'));
  done();
};

function copyWellKnown(done) {
  gulp.src([
    './well-known/*.json',
  ]).pipe(gulp.dest('./dist/.well-known'));
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
  gulp.watch(['static/*.css']).on("all", gulp.series('build', browserSync.reload));
  gulp.watch(['static/**/*.css']).on("all", gulp.series('build', browserSync.reload));
  gulp.watch(['static/**/*.png']).on("all", gulp.series('build', browserSync.reload));
}

// exports.default = serve
// exports.serve = serve
