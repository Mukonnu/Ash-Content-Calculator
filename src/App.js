import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Calculator, Upload, Download, HelpCircle } from 'lucide-react';
import { read, utils, write } from 'xlsx';

const CharYieldCalculator = () => {
  const [samples, setSamples] = useState([
    { name: 'サンプル 1', crucibleNumber: '', crucible: '', sample: '', ash: '', yield: null }
  ]);
  const [error, setError] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // 初回利用時にガイドを表示
    if (!localStorage.getItem('guideSeen')) {
      setShowGuide(true);
      localStorage.setItem('guideSeen', 'true');
    }
  }, []);

  const calculateYield = (crucible, sample, ash) => {
    const charWeight = ash - crucible;
    return (charWeight / sample) * 100;
  };

  const handleInputChange = (index, field, value) => {
    const newSamples = [...samples];
    newSamples[index][field] = value;
    
    // 自動計算機能
    if (field === 'crucible' || field === 'sample' || field === 'ash') {
      const { crucible, sample, ash } = newSamples[index];
      if (crucible !== '' && sample !== '' && ash !== '') {
        const yieldValue = calculateYield(parseFloat(crucible), parseFloat(sample), parseFloat(ash));
        newSamples[index].yield = yieldValue.toFixed(2);
      }
    }
    
    setSamples(newSamples);
    setError('');
  };

  const handleCalculate = () => {
    const newSamples = samples.map(sample => {
      const { crucible, sample: sampleWeight, ash } = sample;
      if (crucible === '' || sampleWeight === '' || ash === '') {
        return { ...sample, yield: null };
      }
      const crucibleWeight = parseFloat(crucible);
      const sampleWeightFloat = parseFloat(sampleWeight);
      const ashWeight = parseFloat(ash);
      
      if (isNaN(crucibleWeight) || isNaN(sampleWeightFloat) || isNaN(ashWeight)) {
        setError('すべての入力値は数値である必要があります。');
        return { ...sample, yield: null };
      }
      if (ashWeight <= crucibleWeight) {
        setError('灰化後重量はるつぼ重量より大きい必要があります。');
        return { ...sample, yield: null };
      }
      if (sampleWeightFloat <= 0) {
        setError('サンプル重量は0より大きい必要があります。');
        return { ...sample, yield: null };
      }
      
      const yieldValue = calculateYield(crucibleWeight, sampleWeightFloat, ashWeight);
      return { ...sample, yield: yieldValue.toFixed(2) };
    });
    setSamples(newSamples);
  };

  const addSample = () => {
    setSamples([...samples, { name: `サンプル ${samples.length + 1}`, crucibleNumber: '', crucible: '', sample: '', ash: '', yield: null }]);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = utils.sheet_to_json(worksheet);
      
      const newSamples = jsonData.map((row, index) => ({
        name: row['サンプル名'] || `サンプル ${index + 1}`,
        crucibleNumber: row['るつぼ番号'] || '',
        crucible: row['るつぼ重量'] || '',
        sample: row['サンプル重量'] || '',
        ash: row['灰化後重量'] || '',
        yield: row['チャー収率'] || null
      }));
      
      setSamples(newSamples);
    };
    reader.readAsArrayBuffer(file);
  };

  const exportToExcel = () => {
    const workbook = utils.book_new();
    const worksheet = utils.json_to_sheet(samples.map(sample => ({
      'サンプル名': sample.name,
      'るつぼ番号': sample.crucibleNumber,
      'るつぼ重量': sample.crucible,
      'サンプル重量': sample.sample,
      '灰化後重量': sample.ash,
      'チャー収率': sample.yield
    })));
    utils.book_append_sheet(workbook, worksheet, 'チャー収率データ');
    const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'char_yield_data.xlsx';
    link.click();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-indigo-800 mb-6">チャー収率計算システム</h2>
      
      {showGuide && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
          <h3 className="font-bold">使い方ガイド</h3>
          <p>1. サンプル情報を入力してください。</p>
          <p>2. 「計算」ボタンをクリックすると結果が表示されます。</p>
          <p>3. CSVファイルからデータをインポートすることもできます。</p>
          <p>4. 結果はExcelファイルとしてエクスポートできます。</p>
          <button onClick={() => setShowGuide(false)} className="mt-2 text-yellow-700 underline">閉じる</button>
        </div>
      )}
      
      <div className="space-y-6 mb-8">
        {samples.map((sample, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md transition duration-300 ease-in-out hover:shadow-lg p-6">
            <div className="flex justify-between mb-4">
              <input
                type="text"
                value={sample.name}
                onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                className="text-xl font-semibold text-indigo-700 border-b-2 border-indigo-200 focus:border-indigo-500 outline-none bg-transparent"
              />
              <div>
                <label className="mr-2 text-indigo-600">るつぼ番号:</label>
                <input
                  type="text"
                  value={sample.crucibleNumber}
                  onChange={(e) => handleInputChange(index, 'crucibleNumber', e.target.value)}
                  className="border-b-2 border-indigo-200 focus:border-indigo-500 outline-none bg-transparent"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 text-indigo-600">るつぼ重量 (g)</label>
                <input
                  type="number"
                  value={sample.crucible}
                  onChange={(e) => handleInputChange(index, 'crucible', e.target.value)}
                  className="w-full p-2 border border-indigo-200 rounded focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block mb-2 text-indigo-600">サンプル重量 (g)</label>
                <input
                  type="number"
                  value={sample.sample}
                  onChange={(e) => handleInputChange(index, 'sample', e.target.value)}
                  className="w-full p-2 border border-indigo-200 rounded focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block mb-2 text-indigo-600">灰化後重量 (g)</label>
                <input
                  type="number"
                  value={sample.ash}
                  onChange={(e) => handleInputChange(index, 'ash', e.target.value)}
                  className="w-full p-2 border border-indigo-200 rounded focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block mb-2 text-indigo-600">チャー収率 (%)</label>
                <input
                  type="text"
                  value={sample.yield !== null ? sample.yield : ''}
                  readOnly
                  className="w-full p-2 bg-indigo-50 border border-indigo-200 rounded text-indigo-700 font-semibold"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {error && <p className="text-red-500 mt-4 mb-4">{error}</p>}
      
      <div className="flex justify-between items-center mt-6 mb-8">
        <div>
          <button 
            onClick={addSample} 
            className="bg-indigo-500 text-white p-3 rounded-full hover:bg-indigo-600 transition duration-300 ease-in-out transform hover:scale-110 mr-4"
            title="サンプル追加"
          >
            <PlusCircle size={24} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
            accept=".csv,.xlsx,.xls"
          />
          <button 
            onClick={() => fileInputRef.current.click()} 
            className="bg-green-500 text-white p-3 rounded-full hover:bg-green-600 transition duration-300 ease-in-out transform hover:scale-110 mr-4"
            title="CSVインポート"
          >
            <Upload size={24} />
          </button>
          <button 
            onClick={exportToExcel} 
            className="bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 transition duration-300 ease-in-out transform hover:scale-110"
            title="Excelエクスポート"
          >
            <Download size={24} />
          </button>
        </div>
        <button 
          onClick={handleCalculate} 
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg flex items-center hover:bg-indigo-700 transition duration-300 ease-in-out transform hover:scale-105"
        >
          <Calculator size={24} className="mr-2" />
          計算
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mt-8">
        <h3 className="text-xl font-semibold text-indigo-700 mb-4">計算式</h3>
        <p className="text-indigo-600 mb-4">
          チャー収率 (%) = [(灰化後重量 - るつぼ重量) / サンプル重量] × 100
        </p>
      </div>

      <button 
        onClick={() => setShowGuide(true)} 
        className="fixed bottom-4 right-4 bg-indigo-500 text-white p-3 rounded-full hover:bg-indigo-600 transition duration-300 ease-in-out"
        title="ヘルプ"
      >
        <HelpCircle size={24} />
      </button>
    </div>
  );
};

export default CharYieldCalculator;