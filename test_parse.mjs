import Papa from 'papaparse';
import fs from 'fs';

const csvText = fs.readFileSync('sheet.csv', 'utf8');

const result = Papa.parse(csvText, {
  header: false,
  skipEmptyLines: true,
});

const rows = result.data;
console.log("Total rows:", rows.length);
if (rows.length > 1) {
  const row2 = rows[1];
  console.log("Row 2 length:", row2.length);
  console.log("Index 72:", row2[72]);
  console.log("Index 73 (Categoria):", row2[73]);
  console.log("Index 74 (Estatus):", row2[74]);
  console.log("Index 75:", row2[75]);
}
