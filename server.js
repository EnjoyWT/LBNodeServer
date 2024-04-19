const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');

const JsonFileStorage = require('./src/JsonFileStorage');

const Logger = require('./src/Logger');
const { log } = require('console');


const moment = require('moment-timezone');

var dailyCounter = 0;
var lastResetTime = moment.tz('Asia/Shanghai').startOf('day');


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
    dailyCounter += 1;
    let jsobj =  JSON.parse(jsondataString)
    logger.log(` 开始 updateData 数据 ${jsondataString}`);
    // 读取JSON文件中的数据
    jsonStorage.saveData(jsobj);
    socket.to(ROOM_NAME).emit('statusTodayUpdate', dailyCounter);

  });

  // 处理保存数据请求
  socket.on('saveData', ({ identifier, data }) => {
    logger.log(`收到 ${identifier} : ${JSON.stringify(data)}`);
    
    jsonStorage.saveData(data);
    socket.to(ROOM_NAME).emit('serverUpdateData', data);
  });

  socket.on('queryStatusData', ({start,end}) => {
  
    const startDate = moment.tz(start, 'Asia/Shanghai');
    const endDate = moment.tz(end, 'Asia/Shanghai').endOf('day');
   
    fs.readFile('stats.txt', 'utf8', (err, data) => {
      if (err) {
          console.error('Error reading stats file:', err);
          return;
      }
        const filteredData = data
        .split('\n')
        .filter(line => {
            if (!line.trim()) return false; // Skip empty lines
            
            const timestamp = moment.tz(line.split(' % ')[0], 'Asia/Shanghai');
            return timestamp.valueOf() >= startDate.valueOf() && timestamp.valueOf() <= endDate.valueOf();
        }).map(line => {
              const [date, count] = line.split(' % ');
              return { date, count: parseInt(count) };
          });

      socket.emit('statusHistoryUpdate', filteredData);
  });
  });  
});

 

// Reset the daily counter and save the stats to a file at the end of the day
function resetDailyCounter() {
  // Read the existing data from the file
  fs.readFile('./stats.txt', 'utf8', (err, data) => {
      if (err) {
          console.error('Error reading stats file:', err);
          return;
      }

      // Check if last reset date is the same as today's date
      const today = moment.tz('Asia/Shanghai').startOf('day');
      const lastResetDate = moment.tz(lastResetTime, 'Asia/Shanghai').startOf('day');
      if (lastResetDate.isSame(today, 'day')) {
          // If date is the same, update the last line with the new counter value
          const lines = data.trim().split('\n');
          lines[lines.length - 1] = `${lastResetTime.format('YYYY-MM-DD')} % ${dailyCounter}`;

          const updatedData = lines.join('\n') + '\n';

          // Write the updated data to the file
          fs.writeFile('stats.txt', updatedData, (err) => {
              if (err) {
                  console.error('Error updating stats file:', err);
                  logger.log(`更新数据失败: 当天:${lastResetTime.format('YYYY-MM-DD')},抽奖总次数为:${dailyCounter}`);
              }else{
                logger.log(`更新数据当天:${lastResetTime.format('YYYY-MM-DD')},抽奖总次数为:${dailyCounter}`);
              }
            dailyCounter = 0;
            lastResetTime = moment.tz('Asia/Shanghai').startOf('day');

          });
      } else {
          // If date is different, append the new data to the file
          fs.appendFile('stats.txt', `${lastResetTime.format('YYYY-MM-DD')} - ${dailyCounter} calls\n`, (err) => {
              if (err) {
                  console.error('Error saving stats:', err);
              } else {
                  logger.log(`新增数据当天:${lastResetTime.format('YYYY-MM-DD')},抽奖总次数为:${dailyCounter}`);
              }
              dailyCounter = 0;
              lastResetTime = moment.tz('Asia/Shanghai').startOf('day');

          });
      }

  });


}

// Schedule the daily counter reset
setInterval(() => {
  const now = moment.tz('Asia/Shanghai');
  if (now.isAfter(lastResetTime.endOf('day'))) {
      resetDailyCounter();
  }
}, 1*60*60*1000); // 1  小时检查一次

  
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
