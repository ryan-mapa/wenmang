// One example sentence per word, with its English translation.
//
// Keyed by the Chinese headword exactly as it appears in vocab.js. That string
// is the progress key, so the join is the same one the rest of the app makes.
// A word with no entry here simply gets no example.
//
// Each pair is [Chinese, English]. The English translates the Chinese sentence
// rather than standing alone — the two are shown together, so they have to line
// up.
//
// House style, so a reviewer has something to hold these to:
//   - short: four to twenty-two characters, one clause or two
//   - natural: what a person would actually say, not a dictionary illustration
//   - the sentence disambiguates the word, which is the whole point of the
//     feature: 菜 in one sentence is a dish, in another it is a vegetable
//   - simplified characters, no pinyin, no Latin letters, no names
//   - no 他/她 where a neutral subject will do — a sentence should not need a
//     person invented for it
//
// Checked by tools/sentences.mjs --check: every sentence contains its headword,
// is the right length, and carries no Latin letters. That is mechanical.
// Whether a sentence is natural is not, and these have
//
// NOT YET BEEN REVIEWED BY A NATIVE SPEAKER.

export const SENTENCES = {
  '包子': ['早上买了两个包子。', 'I bought two steamed buns this morning.'],
  '吃': ['你想吃什么？', 'What do you want to eat?'],
  '咖啡': ['这杯咖啡太苦了。', 'This cup of coffee is too bitter.'],
  '喝': ['睡前别喝咖啡。', "Don't drink coffee before bed."],
  '好吃': ['这家的菜很好吃。', 'The food at this place is very tasty.'],
  '早饭': ['我每天都吃早饭。', 'I eat breakfast every day.'],
  '水': ['请给我一杯水。', 'Please give me a glass of water.'],
  '水果': ['饭后吃点水果吧。', 'Have some fruit after the meal.'],
  '汤': ['先喝一碗汤。', 'Have a bowl of soup first.'],
  '牛奶': ['牛奶放冰箱里了。', 'The milk has been put in the fridge.'],
  '盐': ['汤里的盐放多了。', 'Too much salt went into the soup.'],
  '米饭': ['米饭还没煮好。', 'The rice is not cooked yet.'],
  '糖': ['我的咖啡不放糖。', 'I do not take sugar in my coffee.'],
  '肉': ['这个菜里没有肉。', 'There is no meat in this dish.'],
  '茶': ['我喜欢喝热茶。', 'I like drinking hot tea.'],
  '菜': ['今天的菜有点咸。', "Today's dish is a little salty."],
  '苹果': ['苹果比香蕉便宜。', 'Apples are cheaper than bananas.'],
  '蔬菜': ['多吃蔬菜对身体好。', 'Eating more vegetables is good for you.'],
  '香蕉': ['香蕉已经太熟了。', 'The bananas are already too ripe.'],
  '鱼': ['这条鱼很新鲜。', 'This fish is very fresh.'],
  '鸡蛋': ['冰箱里还有三个鸡蛋。', 'There are still three eggs in the fridge.'],
  '面包': ['早上吃了两片面包。', 'I ate two slices of bread this morning.'],
  '面条': ['中午我想吃面条。', 'I want noodles for lunch.'],
  '食物': ['这些食物不能久放。', 'This food cannot be kept for long.'],
  '饺子': ['过年时全家包饺子。', 'At New Year the whole family makes dumplings.']
};

/** The example for a word, or null. */
export function sentenceFor(zh) {
  return SENTENCES[zh] ?? null;
}
