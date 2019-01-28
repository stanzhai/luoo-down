var fs = require('fs')
  , path = require('path')
  , fmt = require('util').format
  , readline = require('readline')
  , request = require('request')
  , cheerio = require('cheerio')
  , progress = require('request-progress')
  , ProgressBar = require('progress')
  , open = require('open')
  , colors = require('colors');

var bar = new ProgressBar('正在下载：:title [:bar] :percent :etas', {
  complete: '=',
  incomplete: ' ',
  width: 20,
  clear: true,
  total: 100
});

var currFm = '';
var playList = [];
var isDownloading = -1;   // the music being downloaded
// make a download dir if not exists
var downloadDir = './downloads'
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir);
}

function getFm(fmUrl) {
  console.log('正在获取期刊信息...'.yellow);
  request(fmUrl, function (err, res, html) {
    // parse playlist
    $ = cheerio.load(html);
    $('li.track-item').each(function () {
      var trackItem = $(this);
      var mp3Info = {};
      var titleInfo = trackItem.find('a.trackname').text().split('.');
      mp3Info.id = titleInfo[0].trim();
      mp3Info.title = titleInfo[1].trim();
      mp3Info.mp3 = fmt('http://mp3-cdn2.luoo.net/low/luoo/radio%s/%s.mp3', $('span.vol-number').text(), mp3Info.id);
      mp3Info.artist = trackItem.find('p.artist').text().split(':')[1].trim();
      mp3Info.album = trackItem.find('p.album').text().split(':')[1].trim();
      mp3Info.poster = trackItem.find('a.btn-action-share').attr('data-img');
      playList.push(mp3Info);
    });
    // parse fm info and make music dir
    var fmTitle = $('span.vol-title').text();
    currFm = fmTitle;
    var fmIntro = $('div.vol-desc').text().trim();
    var fmCover = $('img.vol-cover').attr('src');
    var fmPath = path.join(downloadDir, fmTitle);
    var introPath = path.join(downloadDir, fmTitle, fmTitle + '.txt');
    var coverPath = path.join(downloadDir, fmTitle, fmTitle + '.jpg')
    if (!fs.existsSync(fmPath)) {
      fs.mkdirSync(fmPath);
      fs.writeFile(introPath, fmIntro.replace(/<br>/g, '\r\n').trim());
      request(fmCover).pipe(fs.createWriteStream(coverPath));
    }
    createTermMenu();
  });
}

function createTermMenu() {
  var List = require('term-list');
  var menu = new List({ marker: '>'.red + ' ', markerLength: 2 });
  menu.on('keypress', function(key, index) {
    if (key.name === 'return') {
      if (index == -4) {
        open('https://github.com/stanzhai/luoo-down');
      }
      if (index < 0 || isDownloading != -1) {
        return;
      }
      var mp3Info = playList[index];
      downloadMP3(mp3Info);
    } else if (key.name === 'q') {
      return menu.stop();
    }
  });

  menu.add(-1, '[期刊名]:' + currFm);
  menu.add(-2, Array(60).join('-'));
  for (var i = 0; i < playList.length; i++) {
    var info = playList[i];
    menu.add(i, (i + 1) + '. ' + info.title + '[' + (info.artist + '-' + info.album).green + ']');
  };
  menu.add(-3, Array(60).join('-'));
  menu.add(-4, 'Fork me on GitHub: luoo-down by Stan Zhai, 2014-5-24 night'.grey.underline);
  menu.add(-5, '仅供技术学习分享,音乐涉及版权,请勿批量下载,下载后请及时删除!'.red);
  menu.start();
  menu.select(0);
} 

function downloadMP3(mp3Info) {
  var coverFile = path.join(downloadDir, currFm, mp3Info.title + '.jpg');
  request(mp3Info.poster).pipe(fs.createWriteStream(coverFile));

  var mp3File = path.join(downloadDir, currFm, mp3Info.title + '.mp3');
  if (!fs.existsSync(mp3File)) {
    var lastReceived = 0;
    progress(request(mp3Info.mp3))
    .on('progress', function (state) {
      isDownloading = mp3Info.id;
      bar.total = state.total;
      bar.tick(state.received - lastReceived, {title: mp3Info.title});
      lastReceived = state.received;
    })
    .pipe(fs.createWriteStream(mp3File))
    .on('close', function (err) {
      // download ended, reset bar state
      bar.tick(bar.total - bar.curr);
      bar.curr = 0;
      isDownloading = -1;
    });
  } else {
    open(mp3File);
  }

}

function setError(err) {
  console.log(err.red);
}

function main() {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  console.log('请输入您喜欢的落网期刊地址或期刊号\r\n如：http://www.luoo.net/vol/index/726或726');
  var ask = '[default is 726]:';
  rl.question(ask, function(answer) {
    if (answer.trim().length == 0) {
      answer = 726;
    }
    if (/^\d+$/.test(answer)) {
      answer = 'http://www.luoo.net/vol/index/' + answer;
    } else {
      answer = answer || 'http://www.luoo.net';
    }
    getFm(answer);
    rl.close();
  });
}

process.on('uncaughtException', function(err) {
  setError(err.message + '\r\n这个错误有可能是您输入了错误的期刊导致');
  main();
});

main();
