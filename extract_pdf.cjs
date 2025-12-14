const fs = require('fs');
const pdfLib = require('pdf-parse');

console.log('Type of pdfLib:', typeof pdfLib);
console.log('Keys of pdfLib:', Object.keys(pdfLib));

const dataBuffer = fs.readFileSync(
  'c:/omniguard-cmms/ESCOPO DETALHADO DO PROJETO_ SISTEMA DE GESTÃO DE MANUTENÇÃO (SGM).pdf'
);

let pdfFunc = pdfLib;
if (typeof pdfLib !== 'function') {
  if (pdfLib.default && typeof pdfLib.default === 'function') {
    pdfFunc = pdfLib.default;
  } else {
    console.error('Could not find pdf parse function');
    process.exit(1);
  }
}

pdfFunc(dataBuffer)
  .then(function (data) {
    console.log('--- START PDF TEXT ---');
    console.log(data.text);
    console.log('--- END PDF TEXT ---');
  })
  .catch(err => {
    console.error('Error reading PDF:', err);
  });
