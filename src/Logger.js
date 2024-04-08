
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

class Logger {
  constructor(logDirectory) {
    this.logDirectory = logDirectory;
    this.logger = winston.createLogger({
        format: winston.format.combine(
            winston.format.timestamp(), // 包含时间戳
            winston.format.json() // 以JSON格式记录日志
          ),
      transports: [
        new DailyRotateFile({
          dirname: this.logDirectory,
          filename: 'app-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxFiles: '30d'
        }),
        new winston.transports.Console()
      ]
    });
  }

  log(message) {
    this.logger.log({
      level: "info",
      message: message
    });
  }
}

module.exports = Logger;