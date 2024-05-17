const mysql = require('mysql2/promise');

let pool = mysql.createPool({
  host: 'db.bluejackbot.jex.ink',
  port: 3306,
  user: 'root',
  password: 'Root123!',
  database: 'bluejackbot',
  connectionLimit: 10,
});

exports.query = async (sql, params) => {
  const [rows] = await pool.query(sql, params);
  return rows;
};
