const axios = require('axios');

exports.makeSoapRequest = async (soapEnvelope, action) => {
    return axios.post('https://socs1.binus.ac.id/messier/GeneralApplication.svc', soapEnvelope, {
      headers: {
        'Content-Type': 'text/xml',
        'SOAPAction': action,
      },
    });
  };
  