const { query } = require('../database');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');

//valid repeatOption(s) are:
// - SEND_ONCE : Only send the message once
// - SEND_EVERY_WEEK : Send the message every week on the same day and time
// - SEND_EVERY_OTHER_WEEK : Send the message every two weeks on the same day and time

exports.handle = async (params) => {
  const { msg, recipients, timestamp, schedulerUserId, repeatOption, useTemplate, templateId, templateParams } = params;

  console.log('Schedule announcement params:')
  console.log(params);

  const messageId = uuidv4();

  //utk format timestamp yg valid cth: '2023-20-12 10:25:00UTC+0700'
  const timeZoneMatch = timestamp.match(/UTC([+-]\d{4})$/);
  
  if (!timeZoneMatch || timeZoneMatch.length < 2) {
    return {
      message: 'Invalid timestamp format',
      statusCode: 400
    };
  }
  
  const timeZoneOffset = timeZoneMatch[1];
  const dateTime = timestamp.substring(0, timestamp.length - 8);

  const localTime = moment.tz(dateTime, `YYYY-MM-DD HH:mm:ss`, `Etc/GMT${parseInt(timeZoneOffset) / 100 * -1}`);
  const utcTime = localTime.clone().tz('UTC').format('YYYY-MM-DD HH:mm:ss');

  try {
    if(repeatOption === 'SEND_ONCE'){
      await query('INSERT INTO scheduled_messages (id, recipients_string, content, time, scheduler_user_id) VALUES (?, ?, ?, ?, ?)', [messageId, recipients, msg, utcTime, schedulerUserId]);
    }else if(repeatOption === 'SEND_EVERY_WEEK'){
      let nextWeekTime = localTime.clone();
      nextWeekTime.add(1, 'week');

      nextWeekTime = nextWeekTime.tz('UTC').format('YYYY-MM-DD HH:mm:ss');

      await query('INSERT INTO scheduled_messages (id, recipients_string, content, time, scheduler_user_id, next_schedule_time) VALUES (?, ?, ?, ?, ?, ?)', [messageId, recipients, msg, utcTime, schedulerUserId, nextWeekTime]);
    }else if (repeatOption === 'SEND_EVERY_OTHER_WEEK'){
      let nextTwoWeekTime = localTime.clone();
      nextTwoWeekTime.add(2, 'week');

      nextTwoWeekTime = nextTwoWeekTime.tz('UTC').format('YYYY-MM-DD HH:mm:ss');

      await query('INSERT INTO scheduled_messages (id, recipients_string, content, time, scheduler_user_id, next_schedule_time) VALUES (?, ?, ?, ?, ?)', [messageId, recipients, msg, utcTime, schedulerUserId, nextTwoWeekTime]);
    }
    
  } catch (error) {
    console.error('Database error:', error);
    return {
      message: 'Failed to schedule the message',
      statusCode: 500
    };
  }

  return {
    message: 'Message scheduled successfully',
    statusCode: 200
  };
};
