/**
 * Created by s-yamamoto on 2016/10/19.
 */

// TCPによるエコークライアントの実装
var net = require('net');
var readline = require('readline');

var options = {};
options.host = process.argv[2];
options.port = process.argv[3];

var client = net.connect(options);

// 接続失敗時のイベント
client.on('error', function(e) {
    console.error('Connection Failed - ' + options.host + ':' + options.port);
    console.error(e.message);
});

// クライアントソケット接続確立時のイベント
client.on('connect', function() {
    console.log('Connected -' + options.host + ':' + options.port);
});

// Control+C でクライアントソケットをクローズできるようにします
var rl = readline.createInterface(process.stdin, process.stdout);
rl.on('SIGINT', function () {
    console.log('Connection Closed - ' + options.host + ':' + options.port);
    client.end();
    rl.close();
});

// 1秒ごとにtimeoutするように設定して 'Hello World' をサーバに送信
var i = 0;
client.setTimeout(1000);
client.on('timeout', function () {
    var str = i + ': Hello World\n';
    process.stdout.write('[S] ' + str);
    client.write(str);
    i = i + 1;
});

// Echoバックされてきたデータを標準出力に表示
client.on('data', function(chunk) {
    process.stdout.write(chunk.toString());
});

// クライアントソケット終了時のイベント
client.on('end', function () {
    client.setTimeout(0); // タイムアウトを無効化
    console.log('Conection End - ' + options.host + ':' + options.port);
});

client.on('close', function () {
    console.log('Client Closed');
    rl.close();
});