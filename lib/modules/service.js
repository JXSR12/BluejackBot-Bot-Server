const xml2js = require('xml2js');
const {makeSoapRequest} = require("../thirdpartyservices")
const { query } = require('../database');
const { getService, getServiceState, evaluateStateResponses } = require('../utils/serviceModel');
const { replyMessage, getBotNameFromConfig } = require('../line_helper');

let userPages = {};
let userStates = {};
let userServiceVars = {};

const MAX_PER_PAGE = 3; //This is fixed number because when using template message layout, LINE only allows a maximum of 4 items, because 1 is used for 'Next Page' button, so the max number of services to be displayed per page is 3.

const getTemplateMessage = async (page) => {
  const itemCountResult = await query('SELECT COUNT(*) AS count FROM services WHERE is_enabled = 1');
  const itemCount = itemCountResult[0].count;
  let maxPage = Math.ceil(itemCount / MAX_PER_PAGE);

  const startIndex = (page - 1) * MAX_PER_PAGE;
  let servicesToFetch = MAX_PER_PAGE;

  //Fetch 4 if there is only 4
  if (itemCount == MAX_PER_PAGE + 1) {
      servicesToFetch = MAX_PER_PAGE + 1;
      maxPage = 1; //Set maxPage to 1 so that when displayed, it is (1/1) because we put the 4th item in first page
  }

  const servicesResult = await query('SELECT * FROM services WHERE is_enabled = 1 LIMIT ?, ?', [startIndex, servicesToFetch]);

  const actions = servicesResult.map(service => ({
      "type": 'postback',
      "displayText": service.service_name,
      "data": `[SVPB]serviceId=${service.service_id}&serviceName=${service.service_name}`,
      "label": service.service_name.length > 20 ? `${service.service_name.substring(0, 18)}..` : service.service_name
  }));

  if(itemCount > MAX_PER_PAGE + 1){
    if(page < maxPage) {
      actions.push({
          "type": 'postback',
          "displayText": 'Next Page',
          "data": '[SVPB]services-page-next',
          "label": 'Next Page'
      });
    }else {
      actions.push({
          "type": 'postback',
          "displayText": 'Back to First Page',
          "data": '[SVPB]services-page-first',
          "label": 'Back to First Page'
      });
    }
  }

  return {
    "type": 'template',
    "altText": 'Here are the currently active services',
    "template": {
      "type": 'buttons',
      "title": `Currently Active Services (${page}/${maxPage})`,
      "text": 'Please select a service to continue',
      "actions": actions
    }
  };
};

const getConfirmMessage = (serviceName) => {
  return {
    "type": "template",
    "altText": "Confirm to use service",
    "template": {
      "type": "confirm",
      "text": `Confirm selecting '${serviceName}' service?`,
      "actions": [
        {
          "type": "postback",
          "label": "Yes",
          "displayText": "Yes",
          "data": "[SVPB]confirm-service"
        },
        {
          "type": "postback",
          "label": "No",
          "displayText": "No",
          "data": "[SVPB]cancel-service"
        }
      ]
    }
  }
}

