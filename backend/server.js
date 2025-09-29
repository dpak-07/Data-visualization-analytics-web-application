// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const allRoutes = require('./routes'); // index.js automatically picked

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api', allRoutes); // /api/auth, /api/mous etc.

app.listen(3000, () => console.log('Server running on port 3000'));
