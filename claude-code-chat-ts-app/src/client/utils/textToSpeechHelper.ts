// アルファベットをカタカナに変換するマッピング
const ALPHABET_TO_KATAKANA: Record<string, string> = {
  'A': 'エー',
  'B': 'ビー',
  'C': 'シー',
  'D': 'ディー',
  'E': 'イー',
  'F': 'エフ',
  'G': 'ジー',
  'H': 'エイチ',
  'I': 'アイ',
  'J': 'ジェー',
  'K': 'ケー',
  'L': 'エル',
  'M': 'エム',
  'N': 'エヌ',
  'O': 'オー',
  'P': 'ピー',
  'Q': 'キュー',
  'R': 'アール',
  'S': 'エス',
  'T': 'ティー',
  'U': 'ユー',
  'V': 'ブイ',
  'W': 'ダブリュー',
  'X': 'エックス',
  'Y': 'ワイ',
  'Z': 'ゼット',
};

/**
 * 大文字のアルファベットをカタカナに変換（改行区切り）
 * @param match マッチした文字列
 * @returns カタカナに変換された文字列（先頭と各文字が改行で区切られる）
 */
function convertUpperCaseToKatakana(match: string): string {
  return '\n' + match.split('').map(char => ALPHABET_TO_KATAKANA[char] || char).join('\n');
}

/**
 * テキスト内の大文字の略称をカタカナに変換
 * @param text 変換対象のテキスト
 * @returns カタカナに変換されたテキスト
 */
export function convertAbbreviationsToKatakana(text: string): string {
  // 2文字から5文字の大文字のアルファベットの連続を検出
  // 単語境界を使用して、単独の略称のみを変換
  return text.replace(/\b[A-Z]{2,5}\b/g, convertUpperCaseToKatakana);
}