exports.handle = async (event, config) => {
  const userId = event.source.userId;
  const replyToken = event.replyToken;
  const botName = await getBotNameFromConfig(config);
  const intro = `Hello, thank you for contacting Bluejack Bot via our registered instance ${botName}. Right now, here are the services that is available for you to use.`;
  let isDefaultState = true;
  var userMessage = '';

  let templateMessage = await getTemplateMessage(userPages[userId] ?? 1);
   
  //If user sends message to the bot
  if(event.type === 'message') {
    userMessage = event.message.text;

    if(!userStates[userId]){
      userStates[userId] = {
        stateData: {
          lastUserInput: userMessage
        }
      }
    }else{
      if(!userStates[userId].stateData){
        userStates[userId].stateData = {
            lastUserInput: userMessage
        }
      }else{
        userStates[userId].stateData.lastUserInput = userMessage;
      }
    }
    

    //If user sends 'CANCEL'
    if(userMessage.toUpperCase() === 'CANCEL'){
      if(userStates[userId] && userStates[userId].stateType === 'USING_SERVICE'){
        //If user is using a service, quit it and change back to default state
        delete userStates[userId];
      }else{
        //If user is not using a service, just send a warning
        //isDefaultState is set to false to prevent sending the default message
        isDefaultState = false;
        await replyMessage(replyToken, {type: 'text', text: 'You are not using any service at the moment. Type anything to view the services list.'}, config);
      }
    }else{
      //If any other message than 'CANCEL'
      if(userStates[userId] && userStates[userId].stateType === 'USING_SERVICE'){
        isDefaultState = false;

        console.log(JSON.stringify(userStates[userId]));

        //If user is using a service, pass the input to the service that is being used
        let rerun = false;
        let service = await getService(userStates[userId].stateData.serviceId);

        let combinedMessages = [];

        do{
          rerun = false;

          let stateId = userStates[userId].stateData.serviceStateId ?? service.initial_state_id;
          let state = await getServiceState(stateId);
          let input = userStates[userId].stateData.lastUserInput ?? '';
          let stateResult = await evaluateStateResponses(state, replyToken, config, input);

          combinedMessages = stateResult.messages;

          if(stateResult.status === 'EXECUTED'){
            console.log('State Res: EXECUTED')

            if(stateResult.responseType === 'JUMP_TO_STATE'){
              userStates[userId].stateData.serviceStateId = stateResult.responseValue;
              console.log('Jumped to state ' + userStates[userId].stateData.serviceStateId)
              
              rerun = true;

            }else if(stateResult.responseType === 'FINISH'){
              console.log('Reset the state to default')

              combinedMessages.push({type: 'text', text: `The service ${userStates[userId].stateData.serviceName} has finished running. You will be sent back to the services menu, type anything to continue.`});

              delete userStates[userId];
            }

            if(rerun) continue;

            console.log('State Res: Executed Msg')
            console.log(combinedMessages)
          }else{
            console.log('State Res: Not Executed')
            console.log(combinedMessages)
          }
        }while(rerun);

        await replyMessage(replyToken, combinedMessages, config);
      }else{
        isDefaultState = true;
      }
    }
  }

  if(event.type === 'postback' && event.postback.data.startsWith('[SVPB]serviceId=')){
    isDefaultState = false;
    let dataString = event.postback.data.split('[SVPB]')[1];

    let params = dataString.split('&');

    let serviceIdParam = params.find(param => param.startsWith('serviceId='));
    let serviceId = serviceIdParam.split('=')[1];

    let serviceNameParam = params.find(param => param.startsWith('serviceName='));
    let serviceName = serviceNameParam.split('=')[1];

    userStates[userId] = {
      stateType: 'WAITING_SERVICE_CONFIRMATION',
      stateData: {
        serviceId: serviceId,
        serviceName: serviceName
      }
    }

    await replyMessage(replyToken, getConfirmMessage(serviceName), config);
  }else if(event.type === 'postback' && event.postback.data.startsWith('[SVPB]services-page-next')){
    isDefaultState = false;
    let currentPage = userPages[userId] ?? 1;
    userPages[userId] = currentPage + 1;

    templateMessage = await getTemplateMessage(userPages[userId] ?? 1);
    await replyMessage(replyToken, templateMessage, config);

  }else if(event.type === 'postback' && event.postback.data.startsWith('[SVPB]services-page-first')){
    isDefaultState = false;
    userPages[userId] = 1;
    templateMessage = await getTemplateMessage(userPages[userId] ?? 1);
    await replyMessage(replyToken, templateMessage, config);

  }else if(userStates[userId] && userStates[userId].stateType && userStates[userId].stateType === 'WAITING_SERVICE_CONFIRMATION'){
    if(event.type === 'postback' && event.postback.data === '[SVPB]confirm-service'){
      userStates[userId].stateType = 'USING_SERVICE';
      isDefaultState = false;

      await replyMessage(replyToken, {type: 'text', text: `You are currently using ${userStates[userId].stateData.serviceName} service. Type 'CANCEL' to quit at anytime, type anything else to start.`}, config);

    }else if(event.type === 'postback' && event.postback.data === '[SVPB]cancel-service'){
      delete userStates[userId];
    }
  }

  const initialResponse = [
    { type: 'text', text: intro },
    templateMessage
  ];
  
  if(isDefaultState){
    await replyMessage(replyToken, initialResponse, config);
  }
};
