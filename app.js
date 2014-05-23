var http = require('http')
  , request = require('request')
  , progress = require('request-progress')
  , ProgressBar = require('progress')
  , fs = require('fs')
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

request('http://www.luoo.net/', function (err, res, html) {
  var key = 'var volPlaylist = ';
  var start = html.indexOf(key);
  var end = html.indexOf('}];', start);
  var playList = JSON.parse(html.substring(start + key.length, end + 2));

  menu.adds(playList);
  menu.start();
});

menu.on('keypress', function(key, index) {
  if (key.name === 'return') {
    var item = menu.item(index);
    if (bar.curr != 0) {
      return;   // is downloading
    } 
    downloadMP3(item);
  } else if (key.name === 'q') {
    return menu.exit();
  }
});

// 下载歌曲
function downloadMP3(mp3Info) {
  request(mp3Info.poster).pipe(fs.createWriteStream(mp3Info.title + '.jpg'));

  var lastReceived = 0;
  progress(request(mp3Info.mp3))
  .on('progress', function (state) {
    bar.total = state.total;
    bar.tick(state.received - lastReceived, {title: mp3Info.title});
    lastReceived = state.received;
  })
  .pipe(fs.createWriteStream(mp3Info.title + '.mp3'))
  .on('close', function (err) {
    // 下载结束后，重置下载条状态
    bar.tick(bar.total - bar.curr);
    bar.curr = 0;
  });
}