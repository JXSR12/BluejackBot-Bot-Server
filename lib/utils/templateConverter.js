const { query } = require('../database');
const { makeSoapRequest } = require('../thirdpartyservices');
const xml2js = require('xml2js');

exports.convertToMessage = async (rawMsg, classId) => {
    var className = 'UNDEFINED';
    var courseCode = 'UNDEFINED';
    var courseName = 'UNDEFINED';

    const soapEnvelope = `
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:mes="Messier">
            <soapenv:Header/>
            <soapenv:Body>
                <mes:GetStudentClassGroupByClassTransactionId>
                    <mes:classTransactionId>${classId}</mes:classTransactionId>
                </mes:GetStudentClassGroupByClassTransactionId>
            </soapenv:Body>
        </soapenv:Envelope>
    `;

    let action = 'Messier/IGeneralApplicationService/GetStudentClassGroupByClassTransactionId';
    try {
        const response = await makeSoapRequest(soapEnvelope, action);
        const parsed = await xml2js.parseStringPromise(response.data);

        var resObj = parsed['s:Envelope']['s:Body'][0]['GetStudentClassGroupByClassTransactionIdResponse'][0]['GetStudentClassGroupByClassTransactionIdResult'][0];

        if (resObj['a:Class']) {
            className = resObj['a:Class'][0];
            let subjectParts = resObj['a:Subject'][0].split('-');
            courseCode = subjectParts[0];
            courseName = subjectParts[1];
        }
    } catch (error) {
        console.error('SOAP Request failed:', error);
    }

    let finalMsg = rawMsg.replace(/\{\?(\w+)#fixed:Course Code\}/g, courseCode)
                         .replace(/\{\?(\w+)#fixed:Course Name\}/g, courseName)
                         .replace(/\{\?(\w+)#fixed:Class Name\}/g, className);

    return finalMsg;
};
