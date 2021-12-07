const fs = require('fs');

module.exports = journal = async (uuid, info, obj) => {
    const line = `${new Date().getTime()} ${uuid} ${info} ${JSON.stringify(obj)}\n`;
    fs.appendFileSync('./journal.log', line, 'utf8');
};