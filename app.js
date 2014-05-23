var http = require('http')
  , fs = require('fs')
  , path = require('path')
  , request = require('request')
  , progress = require('request-progress')
  , ProgressBar = require('progress')
  , open = require('open')
  , List = require('./lib/term-list-enhanced');

var bar = new ProgressBar('正在下载：:title [:bar] :percent :etas', {
  complete: '=',
  incomplete: ' ',
  width: 20,
  clear: true,
  total: 100
});
var menu = new List({
  labelKey: 'title'
});

// make download dir if not exists
var downloadDir = './downloads'
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir);
}
var currFm = '';

request('http://www.luoo.net/', function (err, res, html) {
  var playList = JSON.parse(findContent(html, 'var volPlaylist = ', '}];', 2));
  var fmTitle = findContent(html, '<h1 class="fm-title">', '</h1>', 0);
  var fmIntro = findContent(html, '<p class="fm-intro">', '</p>', 0);
  var fmCover = 'http://img' + findContent(html, 'http://img', '"', 0);
  var fmPath = path.join(downloadDir, fmTitle);
  var introPath = path.join(downloadDir, fmTitle, fmTitle + '.txt');
  var coverPath = path.join(downloadDir, fmTitle, fmTitle + '.jpg')
  if (!fs.existsSync(fmPath)) {
    fs.mkdirSync(fmPath);
    fs.writeFile(introPath, fmIntro.replace(/<br>/g, '\r\n'));
    request(fmCover).pipe(fs.createWriteStream(coverPath));
  }

  currFm = fmTitle;
  menu.adds(playList);
  menu.start();
});

menu.on('keypress', function(key, index) {
  if (key.name === 'return') {
    var item = menu.item(index);
    //if (bar.curr != 0) {
    //  return;   // is downloading
    //} 
    downloadMP3(item);
  } else if (key.name === 'q') {
    return menu.exit();
  }
});

function findContent(html, key, endTag, offset) {
  var start = html.indexOf(key);
  var end = html.indexOf(endTag, start);
  return html.substring(start + key.length, end + offset);
}

// 下载歌曲
function downloadMP3(mp3Info) {
  var coverFile = path.join(downloadDir, currFm, mp3Info.title + '.jpg');
  request(mp3Info.poster).pipe(fs.createWriteStream(coverFile));

  var mp3File = path.join(downloadDir, currFm, mp3Info.title + '.mp3');
  if (!fs.existsSync(mp3File)) {
    var lastReceived = 0;
    progress(request(mp3Info.mp3))
    .on('progress', function (state) {
      bar.total = state.total;
      bar.tick(state.received - lastReceived, {title: mp3Info.title});
      lastReceived = state.received;
    })
    .pipe(fs.createWriteStream(mp3File))
    .on('close', function (err) {
      // 下载结束后，重置下载条状态
      bar.tick(bar.total - bar.curr);
      bar.curr = 0;
    });
  } else {
    open(mp3File);
  }

}