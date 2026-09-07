// One example sentence per word: the Chinese, its pinyin, and its English.
//
// Keyed by the Chinese headword exactly as it appears in vocab.js. That string
// is the progress key, so the join is the same one the rest of the app makes.
// A word with no entry here simply gets no example.
//
// Each entry is [Chinese, pinyin, English]. The pinyin is the sentence read
// aloud, not a gloss — it follows the same script setting as the prompt, so a
// learner who has the toggle on pinyin gets the sentence in pinyin too. The
// English translates the Chinese rather than standing alone; the three are
// shown together and have to line up.
//
// House style, so a reviewer has something to hold these to:
//   - short: four to twenty-two characters, one clause or two
//   - natural: what a person would actually say, not a dictionary illustration
//   - the sentence disambiguates the word, which is the whole point of the
//     feature: 菜 in one sentence is a dish, in another it is a vegetable
//   - simplified characters, no Latin letters, no names
//   - no 他/她 where a neutral subject will do — a sentence should not need a
//     person invented for it
//   - pinyin with tone marks, spaced by word rather than by syllable, with
//     sandhi written as it is said: 一杯 is yì bēi, 不放 is bú fàng
//
// Checked by tools/check-vocab.mjs, which aligns every sentence's pinyin
// against the readings Unicode records for its characters, one syllable per
// character — the same check the vocabulary gets. That is mechanical. Whether a
// sentence is natural is not, and these have
//
// NOT YET BEEN REVIEWED BY A NATIVE SPEAKER.

export const SENTENCES = {
  '包子': ['早上买了两个包子。', 'zǎoshang mǎi le liǎng gè bāozi', 'I bought two steamed buns this morning.'],
  '吃': ['你想吃什么？', 'nǐ xiǎng chī shénme', 'What do you want to eat?'],
  '咖啡': ['这杯咖啡太苦了。', 'zhè bēi kāfēi tài kǔ le', 'This cup of coffee is too bitter.'],
  '喝': ['睡前别喝咖啡。', 'shuì qián bié hē kāfēi', "Don't drink coffee before bed."],
  '好吃': ['这家的菜很好吃。', 'zhè jiā de cài hěn hǎochī', 'The food at this place is very tasty.'],
  '早饭': ['我每天都吃早饭。', 'wǒ měitiān dōu chī zǎofàn', 'I eat breakfast every day.'],
  '水': ['请给我一杯水。', 'qǐng gěi wǒ yì bēi shuǐ', 'Please give me a glass of water.'],
  '水果': ['饭后吃点水果吧。', 'fàn hòu chī diǎn shuǐguǒ ba', 'Have some fruit after the meal.'],
  '汤': ['先喝一碗汤。', 'xiān hē yì wǎn tāng', 'Have a bowl of soup first.'],
  '牛奶': ['牛奶放冰箱里了。', 'niúnǎi fàng bīngxiāng lǐ le', 'The milk has been put in the fridge.'],
  '盐': ['汤里的盐放多了。', 'tāng lǐ de yán fàng duō le', 'Too much salt went into the soup.'],
  '米饭': ['米饭还没煮好。', 'mǐfàn hái méi zhǔ hǎo', 'The rice is not cooked yet.'],
  '糖': ['我的咖啡不放糖。', 'wǒ de kāfēi bú fàng táng', 'I do not take sugar in my coffee.'],
  '肉': ['这个菜里没有肉。', 'zhège cài lǐ méiyǒu ròu', 'There is no meat in this dish.'],
  '茶': ['我喜欢喝热茶。', 'wǒ xǐhuan hē rè chá', 'I like drinking hot tea.'],
  '菜': ['今天的菜有点咸。', 'jīntiān de cài yǒudiǎn xián', "Today's dish is a little salty."],
  '苹果': ['苹果比香蕉便宜。', 'píngguǒ bǐ xiāngjiāo piányi', 'Apples are cheaper than bananas.'],
  '蔬菜': ['多吃蔬菜对身体好。', 'duō chī shūcài duì shēntǐ hǎo', 'Eating more vegetables is good for you.'],
  '香蕉': ['香蕉已经太熟了。', 'xiāngjiāo yǐjīng tài shú le', 'The bananas are already too ripe.'],
  '鱼': ['这条鱼很新鲜。', 'zhè tiáo yú hěn xīnxiān', 'This fish is very fresh.'],
  '鸡蛋': ['冰箱里还有三个鸡蛋。', 'bīngxiāng lǐ háiyǒu sān gè jīdàn', 'There are still three eggs in the fridge.'],
  '面包': ['早上吃了两片面包。', 'zǎoshang chī le liǎng piàn miànbāo', 'I ate two slices of bread this morning.'],
  '面条': ['中午我想吃面条。', 'zhōngwǔ wǒ xiǎng chī miàntiáo', 'I want noodles for lunch.'],
  '食物': ['这些食物不能久放。', 'zhèxiē shíwù bùnéng jiǔ fàng', 'This food cannot be kept for long.'],
  '饺子': ['过年时全家包饺子。', 'guònián shí quánjiā bāo jiǎozi', 'At New Year the whole family makes dumplings.']
};

/** The example for a word, or null. */
export function sentenceFor(zh) {
  return SENTENCES[zh] ?? null;
}
