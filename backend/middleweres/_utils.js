// middleware/_utils.js
const fs = require("fs");
function ensureDirSync(dir) { try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {} }
module.exports = { ensureDirSync };
