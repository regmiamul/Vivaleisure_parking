// App.jsx

import React, { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';

const App = () => {
  const [data, setData] = useState([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const storedData = localStorage.getItem('parkingData');
    if (storedData) {
      setData(JSON.parse(storedData));
    }
  }, []);

  const handleBulkUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setScanning(true);
    const entries = [];

    for (const file of files) {
      const imageData = await readFileAsDataURL(file);
      const result = await Tesseract.recognize(imageData, 'eng');
      const rawText = result.data.text;

      let cleanText = rawText.replace(/[^\x20-\x7E]/g, '');
      cleanText = cleanText.replace(/\s+/g, ' ');

      const dateMatch = cleanText.match(/(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4})\s*(\d{2}:\d{2})?/);
      const dateString = dateMatch ? `${dateMatch[1]} ${dateMatch[2] || ''}`.trim() : 'Not found';

      const costMatch = cleanText.match(/-\s*\$?(\d+\.\d{2})/);
      const cost = costMatch ? `$${costMatch[1]}` : 'Not found';

      entries.push({ date: dateString, cost, image: imageData });
    }

    const sorted = entries.sort((a, b) => {
      const d1 = new Date(a.date);
      const d2 = new Date(b.date);
      return d1 - d2;
    });

    setData(sorted);
    localStorage.setItem('parkingData', JSON.stringify(sorted));
    setScanning(false);
  };

  const readFileAsDataURL = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Parking Data');

    worksheet.columns = [
      { header: 'Image', key: 'image', width: 20 },
      { header: 'Date', key: 'date', width: 25 },
      { header: 'Cost', key: 'cost', width: 15 },
    ];

    for (let i = 0; i < data.length; i++) {
      const { image, date, cost } = data[i];

      worksheet.addRow({ date, cost });

      const ext = image.includes('jpeg') ? 'jpeg' : 'png';

      const imageId = workbook.addImage({
        base64: image,
        extension: ext,
      });

      worksheet.addImage(imageId, {
        tl: { col: 0, row: i + 1 },
        ext: { width: 150, height: 100 },
      });

      worksheet.getRow(i + 2).height = 80;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, 'parking_data.xlsx');
  };

  const clearData = () => {
    if (window.confirm("Are you sure you want to clear all scanned data?")) {
      setData([]);
      localStorage.removeItem('parkingData');
    }
  };

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif',
      padding: '30px',
      maxWidth: '900px',
      margin: '0 auto',
      backgroundColor: '#000',
      borderRadius: '15px',
      color: '#fff',
      minHeight: '100vh',
    }}>
      <div style={{
        backgroundColor: '#1976d2',
        color: 'white',
        padding: '20px',
        borderRadius: '12px',
        textAlign: 'center',
        marginBottom: '30px',
        fontSize: '28px',
        fontWeight: 'bold',
        letterSpacing: '1px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>
        VIVALEISURE PARKING SYSTEM
      </div>

      <div style={{ textAlign: 'center' }}>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleBulkUpload}
          style={inputStyle}
        />
        {scanning && <p>🔄 Scanning all files... Please wait.</p>}
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button onClick={exportToExcel} style={{ ...buttonStyle, backgroundColor: '#4caf50' }}>
          📤 Export to Excel
        </button>
        <button onClick={clearData} style={{ ...buttonStyle, backgroundColor: '#e53935' }}>
          🗑️ Clear All Data
        </button>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h4>Parsed Data:</h4>
        <ul style={{ lineHeight: '1.6', listStyle: 'none', paddingLeft: '0' }}>
          {data.map((entry, index) => (
            <li key={index} style={{ marginBottom: '20px' }}>
              <img
                src={entry.image}
                alt="preview"
                width={120}
                style={{ borderRadius: '8px', border: '1px solid #444', marginBottom: '8px' }}
              /><br />
              📅 <strong>Date:</strong> {entry.date} | 💰 <strong>Cost:</strong> {entry.cost}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const buttonStyle = {
  margin: '10px',
  padding: '10px 20px',
  fontSize: '16px',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
  backgroundColor: '#2196f3',
  color: '#fff',
};

const inputStyle = {
  display: 'block',
  margin: '10px auto',
  fontSize: '14px',
  color: '#fff',
};

export default App;
