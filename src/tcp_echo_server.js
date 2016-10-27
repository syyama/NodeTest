/**
 * Created by s-yamamoto on 2016/10/19.
 */

// TCPによるエコーサーバの実装
var net = require('net');
var readline = require('readline');

// TCPサーバを生成
var server = net.createServer();

// TCPクライアントの接続最大数を設定
server.maxConnections = 3;

// クライアントコンストラクタ
function Client(socket) {
    this.socket = socket;
}

Client.prototype.writeData = function(d) {

    var socket = this.socket;

    if (socket.writable) {
        var key = socket.remoteAddress + ':' + socket.remotePort;
        process.stdout.write('[' + key + '] - '  + d);
        socket.write('[R] ' + d);
    }
};

var clients = {}

// クライアント接続時のイベント (1)
// 接続開始のログ
server.on('connection', function(socket) {

    var status = server.connections + '/' + server.maxConnections;
    var key = socket.remoteAddress + ':' + socket.remotePort;

    console.log('Connection Start(' + status + ') - ' + key);
    clients[key] = new Client(socket);
});

// クライアント接続時のイベント (2)
// socket に対して data イベントリスナを登録する
server.on('connection', function(socket) {

    var data = '';
    var newline = /\r\n|\n/;

    socket.on('data', function(chunk) {
        // 改行コードが送られて来るまでためておく (Windowsのtelnetクライアント対応)
        data += chunk.toString();
        var key = socket.remoteAddress + ':' + socket.remotePort;
        if (newline.test(data)) {
            clients[key].writeData(data);
            data = '';
        }
    });
});

// クライアント接続時のイベント (3)
// クライアント接続終了時のイベントリスナを登録する
server.on('connection', function(socket) {

    var key = socket.remoteAddress + ':' + socket.remotePort;

    // socket が切断(FIN)を要求してきた時
    socket.on('end', function() {
        var status = server.connections + '/' + server.maxConnections;
        console.log('Connection End(' + status + ') - ' + key);

        delete clients[key];
    });
});

// サーバソケットクローズ時のイベント
// server.close() 後、すべての接続が終了したときにイベントが発生する
server.on('close', function() {
    console.log('Server Closed');
});

// TCPサーバをリッスンする
// サーバの開始と終了処理
server.listen(11111, '127.0.0.1', function() {
    var addr = server.address();
    console.log('Listening Start on Server - ' + addr.address + ':' + addr.port);
});

// Control+C でサーバソケットをクローズします
var rl = readline.createInterface(process.stdin, process.stdout);
rl.on('SIGINT', function() {
    // すべてのソケットを終了する
    for (var i in clients) {
        var socket = clients[i].socket;
        socket.end;
    }
    server.close();
    rl.close();
});
