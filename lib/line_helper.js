const line = require('@line/bot-sdk');
const db = require('./database');

/**
 * Sends a reply message.
 *
 * @param {string} replyToken - Reply token from the incoming webhook event.
 * @param {(array|string)} messages - Messages to be sent in the reply message.
 * @param {object} config - LINE bot config containing channelAccessToken and channelSecret.
 */
exports.replyMessage = async (replyToken, messages, config) => {
  const client = new line.Client(config);
  try {
    await client.replyMessage(replyToken, messages);
  } catch (error) {
    console.error('Reply message error:', error.originalError.response.data);
  }
};

/**
 * Sends a push message.
 *
 * @param {string} groupId - Group ID to which the message should be pushed.
 * @param {(array|string)} messages - Messages to be sent in the push message.
 * @param {object} config - LINE bot config containing channelAccessToken and channelSecret.
 * 
 * WARNING: Using this method creates a push message that consumes the message cost in the LINE Messaging API. Use wisely!
 */
exports.pushMessage = async (groupId, messages, config) => {
  const client = new line.Client(config);
  try {
    await client.pushMessage(groupId, messages);
  } catch (error) {
    console.error('Push message error:', error);
  }
};


/**
 * Fetches LINE bot configuration by botName.
 *
 * @param {string} botName - Name of the bot.
 */
exports.getConfigByBotName = async (botName) => {
    const rows = await db.query('SELECT * FROM bot_channels WHERE bot_name = ?', [botName]);
    const botInfo = rows[0];
    if (!botInfo || !botInfo.in_service) {
      throw new Error('Invalid bot name or bot is not in service');
    }
    return {
      channelAccessToken: botInfo.channel_access_token,
      channelSecret: botInfo.channel_secret,
    };
  };
  
  /**
   * Fetches LINE bot configuration by classId.
   *
   * @param {string} classId - ID of the class.
   */
  exports.getConfigByClassId = async (classId) => {
    const mappingRows = await db.query('SELECT * FROM classes_bots_mapping WHERE class_id = ?', [classId]);
    const mappingInfo = mappingRows[0];
    if (!mappingInfo) {
      throw new Error('Invalid class ID');
    }
  
    const botRows = await db.query('SELECT * FROM bot_channels WHERE id = ?', [mappingInfo.bot_id]);
    const botInfo = botRows[0];
    if (!botInfo || !botInfo.in_service) {
      throw new Error('Invalid bot or bot is not in service');
    }
    return {
      channelAccessToken: botInfo.channel_access_token,
      channelSecret: botInfo.channel_secret,
    };
  };
/**
 * Fetches the bot name by the given LINE bot configuration.
 *
 * @param {object} config - LINE bot config containing channelAccessToken and channelSecret.
 * @returns {string} - Name of the bot.
 * @throws {Error} - Throws an error if bot not found.
 */
exports.getBotNameFromConfig = async (config) => {
    const { channelAccessToken, channelSecret } = config;
  
    const rows = await db.query(
      'SELECT * FROM bot_channels WHERE channel_access_token = ? AND channel_secret = ?',
      [channelAccessToken, channelSecret]
    );
  
    const botInfo = rows[0];
  
    if (!botInfo || !botInfo.in_service) {
      throw new Error('Invalid config or bot is not in service');
    }
  
    return botInfo.bot_name;
  };
  /**
 * Fetches the Class ID by the LINE Group ID.
 *
 * @param {object} groupId - LINE Group ID.
 * @returns {string} - Class Transaction ID.
 * @throws {Error} - Throws an error if bot not found.
 */
exports.getClassTransactionIdFromLINEGroupId = async (groupId) => {

  const rows = await db.query(
    'SELECT * FROM class_line_groups WHERE class_line_group_id = ?',
    [groupId]
  );

  const classInfo = rows[0];

  if (!classInfo) {
    throw new Error('Invalid group ID or class not found');
  }

  return classInfo.class_id;
};
  