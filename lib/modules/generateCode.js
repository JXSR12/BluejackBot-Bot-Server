const { query } = require('../database');
const { replyMessage } = require('../line_helper');
const line = require('@line/bot-sdk');
const { generateCode } = require('../utils/linkingCodeGenerator');

exports.handle = async (event, config) => {
  const groupId = event.source.groupId;
  const [existingGroup] = await query('SELECT * FROM class_line_groups WHERE class_line_group_id = ?', [groupId]);

  if (!existingGroup) {
    const code = await generateCode();
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(now.getDate() + 180); //6 months from now (configurable)

    const [currentBot] = await query('SELECT * FROM bot_channels WHERE channel_secret = ? AND channel_access_token = ?', [config.channelSecret, config.channelAccessToken]);

    if (!currentBot) {
      responseMessage = 'Invalid bot configuration. Please check your config settings.';
      return { message: responseMessage, statusCode: 400 };
    }

    const botId = currentBot.id;
    
    await query('INSERT INTO group_link_codes (code_value, code_group_id, code_issued_at, code_expires_at, code_is_used, code_bot_issuer_id) VALUES (?, ?, ?, ?, ?, ?)', 
    [code, groupId, now, expiresAt, 0, botId]);

    const flexMessage = {
      "type": "flex",
      "altText": `Group linking code: ${code}`,
      "contents": {
        "type": "bubble",
        "size": "giga",
        "body": {
          "type": "box",
          "layout": "vertical",
          "backgroundColor": "#0367D3",
          "spacing": "md",
          "contents": [
            {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": "BluejackBot Setup",
                  "color": "#ffffff",
                  "size": "lg",
                  "weight": "bold",
                  "align": "center"
                }
              ]
            },
            {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": "Group Linking Code",
                  "color": "#ffffff66",
                  "size": "sm",
                  "align": "center"
                },
                {
                  "type": "text",
                  "text": code,
                  "color": "#ffef00",
                  "size": "3xl",
                  "weight": "bold",
                  "align": "center"
                },
                {
                  "type": "text",
                  "text": "Enter the code on the bot dashboard to link this group to a class",
                  "color": "#ffffffaa",
                  "size": "sm",
                  "wrap": true,
                  "align": "center"
                }
              ]
            }
          ]
        }
      }
    };

    const textMessages = [
      { type: 'text', text: 'BluejackBot has joined this group, therefore it needs some setup before it can work properly.' },
      { type: 'text', text: 'Log in to your BluejackBot Dashboard using your initial and password, then head to \'Classes\'.' },
      { type: 'text', text: 'Choose the practicum class you want to link with this group chat.' },
      { type: 'text', text: 'Click on "Link LINE Group" and enter the following code when prompted.' },
      flexMessage
    ];

    await replyMessage(event.replyToken, textMessages, config);
  }
};
