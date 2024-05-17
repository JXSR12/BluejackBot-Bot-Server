const service = require('./modules/service');
const generateCode = require('./modules/generateCode');
const deleteLink = require('./modules/deleteLink');
const autoResponder = require('./modules/autoResponder');

const servicesApiHandler = require('./modules/servicesApiHandler');

const authMiddleware = require('./middlewares/authMiddleware');

const linkGroup = require('./commands/linkGroup');
const unlinkGroup = require('./commands/unlinkGroup');
const announceOneTime = require('./commands/announceOneTime');
const assignBotToClass = require('./commands/assignBotToClass');
const scheduleAnnouncement = require('./commands/scheduleAnnouncement');
const cancelSchedule = require('./commands/cancelSchedule');

const { middleware } = require('@line/bot-sdk');
const lineHelper = require('./line_helper');

/**
 * Handles LINE events from webhook calls.
 * @param {any[]} events 
 * @param {string} botName 
 */
const handleLineEvents = async (events, botName) => {
  const config = await lineHelper.getConfigByBotName(botName);
  
  for (const event of events) {
    if (event.type === 'message' && event.source.type === 'user') {
      await service.handle(event, config);
    } else if (event.type === 'message' && event.source.type === 'group') {
      await autoResponder.handle(event, config);
    } else if (event.type === 'join') {
      await generateCode.handle(event, config);
    } else if (event.type === 'leave') {
      await deleteLink.handle(event, config);
    } else if (event.type === 'postback' && event.source.type === 'user' && event.postback.data.startsWith('[SVPB]')){
      await service.handle(event, config);
    }
  }
};

exports.lineBotCallback = async (req, res) => {
  const botName = req.params.botName;
  console.log(`Received callback from bot ${botName}`);

  const config = await lineHelper.getConfigByBotName(botName);
  if (!config) {
    return res.status(400).send('Invalid bot name or bot is not in service');
  }

  const lineMiddleware = middleware(config);

  lineMiddleware(req, res, () => {
    handleLineEvents(req.body.events, botName);
  });

  res.send('OK');
};

/**
 * Handle requests mainly from dashboard web backend for a specific command alongside its params
 * @param {string} command 
 * @param {object} params 
 * @returns 
 */
const handleManualRequests = async (command, params, authKey) => {
  if (command === 'LINKGROUP') {
    return await authMiddleware.handle(linkGroup, params, authKey);
  } else if (command === 'UNLINKGROUP') {
    return await authMiddleware.handle(unlinkGroup, params, authKey);
  } else if (command === 'ANNOUNCE-ONE-TIME') {
    return await authMiddleware.handle(announceOneTime, params, authKey);
  } else if (command === 'CLASS-RETRIEVEBOT') {
    return await authMiddleware.handle(assignBotToClass, params, authKey);
  } else if (command === 'SCHEDULE-ANNOUNCEMENT') {
    console.log(params);
    return await authMiddleware.handle(scheduleAnnouncement, params, authKey);
  } else if (command === 'CANCEL-SCHEDULED-ANNOUNCEMENT') {
    return await authMiddleware.handle(cancelSchedule, params, authKey);
  }
};

exports.manualRequest = async (req, res) => {
  const command = req.body.command;
  const params = req.body.params;

  let authKey = 'AUTHKEY_EMPTY';

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    authKey = req.headers.authorization.split(' ')[1];
  }

  const response = await handleManualRequests(command, params, authKey);

  res.send(response);
};


exports.handleServiceApi = async (req, res) => {
  const endpointId = req.params.endpointId;
  const data = req.body.data;
  
  const response = await servicesApiHandler(endpointId, data);

  res.send(response);
};
