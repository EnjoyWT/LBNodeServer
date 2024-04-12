const fs = require('fs');

class JsonFileStorage {
  constructor(filePath) {
    this.filePath = filePath;
  }

  // 读取JSON文件并返回数据
  readData() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading JSON file:', error);
      return null;
    }
  }
  // 保存数据到JSON文件
  saveData(data) {
    try {
      const jsonData = JSON.stringify(data, null, 2);
      fs.writeFileSync(this.filePath, jsonData, 'utf8');
      console.log('Data saved to JSON file successfully');
    } catch (error) {
      console.error('Error saving data to JSON file:', error);
    }
  }
}

module.exports = JsonFileStorage;
