const { query } = require('../database');
const { replyMessage, getBotNameFromConfig, getClassTransactionIdFromLINEGroupId } = require('../line_helper');

exports.handle = async (event, config) => {
    const groupId = event.source.groupId;
    const userId = event.source.userId;
    const replyToken = event.replyToken;
    const userMessage = event.message.text;
  
    const botName = getBotNameFromConfig(config);
    const classId = await getClassTransactionIdFromLINEGroupId(groupId);

    console.log('groupId: ' + groupId);
    console.log('classId: ' + classId);

    const autoResponses = await query(
      "SELECT trigger_type, trigger_words, response_message FROM auto_responses WHERE trigger_recipients LIKE ? AND is_enabled = 1",
      [`%${classId}%`]
    );

    for (let response of autoResponses) {
      console.log('Checking an autoresponse')
      const triggerWords = response.trigger_words.split(',');
      const responseMessage = response.response_message;
  
      if (response.trigger_type === 'CONTAINS') {
        console.log('Is Contains')
        if (triggerWords.some(word => userMessage.includes(word))) {
          console.log('Contains fulfilled')
          await replyMessage(replyToken, { type: 'text', text: responseMessage }, config);
          return;
        }
      } else if (response.trigger_type === 'EQUALS') {
        console.log('Is Equals')
        if (triggerWords.includes(userMessage)) {
          console.log('Equals fulfilled')
          await replyMessage(replyToken, { type: 'text', text: responseMessage }, config);
          return;
        }
      }
    }
  };
  