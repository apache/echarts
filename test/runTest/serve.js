const handler = require('serve-handler');
const http = require('http');
const port = 8866;
const origin = `http://localhost:${port}`;

function serve() {
    const server = http.createServer((request, response) => {
        return handler(request, response, {
            cleanUrls: false,
            // Root folder of echarts
            public: __dirname + '/../../'
        });
    });

    server.listen(port, () => {
        console.log(`Server started. ${origin}`);
    });


    const io = require('socket.io')(server);
    return {
        broadcast(data) {
            io.emit('broadcast', data);
        },
        io
    }
}

module.exports = {serve, origin};