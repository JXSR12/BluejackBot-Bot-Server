const { query } = require('../database');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');

exports.handle = async (params) => {
    const { scheduleId, userId } = params;

    try {
      // Delete the scheduled message with the given scheduleId
      await query('DELETE FROM scheduled_messages WHERE id = ?', [scheduleId]);
  
    } catch (error) {
      console.error('Database error:', error);
      return {
        message: 'Failed to cancel the scheduled message',
        statusCode: 500
      };
    }
  
    return {
      message: 'Scheduled message with ID ' + scheduleId + ' has been cancelled.',
      statusCode: 200
    };
  };
  
