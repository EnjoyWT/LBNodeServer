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
const  ROOM_NAME = "roomA"
io.on('connection', (socket) => {
  logger.log('a user connected');

    // 处理客户端发送的标识符，并将其存储在映射中
    socket.join(ROOM_NAME)

    socket.on('setIdentifier', (identifier) => {
      logger.log(`${identifier} 已上线`);
      // // 检查是否已经存在相同的键
      // if (socketMap.has(identifier)) {
      //   console.log(`Replacing existing entry for identifier ${identifier}`);
      //   socketMap.delete(identifier);
      // }
      // // 设置新的键值对
      // socketMap.set(identifier, socket);

      // const jsonData = jsonStorage.readData();
      // logger.log(` ${identifier}登录时 ,返回给登录者的数据是:  ${JSON.stringify(jsonData)}`);
      // socket.emit('serverUpdateData', jsonData);

    });


  const jsonData = jsonStorage.readData();
  logger.log(`登录时 返回 数据是 \n ${JSON.stringify(jsonData)}`);
  socket.emit('serverUpdateData', jsonData);

  // 处理客户端断开连接事件，并从映射中移除对应的标识符和 socket 实例
  socket.on('disconnect', () => {
    socketMap.forEach((value, key) => {
      if (value === socket) {
        logger.log(  key + ' 已下线');
        socketMap.delete(key);
      }
    });
  });

  // 处理来自客户端的查询数据请求
  socket.on('queryData', (identifier) => {
    logger.log(`${identifier} 开始queryData 数据`);
    // 读取JSON文件中的数据
    const jsonData = jsonStorage.readData();
    logger.log(`queryData 返回给 ${identifier}  数据是 \n ${JSON.stringify(jsonData)}`);
    socket.emit('serverUpdateData', jsonData);
  });

  socket.on('updateData', (jsondataString) => {
    let jsobj =  JSON.parse(jsondataString)
    logger.log(` 开始 updateData 数据 ${jsondataString}`);
    // 读取JSON文件中的数据
    jsonStorage.saveData(jsobj);
  });

  // 处理保存数据请求
  socket.on('saveData', ({ identifier, data }) => {
    logger.log(`收到 ${identifier} : ${JSON.stringify(data)}`);
    
    jsonStorage.saveData(data);
    socket.to(ROOM_NAME).emit('serverUpdateData', data);
  });

  
});

 
  
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
