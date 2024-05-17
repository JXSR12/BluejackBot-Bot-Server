const { query } = require('../database');
const { pushMessage, getConfigByClassId } = require('../line_helper');
const { convertToMessage } = require('../utils/templateConverter')

exports.handle = async (params) => {
  const { recipients, msg, useTemplate, templateId, templateParams } = params;
  const classIds = recipients.split(',');

  try{
    for (const classId of classIds) {
      const [groupRecord] = await query('SELECT * FROM class_line_groups WHERE class_id = ?', [classId]);

      if (groupRecord && groupRecord.class_line_group_id) {
        const config = await getConfigByClassId(classId);
        const finalMsg = await convertToMessage(msg, classId);
        await pushMessage(groupRecord.class_line_group_id, {type: "text", text: finalMsg}, config);
      }
    }
  }catch(e){
    return {
      message: "ERROR: " + e,
      statusCode: 500
    };
  }
  

  return {
    message: "Announce successful",
    statusCode: 200
  };
};
