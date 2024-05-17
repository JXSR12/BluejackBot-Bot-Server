const schedule = require('node-schedule');
const { query } = require('./database');
const { pushMessage, getConfigByClassId } = require('./line_helper');
const scheduleAnnouncement = require('./commands/scheduleAnnouncement');
const moment = require('moment-timezone');
const { convertToMessage } = require('./utils/templateConverter')

/** Check for pending scheduled messages in the database that is meant to run at current timepoint every minute
 * 
 */
const checkScheduledMessages = async () => {
  const currentTime = new Date();
  const messages = await query('SELECT * FROM scheduled_messages WHERE time <= ?', [currentTime]);

  for (const message of messages) {
    const classIds = message.recipients_string.split(',');

    //Check if there is next_schedule_time
    //If yes, then schedule the next time
    if(message.next_schedule_time && message.next_schedule_time != null){
      scheduleAnnouncement.handle({
        recipients: message.recipients_string,
        msg: message.content,
        timestamp: formatTimestamp(message.next_schedule_time),
        schedulerUserId: message.scheduler_user_id,
        repeatOption: determineRepeatOption(message.next_schedule_time)
      });
    }

    for (const classId of classIds) {
      const [groupRecord] = await query('SELECT * FROM class_line_groups WHERE class_id = ?', [classId]);

      if (groupRecord && groupRecord.class_line_group_id) {
        const config = await getConfigByClassId(classId);
        const finalMsg = await convertToMessage(message.content, classId);
        await pushMessage(groupRecord.class_line_group_id, {type: "text", text: finalMsg}, config);
      }
    }

    await query('DELETE FROM scheduled_messages WHERE id = ?', [message.id]);
  }
};

function formatTimestamp(timestamp) {
  const utcOffset = 7;
  const formattedTimestamp = moment(timestamp, 'YYYY-MM-DD HH:mm:ss').utcOffset(utcOffset).format('YYYY-MM-DD HH:mm:ss') + 'UTC+0700';

  console.log(formattedTimestamp)
  return formattedTimestamp;
}

function determineRepeatOption(nextScheduleTime) {
  const currentTime = moment();
  const scheduleTime = moment(nextScheduleTime, 'YYYY-MM-DD HH:mm:ss');
  const differenceInDays = scheduleTime.diff(currentTime, 'days');

  if (Math.abs(differenceInDays - 7) <= Math.abs(differenceInDays - 14)) {
      return 'SEND_EVERY_WEEK';
  } else {
      return 'SEND_EVERY_OTHER_WEEK';
  }
}

schedule.scheduleJob('* * * * *', checkScheduledMessages);
