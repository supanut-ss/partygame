const THAI_DIGITS = {
  '๐': '0',
  '๑': '1',
  '๒': '2',
  '๓': '3',
  '๔': '4',
  '๕': '5',
  '๖': '6',
  '๗': '7',
  '๘': '8',
  '๙': '9',
};

const THAI_UNITS = {
  ศูนย์: 0,
  หนึ่ง: 1,
  เอ็ด: 1,
  สอง: 2,
  สาม: 3,
  สี่: 4,
  ห้า: 5,
  หก: 6,
  เจ็ด: 7,
  แปด: 8,
  เก้า: 9,
};

const NUMBER_PHRASES = [
  'ฉันขอทายว่า',
  'ขอทายว่า',
  'ทายว่า',
  'ตัวเลข',
  'เลขที่',
  'เลข',
  'คือ',
  'เป็น',
  'นะครับ',
  'นะคะ',
  'ครับ',
  'ค่ะ',
  'คะ',
];

function normalizeNumberText(value) {
  return String(value ?? '')
    .replace(/[๐-๙]/g, (digit) => THAI_DIGITS[digit])
    .replace(/[\s,，。!?ฯๆ]/g, '')
    .toLowerCase();
}

function parseBelowOneHundred(value) {
  if (!value) return null;
  if (Object.hasOwn(THAI_UNITS, value)) return THAI_UNITS[value];

  const tenIndex = value.indexOf('สิบ');
  if (tenIndex < 0 || value.indexOf('สิบ', tenIndex + 1) >= 0) return null;

  const tensWord = value.slice(0, tenIndex);
  const onesWord = value.slice(tenIndex + 'สิบ'.length);
  const tens = tensWord === '' ? 1 : tensWord === 'ยี่' ? 2 : THAI_UNITS[tensWord];
  const ones = onesWord === '' ? 0 : THAI_UNITS[onesWord];

  if (!Number.isInteger(tens) || tens < 1 || tens > 9 || !Number.isInteger(ones)) {
    return null;
  }

  return tens * 10 + ones;
}

function parseThaiNumber(value) {
  if (value === 'ร้อย') return 100;

  const hundredIndex = value.indexOf('ร้อย');
  if (hundredIndex < 0) return parseBelowOneHundred(value);
  if (value.indexOf('ร้อย', hundredIndex + 1) >= 0) return null;

  const hundredsWord = value.slice(0, hundredIndex);
  const remainderWord = value.slice(hundredIndex + 'ร้อย'.length);
  const hundreds = hundredsWord === '' ? 1 : parseBelowOneHundred(hundredsWord);
  const remainder = remainderWord === '' ? 0 : parseBelowOneHundred(remainderWord);

  if (!Number.isInteger(hundreds) || hundreds < 1 || !Number.isInteger(remainder)) {
    return null;
  }

  return hundreds * 100 + remainder;
}

export function parseGuessValue(value) {
  const normalized = normalizeNumberText(value);
  const digitMatches = normalized.match(/\d+/g);

  if (digitMatches) {
    if (digitMatches.length !== 1) return null;
    return Number(digitMatches[0]);
  }

  const thaiNumber = NUMBER_PHRASES.reduce(
    (text, phrase) => text.replaceAll(phrase, ''),
    normalized,
  );

  return parseThaiNumber(thaiNumber);
}

export function createSecretNumber() {
  return Math.floor(Math.random() * 100) + 1;
}
