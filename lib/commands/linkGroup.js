const { query } = require('../database');
const { replyMessage, getConfigByClassId, pushMessage } = require('../line_helper');
const xml2js = require('xml2js');
const {makeSoapRequest, uploadToCloudinary} = require("../thirdpartyservices")

exports.handle = async (params) => {
  const { linkCode, classId } = params;

  let responseMessage = '';
  let statusCode = 200;

  const [existingCode] = await query('SELECT COUNT(*) AS count FROM group_link_codes WHERE code_value = ?', [linkCode]);
  if (existingCode.count === 0) {
    responseMessage = 'Linking failed. Code does not exist.';
    return { message: responseMessage, statusCode };
  }

  const [codeUsed] = await query('SELECT code_is_used FROM group_link_codes WHERE code_value = ?', [linkCode]);
  if (codeUsed.code_is_used === 1) {
    responseMessage = 'Linking failed. Code already used.';
    return { message: responseMessage, statusCode };
  }

  const [codeInfo] = await query('SELECT * FROM group_link_codes WHERE code_value = ?', [linkCode]);
  const groupId = codeInfo.code_group_id;

  const botIssuerId = codeInfo.code_bot_issuer_id;

  const soapEnvelope = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:mes="Messier">
    <soapenv:Header/>
    <soapenv:Body>
      <mes:GetScheduleDetails>
          <mes:classTransactionId>${classId}</mes:classTransactionId>
      </mes:GetScheduleDetails>
    </soapenv:Body>
  </soapenv:Envelope>
  `;
  let action = 'Messier/IGeneralApplicationService/GetScheduleDetails';

  try{
    const response = await makeSoapRequest(soapEnvelope, action);
    const parsed = await xml2js.parseStringPromise(response.data);
    if (!parsed['s:Envelope']['s:Body'] || !parsed['s:Envelope']['s:Body'][0]['GetScheduleDetailsResponse'][0]['GetScheduleDetailsResult'][0]['a:ScheduleDetail']) {
      responseMessage = `Linking failed. Class ID is not a valid practicum class transaction ID.`;
      return { message: responseMessage, statusCode: 400 };
    }
  }catch(error){
    responseMessage = `Linking failed. Class ID is not a valid practicum class transaction ID.`;
    return { message: responseMessage, statusCode: 400 };
  }
  
  //Check if bot is correct
  const [botInfo] = await query('SELECT * FROM bot_channels WHERE id = ?', [botIssuerId]);
  console.log("Issuer bot: ");
  console.log(botInfo)

   const [mapping] = await query('SELECT * FROM classes_bots_mapping WHERE class_id = ? AND bot_id = ?', [classId, botIssuerId]);
   console.log("Resulting mapping check: ");
   console.log(mapping);
   
   if (!mapping) {
     responseMessage = `LINKING FAILED ERROR: You invited the wrong bot (${botInfo.bot_name}) to the group chat. Please invite the correct bot as shown in the previous stage and try again.`;
     return { message: responseMessage, statusCode: 400 };
   }

  await query('INSERT INTO class_line_groups (class_id, class_line_group_id, last_linked_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE class_line_group_id = ?, last_linked_at = NOW()', [classId, groupId, groupId]);

  await query('UPDATE group_link_codes SET code_is_used = 1 WHERE code_value = ?', [linkCode]);

  const config = await getConfigByClassId(classId);
  await pushMessage(groupId, {type: "text", text: `Group linking successful. This group chat has been linked with the a practicum class`}, config);

  responseMessage = 'Linking successful';
  return { message: responseMessage, statusCode };
};
