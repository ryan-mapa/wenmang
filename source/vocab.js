// Word decks. Simplified characters, Mandarin, with US English glosses.
//
// The `zh` string is the progress key, so it is a stable identifier before it
// is a display string: never rewrite one that has shipped, or you silently
// orphan every card anyone has built on it. Add a new entry and retire the old
// one instead.
//
// Pinyin carries tone marks rather than tone numbers. It is shown to the
// learner, and `ni3 hao3` is not something anybody reads aloud.
//
// A word that appears in two decks — 鱼 is both food and an animal — is one
// card, met in two places. Both entries must then gloss it identically, or the
// same card teaches two different answers depending on where you met it.
//
// Each deck has three stages of increasing difficulty. Only Basics is authored
// so far; Everyday and Fluent are declared empty rather than absent so the
// stage machinery has the shape it expects, and so the gap is visible here
// rather than discovered at runtime.

export const STAGE_NAMES = ['Basics', 'Everyday', 'Fluent'];
export const STAGE_COUNT = STAGE_NAMES.length;
export const ALL_DECK_ID = 'quanbu';

export const DECKS = [
  {
    id: 'shiwu',
    name: 'Food',
    emoji: '🍜',
    stages: [
      [
        { zh: '苹果', py: 'píngguǒ', en: 'apple' },
        { zh: '面包', py: 'miànbāo', en: 'bread' },
        { zh: '牛奶', py: 'niúnǎi', en: 'milk' },
        { zh: '鸡蛋', py: 'jīdàn', en: 'egg' },
        { zh: '米饭', py: 'mǐfàn', en: 'cooked rice' },
        { zh: '草莓', py: 'cǎoméi', en: 'strawberry' },
        { zh: '橙子', py: 'chéngzi', en: 'orange' },
        { zh: '鱼', py: 'yú', en: 'fish' },
        { zh: '盐', py: 'yán', en: 'salt' },
        { zh: '糖', py: 'táng', en: 'sugar' },
        { zh: '洋葱', py: 'yángcōng', en: 'onion' },
        { zh: '大蒜', py: 'dàsuàn', en: 'garlic' },
        { zh: '西瓜', py: 'xīguā', en: 'watermelon' },
        { zh: '香蕉', py: 'xiāngjiāo', en: 'banana' },
        { zh: '葡萄', py: 'pútáo', en: 'grape' },
        { zh: '西红柿', py: 'xīhóngshì', en: 'tomato' },
        { zh: '土豆', py: 'tǔdòu', en: 'potato' },
        { zh: '胡萝卜', py: 'húluóbo', en: 'carrot' },
        { zh: '玉米', py: 'yùmǐ', en: 'corn' },
        { zh: '黄油', py: 'huángyóu', en: 'butter' },
        { zh: '水', py: 'shuǐ', en: 'water' },
        { zh: '咖啡', py: 'kāfēi', en: 'coffee' },
        { zh: '茶', py: 'chá', en: 'tea' },
        { zh: '酸奶', py: 'suānnǎi', en: 'yogurt' },
        { zh: '食物', py: 'shíwù', en: 'food' },
        { zh: '水果', py: 'shuǐguǒ', en: 'fruit' },
        { zh: '蔬菜', py: 'shūcài', en: 'vegetable' },
        { zh: '芒果', py: 'mángguǒ', en: 'mango' },
        { zh: '菠萝', py: 'bōluó', en: 'pineapple' },
        { zh: '桃子', py: 'táozi', en: 'peach' },
        { zh: '肉', py: 'ròu', en: 'meat' },
        { zh: '汤', py: 'tāng', en: 'soup' },
        { zh: '面条', py: 'miàntiáo', en: 'noodles' },
        { zh: '饺子', py: 'jiǎozi', en: 'dumpling' },
        { zh: '包子', py: 'bāozi', en: 'steamed bun' },
        { zh: '早饭', py: 'zǎofàn', en: 'breakfast' },
        { zh: '午饭', py: 'wǔfàn', en: 'lunch' },
        { zh: '晚饭', py: 'wǎnfàn', en: 'dinner' },
        { zh: '好吃', py: 'hǎochī', en: 'tasty' },
        { zh: '吃', py: 'chī', en: 'to eat' }
      ],
      [],
      []
    ]
  },
  {
    id: 'dongwu',
    name: 'Animals',
    emoji: '🐼',
    stages: [
      [
        { zh: '狗', py: 'gǒu', en: 'dog' },
        { zh: '猫', py: 'māo', en: 'cat' },
        { zh: '鸟', py: 'niǎo', en: 'bird' },
        { zh: '马', py: 'mǎ', en: 'horse' },
        { zh: '牛', py: 'niú', en: 'cow' },
        { zh: '猪', py: 'zhū', en: 'pig' },
        { zh: '羊', py: 'yáng', en: 'sheep' },
        { zh: '鸡', py: 'jī', en: 'chicken' },
        { zh: '鸭', py: 'yā', en: 'duck' },
        { zh: '鱼', py: 'yú', en: 'fish' },
        { zh: '老虎', py: 'lǎohǔ', en: 'tiger' },
        { zh: '狮子', py: 'shīzi', en: 'lion' },
        { zh: '熊', py: 'xióng', en: 'bear' },
        { zh: '猴子', py: 'hóuzi', en: 'monkey' },
        { zh: '大象', py: 'dàxiàng', en: 'elephant' },
        { zh: '兔子', py: 'tùzi', en: 'rabbit' },
        { zh: '老鼠', py: 'lǎoshǔ', en: 'mouse' },
        { zh: '蛇', py: 'shé', en: 'snake' },
        { zh: '龙', py: 'lóng', en: 'dragon' },
        { zh: '熊猫', py: 'xióngmāo', en: 'panda' },
        { zh: '动物', py: 'dòngwù', en: 'animal' },
        { zh: '蜜蜂', py: 'mìfēng', en: 'bee' },
        { zh: '蝴蝶', py: 'húdié', en: 'butterfly' },
        { zh: '青蛙', py: 'qīngwā', en: 'frog' },
        { zh: '乌龟', py: 'wūguī', en: 'turtle' },
        { zh: '狼', py: 'láng', en: 'wolf' },
        { zh: '狐狸', py: 'húli', en: 'fox' },
        { zh: '鹿', py: 'lù', en: 'deer' },
        { zh: '鲸鱼', py: 'jīngyú', en: 'whale' },
        { zh: '鲨鱼', py: 'shāyú', en: 'shark' },
        { zh: '螃蟹', py: 'pángxiè', en: 'crab' },
        { zh: '虾', py: 'xiā', en: 'shrimp' },
        { zh: '蚂蚁', py: 'mǎyǐ', en: 'ant' },
        { zh: '蜘蛛', py: 'zhīzhū', en: 'spider' },
        { zh: '鸽子', py: 'gēzi', en: 'pigeon' },
        { zh: '鹅', py: 'é', en: 'goose' },
        { zh: '猫头鹰', py: 'māotóuyīng', en: 'owl' },
        { zh: '尾巴', py: 'wěiba', en: 'tail' },
        { zh: '翅膀', py: 'chìbǎng', en: 'wing' },
        { zh: '宠物', py: 'chǒngwù', en: 'pet' }
      ],
      [],
      []
    ]
  },
  {
    id: 'shuzi',
    name: 'Numbers & Money',
    emoji: '💴',
    stages: [
      [
        { zh: '一', py: 'yī', en: 'one' },
        { zh: '二', py: 'èr', en: 'two' },
        { zh: '三', py: 'sān', en: 'three' },
        { zh: '四', py: 'sì', en: 'four' },
        { zh: '五', py: 'wǔ', en: 'five' },
        { zh: '六', py: 'liù', en: 'six' },
        { zh: '七', py: 'qī', en: 'seven' },
        { zh: '八', py: 'bā', en: 'eight' },
        { zh: '九', py: 'jiǔ', en: 'nine' },
        { zh: '十', py: 'shí', en: 'ten' },
        { zh: '零', py: 'líng', en: 'zero' },
        { zh: '百', py: 'bǎi', en: 'hundred' },
        { zh: '千', py: 'qiān', en: 'thousand' },
        { zh: '万', py: 'wàn', en: 'ten thousand' },
        { zh: '钱', py: 'qián', en: 'money' },
        { zh: '块', py: 'kuài', en: 'yuan (spoken)' },
        { zh: '元', py: 'yuán', en: 'yuan (written)' },
        { zh: '贵', py: 'guì', en: 'expensive' },
        { zh: '便宜', py: 'piányi', en: 'cheap' },
        { zh: '买', py: 'mǎi', en: 'to buy' },
        { zh: '卖', py: 'mài', en: 'to sell' },
        { zh: '价格', py: 'jiàgé', en: 'price' },
        { zh: '多少', py: 'duōshao', en: 'how much' },
        { zh: '几', py: 'jǐ', en: 'how many' },
        { zh: '半', py: 'bàn', en: 'half' },
        { zh: '双', py: 'shuāng', en: 'a pair' },
        { zh: '第一', py: 'dìyī', en: 'first' },
        { zh: '免费', py: 'miǎnfèi', en: 'free of charge' },
        { zh: '银行', py: 'yínháng', en: 'bank' },
        { zh: '现金', py: 'xiànjīn', en: 'cash' },
        { zh: '信用卡', py: 'xìnyòngkǎ', en: 'credit card' },
        { zh: '付', py: 'fù', en: 'to pay' },
        { zh: '找钱', py: 'zhǎoqián', en: 'to give change' },
        { zh: '发票', py: 'fāpiào', en: 'receipt' },
        { zh: '账单', py: 'zhàngdān', en: 'the bill' },
        { zh: '数字', py: 'shùzì', en: 'number' },
        { zh: '一共', py: 'yígòng', en: 'altogether' },
        { zh: '两', py: 'liǎng', en: 'two (counting)' },
        { zh: '个', py: 'gè', en: 'general measure word' },
        { zh: '多', py: 'duō', en: 'many' }
      ],
      [],
      []
    ]
  },
  {
    id: 'jiaren',
    name: 'Family & People',
    emoji: '👪',
    stages: [
      [
        { zh: '妈妈', py: 'māma', en: 'mom' },
        { zh: '爸爸', py: 'bàba', en: 'dad' },
        { zh: '儿子', py: 'érzi', en: 'son' },
        { zh: '女儿', py: 'nǚér', en: 'daughter' },
        { zh: '哥哥', py: 'gēge', en: 'older brother' },
        { zh: '弟弟', py: 'dìdi', en: 'younger brother' },
        { zh: '姐姐', py: 'jiějie', en: 'older sister' },
        { zh: '妹妹', py: 'mèimei', en: 'younger sister' },
        { zh: '爷爷', py: 'yéye', en: "father's father" },
        { zh: '奶奶', py: 'nǎinai', en: "father's mother" },
        { zh: '外公', py: 'wàigōng', en: "mother's father" },
        { zh: '外婆', py: 'wàipó', en: "mother's mother" },
        { zh: '家', py: 'jiā', en: 'home' },
        { zh: '人', py: 'rén', en: 'person' },
        { zh: '男人', py: 'nánrén', en: 'man' },
        { zh: '女人', py: 'nǚrén', en: 'woman' },
        { zh: '孩子', py: 'háizi', en: 'child' },
        { zh: '朋友', py: 'péngyou', en: 'friend' },
        { zh: '老师', py: 'lǎoshī', en: 'teacher' },
        { zh: '学生', py: 'xuésheng', en: 'student' },
        { zh: '医生', py: 'yīshēng', en: 'doctor' },
        { zh: '名字', py: 'míngzi', en: 'name' },
        { zh: '丈夫', py: 'zhàngfu', en: 'husband' },
        { zh: '妻子', py: 'qīzi', en: 'wife' },
        { zh: '叔叔', py: 'shūshu', en: 'uncle' },
        { zh: '阿姨', py: 'āyí', en: 'aunt' },
        { zh: '邻居', py: 'línjū', en: 'neighbor' },
        { zh: '同事', py: 'tóngshì', en: 'colleague' },
        { zh: '大家', py: 'dàjiā', en: 'everyone' },
        { zh: '自己', py: 'zìjǐ', en: 'oneself' },
        { zh: '我', py: 'wǒ', en: 'I' },
        { zh: '你', py: 'nǐ', en: 'you' },
        { zh: '他', py: 'tā', en: 'he' },
        { zh: '她', py: 'tā', en: 'she' },
        { zh: '我们', py: 'wǒmen', en: 'we' },
        { zh: '先生', py: 'xiānsheng', en: 'mister' },
        { zh: '女士', py: 'nǚshì', en: 'madam' },
        { zh: '年轻', py: 'niánqīng', en: 'young' },
        { zh: '老', py: 'lǎo', en: 'old' },
        { zh: '认识', py: 'rènshi', en: 'to know someone' }
      ],
      [],
      []
    ]
  }
];

/** The progress key for a word. One function so nothing hardcodes the field. */
export function wordId(word) {
  return word.zh;
}

export function getDeck(deckId) {
  return DECKS.find((deck) => deck.id === deckId) ?? null;
}

export function stageWords(deckId, stage) {
  if (deckId === ALL_DECK_ID) return DECKS.flatMap((deck) => deck.stages[stage] ?? []);
  return getDeck(deckId)?.stages[stage] ?? [];
}

export function deckWords(deckId) {
  return Array.from({ length: STAGE_COUNT }, (_, stage) => stageWords(deckId, stage)).flat();
}

/** Every distinct word in the app, deduped by key across decks. */
export function allWords() {
  const seen = new Map();
  for (const deck of DECKS) {
    for (const word of deck.stages.flat()) {
      if (!seen.has(word.zh)) seen.set(word.zh, word);
    }
  }
  return [...seen.values()];
}

/** The word record for a key, or null. */
export function findWord(zh) {
  return allWords().find((word) => word.zh === zh) ?? null;
}
