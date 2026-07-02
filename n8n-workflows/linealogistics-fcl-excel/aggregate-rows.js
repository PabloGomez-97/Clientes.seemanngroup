const items = $input.all();

const rows = items
  .map((item) => item.json.values)
  .filter((values) => Array.isArray(values) && values.length > 0);

return [
  {
    json: {
      rowsJson: JSON.stringify(rows),
      rowsCount: rows.length,
    },
  },
];
