const { query } = require('../database');

exports.handle = async (params) => {
  const { classId } = params;
  
  const [existingMapping] = await query('SELECT * FROM classes_bots_mapping WHERE class_id = ?', [classId]);

    if (existingMapping) {
        const [botInfo] = await query('SELECT bot_name FROM bot_channels WHERE id = ?', [existingMapping.bot_id]);
        const botName = botInfo.bot_name;

        return {
        message: "A bot has already been assigned to this class.",
        statusCode: 200,
        bot_id: existingMapping.bot_id,
        bot_name: botName,
        bot_invite_link: `https://line.me/R/ti/p/${existingMapping.bot_id}`
        };
    }

  //Balancing, finding the bot with lowest count of linked class first
  const botCounts = await query
  (
    `SELECT b.id AS bot_id, COALESCE(COUNT(c.id), 0) AS count
  FROM bot_channels AS b
  LEFT JOIN classes_bots_mapping AS c ON b.id = c.bot_id
  GROUP BY b.id
  ORDER BY count ASC;
  `
  );
  
  const minCount = Math.min(...botCounts.map(row => row.count));
  const leastUsedBots = botCounts.filter(row => row.count === minCount);
  const selectedBot = leastUsedBots[Math.floor(Math.random() * leastUsedBots.length)];

  await query('INSERT INTO classes_bots_mapping (class_id, bot_id) VALUES (?, ?)', [classId, selectedBot.bot_id]);

  const [botInfo] = await query('SELECT bot_name FROM bot_channels WHERE id = ?', [selectedBot.bot_id]);
  const botName = botInfo.name;

  return {
    message: "New bot has been assigned",
    statusCode: 200,
    bot_id: selectedBot.bot_id,
    bot_name: botName,
    bot_invite_link: `https://line.me/R/ti/p/${selectedBot.bot_id}`
  };
};
