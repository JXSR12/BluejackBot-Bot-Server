const { query } = require('../database');

exports.generateCode = async () => {
    let generatedCode = '';
    let isUnique = false;
  
    while (!isUnique) {
      generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
  
      const [existingCode] = await query('SELECT * FROM group_link_codes WHERE code_value = ?', [generatedCode]);
  
      if (existingCode === undefined) {
        isUnique = true;
      }
    }
  
    return generatedCode;
  };