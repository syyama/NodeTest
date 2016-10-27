/**
 * Created by s-yamamoto on 2016/10/20.
 */

// TCPによるエコーサーバの実装（送信同期版）
var net = require('net');
var readline = require('readline');

var server = net.createServer();

// TCPクライアントの接続最大数を設定
server.maxConnections = 3;

// データコンストラクタ
function Data(d) {
    this.data = d;

    // タイムアウト済フラグ
    this.responded = false;
}

// クライアントコンストラクタ
function Client(socket) {

    this.counter = 0;
    this.socket = socket;
    this.t_queue = {}; // 未実行のタイマーオブジェクトを格納する配列
    this.w_queue = {}; // 未送信データを格納する配列
}

Client.prototype.writeData = function (d, id) {

    var socket = this.socket;
    var w_queue = this.w_queue;
    var t_queue = this.t_queue;

    // 送信データが一番最初の未送信データである場合に継続する
    if (w_queue[0].data !== d) return;

    // 頭から順番にタイムアウトが過ぎているデータを送信する
    while (w_queue[0] && w_queue[0].responded) {

        var w_data = w_queue.shift().data;

        if (socket.writable) {

            var key = socket.remoteAddress + ':' + socket.remotePort;

            precess.stdout.write('[' + key + '] - ' + w_data);

            socket.write('[R] ' + w_data, function() {
                delete t_queue[id];
            });
        }
    }
};

var clients = {};

// クライアント接続時のイベント (1)
// 接続開始のログ
server.on('connection', function(socket) {

    var status = server.connections + '/ ' + server.maxConnections;
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

        function writeDataDelayed(key, d) {

            var client = clients[key];
            var d_obj = new Data(d);

            client.w_queue.push(d_obj);

            var tmout = setTimeout(function() {
                // タイムアウト済みフラグを変更する
                d_obj.responded = true;
                client.writeData(d_obj.data, client.counter);
            }, Math.random() * 10 * 1000);

            client.t_queue[client.counter++] = tmout;
        }

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

// サーバの開始と終了処理
server.listen(11111, '127.0.0.1', function() {
    var addr = server.address();
    console.log('Linstening Start on Server - ' + addr.address + ':' + addr.port);
});

// Contorl+Cでサーバソケットをクローズ
var rl = readline.createInterface(process.stdin, process.stdout);

rl.on('SIGINT', function () {
    // すべてのソケットを終了する
    for (var i in clients) {
        var socket = clients[i].socket;
        var t_queue = clients[i].t_queue;

        socket.end();

        // 実行待ちのタイマーオブジェクトをクリアする
        for (var id in t_queue) {
            clearTimeout(t_queue[id]);
        }
    }

    server.close();
    rl.close();
});
