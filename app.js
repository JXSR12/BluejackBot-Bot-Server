const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

//To initialize the scheduler
const scheduler = require('./lib/scheduler');

const handler = require('./lib/handler');

const app = express();

//Middlewares
app.use(bodyParser.json());
app.use(cors());

//Routes
app.post('/service/linebot/:botName/callback', handler.lineBotCallback);
app.post('/server/manualrequest', handler.manualRequest);

//API Routes
app.post('/api/services/:endpointId', handler.handleServiceApi)

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
