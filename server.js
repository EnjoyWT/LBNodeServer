const http = require('http');
const socketIo = require('socket.io');

const JsonFileStorage = require('./src/JsonFileStorage');

const Logger = require('./src/Logger');
const { log } = require('console');


//=======日志
// 指定日志目录
const logDirectory = './Logs';
// 创建Logger实例
const logger = new Logger(logDirectory);

//=====文件
// 指定JSON文件路径
const filePath = './data.json';
// 创建JsonFileStorage实例
const jsonStorage = new JsonFileStorage(filePath);

//====socket
const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
});
const io = socketIo(server,{
  cors: {
    origin: "*",  // 允许本地访问
    methods: ["GET", "POST"]
  }
});

// 用于存储连接的标识符和对应的 socket 实例的映射关系
const socketMap = new Map();

io.on('connection', (socket) => {
  logger.log('a user connected');

  // 处理客户端断开连接事件，并从映射中移除对应的标识符和 socket 实例
  socket.on('disconnect', () => {
    logger.log('A client disconnected');

    socketMap.forEach((value, key) => {
      if (value === socket) {
        logger.log(  key + ' client disconnected');
        socketMap.delete(key);
      }
    });
  });

  // 处理来自客户端的查询数据请求
  socket.on('queryData', (identifier) => {

    logger.log(`${identifier} 开始queryData 数据`);
    // 读取JSON文件中的数据
    const jsonData = jsonStorage.readData();
    logger.log(`返回给 ${identifier}  数据 ${jsonData}`);
    socket.emit('responseData', jsonData);
  });

  // 处理保存数据请求
  socket.on('saveData', ({ identifier, data }) => {
    logger.log(`收到 ${identifier} :`, data);
    
    // 在此处理保存数据的逻辑，例如保存数据到数据库等

    // 反馈给客户端数据已成功保存
    socket.emit('saveConfirmation', 'Data has been saved successfully');
  });
});

// 函数用于向指定标识符的客户端发送数据
function sendDataToClient(identifier, data) {
    const socket = socketMap.get(identifier);
    if (socket) {
      socket.emit('serverData', data);
      logger.log(`Sent data to client with identifier ${identifier}`);
    } else {
      logger.log(`${identifier} , 没在线`);
    }
  }
  
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
