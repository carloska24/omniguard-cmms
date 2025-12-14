import fs from 'fs';
import pdf from 'pdf-parse';

const dataBuffer = fs.readFileSync(
  'c:/omniguard-cmms/ESCOPO DETALHADO DO PROJETO_ SISTEMA DE GESTÃO DE MANUTENÇÃO (SGM).pdf'
);

pdf(dataBuffer)
  .then(function (data) {
    console.log(data.text);
  })
  .catch(err => {
    console.error('Error reading PDF:', err);
  });
