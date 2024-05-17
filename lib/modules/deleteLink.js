const { query } = require('../database');

exports.handle = async (event, config) => {
  const groupId = event.source.groupId;
  await query('DELETE FROM class_line_groups WHERE class_line_group_id = ?', [groupId]);
  await query('DELETE FROM group_link_codes WHERE code_group_id = ?', [groupId]);
};
