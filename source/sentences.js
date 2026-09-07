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
//   - short: 4 to 22 characters, one clause or two
//   - natural: what a person would actually say, not a dictionary illustration
//   - the sentence disambiguates the word, which is the whole point of the
//     feature: 菜 in one sentence is a dish, in another it is a vegetable
//   - simplified characters, no Latin letters, no names
//   - no 他/她 where a neutral subject will do — a sentence should not need a
//     person invented for it
//   - pinyin with tone marks, spaced by word rather than by syllable, with
//     sandhi written as it is said: 一杯 is yì bēi, 不放 is bú fàng
//
// Written a deck at a time through tools/add-sentences.mjs, which rejects a
// batch whole rather than merging half of it, and checked by
// tools/check-vocab.mjs, which aligns every sentence's pinyin against the
// readings Unicode records for its characters. That is all mechanical. Whether
// a sentence is natural is not, and these have
//
// NOT YET BEEN REVIEWED BY A NATIVE SPEAKER.

export const SENTENCES = {
  '包子': ["早上买了两个包子。", "zǎoshang mǎi le liǎng gè bāozi", "I bought two steamed buns this morning."],
  '午饭': ["我们中午一起吃午饭。", "wǒmen zhōngwǔ yìqǐ chī wǔfàn", "We eat lunch together at noon."],
  '吃': ["你想吃什么？", "nǐ xiǎng chī shénme", "What do you want to eat?"],
  '味道': ["这道菜味道很好。", "zhè dào cài wèidào hěn hǎo", "This dish tastes very good."],
  '咖啡': ["这杯咖啡太苦了。", "zhè bēi kāfēi tài kǔ le", "This cup of coffee is too bitter."],
  '咸': ["汤有点咸了。", "tāng yǒudiǎn xián le", "The soup has come out a bit salty."],
  '喝': ["睡前别喝咖啡。", "shuì qián bié hē kāfēi", "Don't drink coffee before bed."],
  '土豆': ["土豆放久了会发芽。", "tǔdòu fàng jiǔ le huì fāyá", "Potatoes sprout if kept too long."],
  '大蒜': ["这道菜放了很多大蒜。", "zhè dào cài fàng le hěn duō dàsuàn", "This dish has a lot of garlic in it."],
  '好吃': ["这家的菜很好吃。", "zhè jiā de cài hěn hǎochī", "The food at this place is very tasty."],
  '尝': ["你尝尝这个汤。", "nǐ chángchang zhège tāng", "Have a taste of this soup."],
  '巧克力': ["这块巧克力有点苦。", "zhè kuài qiǎokèlì yǒudiǎn kǔ", "This chocolate is a little bitter."],
  '新鲜': ["早市的菜最新鲜。", "zǎoshì de cài zuì xīnxiān", "Vegetables at the morning market are freshest."],
  '早饭': ["我每天都吃早饭。", "wǒ měitiān dōu chī zǎofàn", "I eat breakfast every day."],
  '晚饭': ["晚饭已经准备好了。", "wǎnfàn yǐjīng zhǔnbèi hǎo le", "Dinner is already ready."],
  '桃子': ["桃子熟了就很软。", "táozi shú le jiù hěn ruǎn", "Peaches go soft once ripe."],
  '橙子': ["我剥了一个橙子。", "wǒ bāo le yí gè chéngzi", "I peeled an orange."],
  '水': ["请给我一杯水。", "qǐng gěi wǒ yì bēi shuǐ", "Please give me a glass of water."],
  '水果': ["饭后吃点水果吧。", "fàn hòu chī diǎn shuǐguǒ ba", "Have some fruit after the meal."],
  '汤': ["先喝一碗汤。", "xiān hē yì wǎn tāng", "Have a bowl of soup first."],
  '洋葱': ["切洋葱的时候会流泪。", "qiē yángcōng de shíhou huì liúlèi", "Cutting onions makes your eyes water."],
  '海鲜': ["海边的海鲜很便宜。", "hǎibiān de hǎixiān hěn piányi", "Seafood is cheap by the sea."],
  '渴': ["天热容易口渴。", "tiān rè róngyì kǒukě", "You get thirsty easily in hot weather."],
  '炒': ["我炒了一盘青菜。", "wǒ chǎo le yì pán qīngcài", "I stir-fried a plate of greens."],
  '点心': ["下午茶配了几样点心。", "xiàwǔchá pèi le jǐ yàng diǎnxin", "The afternoon tea came with a few snacks."],
  '烤': ["烤了一只鸡当晚饭。", "kǎo le yì zhī jī dāng wǎnfàn", "Roasted a chicken for dinner."],
  '煎': ["早上煎了两个鸡蛋。", "zǎoshang jiān le liǎng gè jīdàn", "Fried two eggs this morning."],
  '煮': ["鸡蛋煮了十分钟。", "jīdàn zhǔ le shí fēnzhōng", "The eggs boiled for ten minutes."],
  '牛奶': ["牛奶放冰箱里了。", "niúnǎi fàng bīngxiāng lǐ le", "The milk has been put in the fridge."],
  '牛肉': ["牛肉比鸡肉贵一些。", "niúròu bǐ jīròu guì yìxiē", "Beef is a bit dearer than chicken."],
  '猪肉': ["饺子馅是猪肉的。", "jiǎozi xiàn shì zhūròu de", "The dumpling filling is pork."],
  '玉米': ["夏天的玉米特别甜。", "xiàtiān de yùmǐ tèbié tián", "Summer corn is especially sweet."],
  '甜': ["这杯茶不太甜。", "zhè bēi chá bú tài tián", "This cup of tea is not very sweet."],
  '盐': ["汤里的盐放多了。", "tāng lǐ de yán fàng duō le", "Too much salt went into the soup."],
  '米': ["家里的米快吃完了。", "jiā lǐ de mǐ kuài chī wán le", "We are almost out of rice at home."],
  '米饭': ["米饭还没煮好。", "mǐfàn hái méi zhǔ hǎo", "The rice is not cooked yet."],
  '粥': ["生病时喝点粥比较好。", "shēngbìng shí hē diǎn zhōu bǐjiào hǎo", "Porridge is better when you are ill."],
  '糖': ["我的咖啡不放糖。", "wǒ de kāfēi bú fàng táng", "I do not take sugar in my coffee."],
  '素食': ["我最近改吃素食。", "wǒ zuìjìn gǎi chī sùshí", "I have switched to vegetarian food lately."],
  '肉': ["这个菜里没有肉。", "zhège cài lǐ méiyǒu ròu", "There is no meat in this dish."],
  '胡萝卜': ["兔子最爱吃胡萝卜。", "tùzi zuì ài chī húluóbo", "Rabbits love carrots best."],
  '芒果': ["我对芒果过敏。", "wǒ duì mángguǒ guòmǐn", "I am allergic to mango."],
  '苦': ["这药很苦。", "zhè yào hěn kǔ", "This medicine is very bitter."],
  '苹果': ["苹果比香蕉便宜。", "píngguǒ bǐ xiāngjiāo piányi", "Apples are cheaper than bananas."],
  '茶': ["我喜欢喝热茶。", "wǒ xǐhuan hē rè chá", "I like drinking hot tea."],
  '草莓': ["这些草莓又大又甜。", "zhèxiē cǎoméi yòu dà yòu tián", "These strawberries are big and sweet."],
  '菜': ["今天的菜有点咸。", "jīntiān de cài yǒudiǎn xián", "Today's dish is a little salty."],
  '菠萝': ["菠萝要削皮才能吃。", "bōluó yào xiāo pí cái néng chī", "Pineapple has to be peeled before eating."],
  '营养': ["早饭要有营养。", "zǎofàn yào yǒu yíngyǎng", "Breakfast should be nutritious."],
  '葡萄': ["这串葡萄有点酸。", "zhè chuàn pútáo yǒudiǎn suān", "This bunch of grapes is a little sour."],
  '蒸': ["这鱼是蒸出来的。", "zhè yú shì zhēng chūlái de", "This fish was steamed."],
  '蔬菜': ["多吃蔬菜对身体好。", "duō chī shūcài duì shēntǐ hǎo", "Eating more vegetables is good for you."],
  '西瓜': ["夏天最适合吃西瓜。", "xiàtiān zuì shìhé chī xīguā", "Summer is the best time for watermelon."],
  '西红柿': ["汤里放两个西红柿。", "tāng lǐ fàng liǎng gè xīhóngshì", "Put two tomatoes in the soup."],
  '调料': ["别放太多调料。", "bié fàng tài duō tiáoliào", "Do not add too much seasoning."],
  '豆腐': ["麻婆豆腐是川菜。", "mápó dòufu shì chuāncài", "Mapo tofu is a Sichuan dish."],
  '辣': ["这个菜太辣了。", "zhège cài tài là le", "This dish is too spicy."],
  '辣椒': ["这种辣椒特别辣。", "zhè zhǒng làjiāo tèbié là", "This kind of chili is especially hot."],
  '酱油': ["炒菜时加点酱油。", "chǎocài shí jiā diǎn jiàngyóu", "Add a little soy sauce when stir-frying."],
  '酸': ["柠檬又酸又香。", "níngméng yòu suān yòu xiāng", "Lemons are sour and fragrant."],
  '酸奶': ["我早上喝一杯酸奶。", "wǒ zǎoshang hē yì bēi suānnǎi", "I have a cup of yogurt in the morning."],
  '醋': ["饺子要蘸醋吃。", "jiǎozi yào zhàn cù chī", "Dumplings are eaten dipped in vinegar."],
  '面包': ["早上吃了两片面包。", "zǎoshang chī le liǎng piàn miànbāo", "I ate two slices of bread this morning."],
  '面条': ["中午我想吃面条。", "zhōngwǔ wǒ xiǎng chī miàntiáo", "I want noodles for lunch."],
  '食物': ["这些食物不能久放。", "zhèxiē shíwù bùnéng jiǔ fàng", "This food cannot be kept for long."],
  '食谱': ["这本食谱很实用。", "zhè běn shípǔ hěn shíyòng", "This recipe book is very practical."],
  '饱': ["我已经吃饱了。", "wǒ yǐjīng chī bǎo le", "I am already full."],
  '饺子': ["过年时全家包饺子。", "guònián shí quánjiā bāo jiǎozi", "At New Year the whole family makes dumplings."],
  '饼干': ["孩子把饼干都吃完了。", "háizi bǎ bǐnggān dōu chī wán le", "The child ate all the biscuits."],
  '饿': ["走了一天很饿。", "zǒu le yì tiān hěn è", "Walked all day and I am hungry."],
  '香蕉': ["香蕉已经太熟了。", "xiāngjiāo yǐjīng tài shú le", "The bananas are already too ripe."],
  '鱼': ["这条鱼很新鲜。", "zhè tiáo yú hěn xīnxiān", "This fish is very fresh."],
  '鸡肉': ["这块鸡肉还没熟。", "zhè kuài jīròu hái méi shú", "This piece of chicken is not cooked yet."],
  '鸡蛋': ["冰箱里还有三个鸡蛋。", "bīngxiāng lǐ háiyǒu sān gè jīdàn", "There are still three eggs in the fridge."],
  '黄油': ["面包上抹点黄油。", "miànbāo shàng mǒ diǎn huángyóu", "Spread a little butter on the bread."]
};

/** The example for a word, or null. */
export function sentenceFor(zh) {
  return SENTENCES[zh] ?? null;
}
