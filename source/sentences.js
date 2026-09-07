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
  '乌龟': ["乌龟走得很慢。", "wūguī zǒu de hěn màn", "Turtles walk very slowly."],
  '保护': ["我们要保护野生动物。", "wǒmen yào bǎohù yěshēng dòngwù", "We should protect wild animals."],
  '兔子': ["兔子跑得很快。", "tùzi pǎo de hěn kuài", "Rabbits run fast."],
  '兽医': ["我带猫去看兽医。", "wǒ dài māo qù kàn shòuyī", "I took the cat to see the vet."],
  '动物': ["动物园里有很多动物。", "dòngwùyuán lǐ yǒu hěn duō dòngwù", "There are many animals in the zoo."],
  '动物园': ["周末我们去动物园。", "zhōumò wǒmen qù dòngwùyuán", "We are going to the zoo at the weekend."],
  '包子': ["早上买了两个包子。", "zǎoshang mǎi le liǎng gè bāozi", "I bought two steamed buns this morning."],
  '午饭': ["我们中午一起吃午饭。", "wǒmen zhōngwǔ yìqǐ chī wǔfàn", "We eat lunch together at noon."],
  '吃': ["你想吃什么？", "nǐ xiǎng chī shénme", "What do you want to eat?"],
  '味道': ["这道菜味道很好。", "zhè dào cài wèidào hěn hǎo", "This dish tastes very good."],
  '咖啡': ["这杯咖啡太苦了。", "zhè bēi kāfēi tài kǔ le", "This cup of coffee is too bitter."],
  '咬': ["那只狗不咬人。", "nà zhī gǒu bù yǎo rén", "That dog does not bite."],
  '咸': ["汤有点咸了。", "tāng yǒudiǎn xián le", "The soup has come out a bit salty."],
  '哺乳动物': ["鲸鱼是哺乳动物。", "jīngyú shì bǔrǔdòngwù", "The whale is a mammal."],
  '喂': ["别喂动物园的动物。", "bié wèi dòngwùyuán de dòngwù", "Do not feed the animals at the zoo."],
  '喝': ["睡前别喝咖啡。", "shuì qián bié hē kāfēi", "Don't drink coffee before bed."],
  '土豆': ["土豆放久了会发芽。", "tǔdòu fàng jiǔ le huì fāyá", "Potatoes sprout if kept too long."],
  '大蒜': ["这道菜放了很多大蒜。", "zhè dào cài fàng le hěn duō dàsuàn", "This dish has a lot of garlic in it."],
  '大象': ["大象的鼻子很长。", "dàxiàng de bízi hěn cháng", "An elephant's trunk is very long."],
  '好吃': ["这家的菜很好吃。", "zhè jiā de cài hěn hǎochī", "The food at this place is very tasty."],
  '孵化': ["鸡蛋还没孵化。", "jīdàn hái méi fūhuà", "The eggs have not hatched yet."],
  '宠物': ["我家养了两只宠物。", "wǒ jiā yǎng le liǎng zhī chǒngwù", "We keep two pets at home."],
  '小鸡': ["小鸡跟着母鸡走。", "xiǎojī gēn zhe mǔjī zǒu", "The chicks follow the hen."],
  '尝': ["你尝尝这个汤。", "nǐ chángchang zhège tāng", "Have a taste of this soup."],
  '尾巴': ["那只猫的尾巴很长。", "nà zhī māo de wěiba hěn cháng", "That cat's tail is very long."],
  '巢': ["树上有个鸟巢。", "shù shàng yǒu gè niǎocháo", "There is a bird's nest in the tree."],
  '巧克力': ["这块巧克力有点苦。", "zhè kuài qiǎokèlì yǒudiǎn kǔ", "This chocolate is a little bitter."],
  '幼崽': ["母狮在照看幼崽。", "mǔshī zài zhàokàn yòuzǎi", "The lioness is looking after her cubs."],
  '斑马': ["斑马身上有黑白条纹。", "bānmǎ shēnshàng yǒu hēibái tiáowén", "Zebras have black and white stripes."],
  '新鲜': ["早市的菜最新鲜。", "zǎoshì de cài zuì xīnxiān", "Vegetables at the morning market are freshest."],
  '早饭': ["我每天都吃早饭。", "wǒ měitiān dōu chī zǎofàn", "I eat breakfast every day."],
  '昆虫': ["这本书讲各种昆虫。", "zhè běn shū jiǎng gèzhǒng kūnchóng", "This book is about various insects."],
  '晚饭': ["晚饭已经准备好了。", "wǎnfàn yǐjīng zhǔnbèi hǎo le", "Dinner is already ready."],
  '桃子': ["桃子熟了就很软。", "táozi shú le jiù hěn ruǎn", "Peaches go soft once ripe."],
  '橙子': ["我剥了一个橙子。", "wǒ bāo le yí gè chéngzi", "I peeled an orange."],
  '毛': ["这只猫的毛很软。", "zhè zhī māo de máo hěn ruǎn", "This cat's fur is very soft."],
  '水': ["请给我一杯水。", "qǐng gěi wǒ yì bēi shuǐ", "Please give me a glass of water."],
  '水果': ["饭后吃点水果吧。", "fàn hòu chī diǎn shuǐguǒ ba", "Have some fruit after the meal."],
  '汤': ["先喝一碗汤。", "xiān hē yì wǎn tāng", "Have a bowl of soup first."],
  '洋葱': ["切洋葱的时候会流泪。", "qiē yángcōng de shíhou huì liúlèi", "Cutting onions makes your eyes water."],
  '洞': ["兔子躲进洞里了。", "tùzi duǒ jìn dòng lǐ le", "The rabbit hid in its burrow."],
  '海豚': ["海豚很喜欢跟人玩。", "hǎitún hěn xǐhuan gēn rén wán", "Dolphins love playing with people."],
  '海鲜': ["海边的海鲜很便宜。", "hǎibiān de hǎixiān hěn piányi", "Seafood is cheap by the sea."],
  '渴': ["天热容易口渴。", "tiān rè róngyì kǒukě", "You get thirsty easily in hot weather."],
  '灭绝': ["很多动物已经灭绝了。", "hěn duō dòngwù yǐjīng mièjué le", "Many animals have already gone extinct."],
  '炒': ["我炒了一盘青菜。", "wǒ chǎo le yì pán qīngcài", "I stir-fried a plate of greens."],
  '点心': ["下午茶配了几样点心。", "xiàwǔchá pèi le jǐ yàng diǎnxin", "The afternoon tea came with a few snacks."],
  '烤': ["烤了一只鸡当晚饭。", "kǎo le yì zhī jī dāng wǎnfàn", "Roasted a chicken for dinner."],
  '煎': ["早上煎了两个鸡蛋。", "zǎoshang jiān le liǎng gè jīdàn", "Fried two eggs this morning."],
  '煮': ["鸡蛋煮了十分钟。", "jīdàn zhǔ le shí fēnzhōng", "The eggs boiled for ten minutes."],
  '熊': ["冬天熊要睡很久。", "dōngtiān xióng yào shuì hěn jiǔ", "Bears sleep for a long time in winter."],
  '熊猫': ["熊猫只吃竹子。", "xióngmāo zhǐ chī zhúzi", "Pandas eat only bamboo."],
  '爪子': ["猫的爪子很锋利。", "māo de zhuǎzi hěn fēnglì", "A cat's claws are very sharp."],
  '爬': ["孩子爬上了树。", "háizi pá shàng le shù", "The child climbed the tree."],
  '牛': ["牛在地里吃草。", "niú zài dì lǐ chī cǎo", "The cow is grazing in the field."],
  '牛奶': ["牛奶放冰箱里了。", "niúnǎi fàng bīngxiāng lǐ le", "The milk has been put in the fridge."],
  '牛肉': ["牛肉比鸡肉贵一些。", "niúròu bǐ jīròu guì yìxiē", "Beef is a bit dearer than chicken."],
  '物种': ["这个物种很少见。", "zhège wùzhǒng hěn shǎojiàn", "This species is rarely seen."],
  '牲畜': ["农场里养着很多牲畜。", "nóngchǎng lǐ yǎng zhe hěn duō shēngchù", "The farm keeps a lot of livestock."],
  '狐狸': ["狐狸很聪明。", "húli hěn cōngming", "Foxes are very clever."],
  '狗': ["门口有一只狗。", "ménkǒu yǒu yì zhī gǒu", "There is a dog at the door."],
  '狮子': ["狮子的叫声很大。", "shīzi de jiàoshēng hěn dà", "A lion's roar is very loud."],
  '狼': ["狼在夜里出来找食。", "láng zài yèlǐ chūlái zhǎo shí", "Wolves come out at night to find food."],
  '猎人': ["猎人带着狗进山。", "lièrén dài zhe gǒu jìn shān", "The hunter went into the hills with dogs."],
  '猎物': ["狼在等待猎物。", "láng zài děngdài lièwù", "The wolf is waiting for prey."],
  '猪': ["农场里养了几头猪。", "nóngchǎng lǐ yǎng le jǐ tóu zhū", "The farm keeps a few pigs."],
  '猪肉': ["饺子馅是猪肉的。", "jiǎozi xiàn shì zhūròu de", "The dumpling filling is pork."],
  '猫': ["猫喜欢睡在窗台上。", "māo xǐhuan shuì zài chuāngtái shàng", "Cats like sleeping on the windowsill."],
  '猫咪': ["那只猫咪很亲人。", "nà zhī māomī hěn qīnrén", "That kitty is very friendly with people."],
  '猫头鹰': ["猫头鹰晚上才活动。", "māotóuyīng wǎnshang cái huódòng", "Owls are only active at night."],
  '猴子': ["猴子会爬树。", "hóuzi huì pá shù", "Monkeys can climb trees."],
  '玉米': ["夏天的玉米特别甜。", "xiàtiān de yùmǐ tèbié tián", "Summer corn is especially sweet."],
  '甜': ["这杯茶不太甜。", "zhè bēi chá bú tài tián", "This cup of tea is not very sweet."],
  '皮毛': ["这种动物的皮毛很厚。", "zhè zhǒng dòngwù de pímáo hěn hòu", "This animal's coat is very thick."],
  '盐': ["汤里的盐放多了。", "tāng lǐ de yán fàng duō le", "Too much salt went into the soup."],
  '米': ["家里的米快吃完了。", "jiā lǐ de mǐ kuài chī wán le", "We are almost out of rice at home."],
  '米饭': ["米饭还没煮好。", "mǐfàn hái méi zhǔ hǎo", "The rice is not cooked yet."],
  '粥': ["生病时喝点粥比较好。", "shēngbìng shí hē diǎn zhōu bǐjiào hǎo", "Porridge is better when you are ill."],
  '糖': ["我的咖啡不放糖。", "wǒ de kāfēi bú fàng táng", "I do not take sugar in my coffee."],
  '素食': ["我最近改吃素食。", "wǒ zuìjìn gǎi chī sùshí", "I have switched to vegetarian food lately."],
  '羊': ["山上有一群羊。", "shān shàng yǒu yì qún yáng", "There is a flock of sheep on the hill."],
  '群': ["一群鸟飞过天空。", "yì qún niǎo fēi guò tiānkōng", "A flock of birds flew across the sky."],
  '羽毛': ["地上掉了一根羽毛。", "dì shàng diào le yì gēn yǔmáo", "A feather fell on the ground."],
  '翅膀': ["这只鸟的翅膀受伤了。", "zhè zhī niǎo de chìbǎng shòushāng le", "This bird's wing is injured."],
  '老虎': ["老虎是很危险的动物。", "lǎohǔ shì hěn wēixiǎn de dòngwù", "Tigers are dangerous animals."],
  '老鼠': ["厨房里有老鼠。", "chúfáng lǐ yǒu lǎoshǔ", "There are mice in the kitchen."],
  '肉': ["这个菜里没有肉。", "zhège cài lǐ méiyǒu ròu", "There is no meat in this dish."],
  '胡萝卜': ["兔子最爱吃胡萝卜。", "tùzi zuì ài chī húluóbo", "Rabbits love carrots best."],
  '芒果': ["我对芒果过敏。", "wǒ duì mángguǒ guòmǐn", "I am allergic to mango."],
  '苍蝇': ["一只苍蝇飞进屋里。", "yì zhī cāngying fēi jìn wū lǐ", "A fly flew into the room."],
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
  '虫子': ["叶子上有只虫子。", "yèzi shàng yǒu zhī chóngzi", "There is a bug on the leaf."],
  '虾': ["这盘虾很新鲜。", "zhè pán xiā hěn xīnxiān", "This plate of shrimp is very fresh."],
  '蚂蚁': ["一队蚂蚁在搬东西。", "yí duì mǎyǐ zài bān dōngxi", "A line of ants is carrying things."],
  '蚊子': ["夏天的蚊子特别多。", "xiàtiān de wénzi tèbié duō", "There are especially many mosquitoes in summer."],
  '蛇': ["草里有一条蛇。", "cǎo lǐ yǒu yì tiáo shé", "There is a snake in the grass."],
  '蜘蛛': ["角落里有个蜘蛛网。", "jiǎoluò lǐ yǒu gè zhīzhūwǎng", "There is a spider web in the corner."],
  '蜜蜂': ["花园里有很多蜜蜂。", "huāyuán lǐ yǒu hěn duō mìfēng", "There are many bees in the garden."],
  '蝴蝶': ["一只蝴蝶飞过来了。", "yì zhī húdié fēi guòlái le", "A butterfly flew over."],
  '螃蟹': ["螃蟹横着走路。", "pángxiè héng zhe zǒulù", "Crabs walk sideways."],
  '西瓜': ["夏天最适合吃西瓜。", "xiàtiān zuì shìhé chī xīguā", "Summer is the best time for watermelon."],
  '西红柿': ["汤里放两个西红柿。", "tāng lǐ fàng liǎng gè xīhóngshì", "Put two tomatoes in the soup."],
  '调料': ["别放太多调料。", "bié fàng tài duō tiáoliào", "Do not add too much seasoning."],
  '豆腐': ["麻婆豆腐是川菜。", "mápó dòufu shì chuāncài", "Mapo tofu is a Sichuan dish."],
  '辣': ["这个菜太辣了。", "zhège cài tài là le", "This dish is too spicy."],
  '辣椒': ["这种辣椒特别辣。", "zhè zhǒng làjiāo tèbié là", "This kind of chili is especially hot."],
  '迁徙': ["候鸟每年都要迁徙。", "hòuniǎo měinián dōu yào qiānxǐ", "Migratory birds migrate every year."],
  '酱油': ["炒菜时加点酱油。", "chǎocài shí jiā diǎn jiàngyóu", "Add a little soy sauce when stir-frying."],
  '酸': ["柠檬又酸又香。", "níngméng yòu suān yòu xiāng", "Lemons are sour and fragrant."],
  '酸奶': ["我早上喝一杯酸奶。", "wǒ zǎoshang hē yì bēi suānnǎi", "I have a cup of yogurt in the morning."],
  '醋': ["饺子要蘸醋吃。", "jiǎozi yào zhàn cù chī", "Dumplings are eaten dipped in vinegar."],
  '野生': ["这里有很多野生动物。", "zhèlǐ yǒu hěn duō yěshēng dòngwù", "There is a lot of wildlife here."],
  '长颈鹿': ["长颈鹿能吃到高处的叶子。", "chángjǐnglù néng chī dào gāochù de yèzi", "Giraffes can reach the leaves up high."],
  '青蛙': ["雨后能听见青蛙叫。", "yǔ hòu néng tīngjiàn qīngwā jiào", "You can hear frogs after the rain."],
  '面包': ["早上吃了两片面包。", "zǎoshang chī le liǎng piàn miànbāo", "I ate two slices of bread this morning."],
  '面条': ["中午我想吃面条。", "zhōngwǔ wǒ xiǎng chī miàntiáo", "I want noodles for lunch."],
  '飞': ["鸟飞得很高。", "niǎo fēi de hěn gāo", "The bird flies very high."],
  '食物': ["这些食物不能久放。", "zhèxiē shíwù bùnéng jiǔ fàng", "This food cannot be kept for long."],
  '食谱': ["这本食谱很实用。", "zhè běn shípǔ hěn shíyòng", "This recipe book is very practical."],
  '饱': ["我已经吃饱了。", "wǒ yǐjīng chī bǎo le", "I am already full."],
  '饺子': ["过年时全家包饺子。", "guònián shí quánjiā bāo jiǎozi", "At New Year the whole family makes dumplings."],
  '饼干': ["孩子把饼干都吃完了。", "háizi bǎ bǐnggān dōu chī wán le", "The child ate all the biscuits."],
  '饿': ["走了一天很饿。", "zǒu le yì tiān hěn è", "Walked all day and I am hungry."],
  '香蕉': ["香蕉已经太熟了。", "xiāngjiāo yǐjīng tài shú le", "The bananas are already too ripe."],
  '马': ["草原上有一群马。", "cǎoyuán shàng yǒu yì qún mǎ", "There is a herd of horses on the grassland."],
  '驯养': ["狗是最早被驯养的。", "gǒu shì zuì zǎo bèi xùnyǎng de", "Dogs were the first to be domesticated."],
  '骆驼': ["骆驼能走很远的沙漠。", "luòtuo néng zǒu hěn yuǎn de shāmò", "Camels can cross long stretches of desert."],
  '鱼': ["这条鱼很新鲜。", "zhè tiáo yú hěn xīnxiān", "This fish is very fresh."],
  '鲨鱼': ["这片海里有鲨鱼。", "zhè piàn hǎi lǐ yǒu shāyú", "There are sharks in this stretch of sea."],
  '鲸鱼': ["鲸鱼是最大的动物。", "jīngyú shì zuì dà de dòngwù", "The whale is the largest animal."],
  '鸟': ["树上有很多鸟。", "shù shàng yǒu hěn duō niǎo", "There are many birds in the tree."],
  '鸡': ["院子里养着几只鸡。", "yuànzi lǐ yǎng zhe jǐ zhī jī", "A few chickens are kept in the yard."],
  '鸡肉': ["这块鸡肉还没熟。", "zhè kuài jīròu hái méi shú", "This piece of chicken is not cooked yet."],
  '鸡蛋': ["冰箱里还有三个鸡蛋。", "bīngxiāng lǐ háiyǒu sān gè jīdàn", "There are still three eggs in the fridge."],
  '鸭': ["河里游着两只鸭。", "hé lǐ yóu zhe liǎng zhī yā", "Two ducks are swimming in the river."],
  '鸽子': ["广场上有很多鸽子。", "guǎngchǎng shàng yǒu hěn duō gēzi", "There are many pigeons in the square."],
  '鹅': ["鹅比鸭子大。", "é bǐ yāzi dà", "Geese are bigger than ducks."],
  '鹿': ["森林里跑过一只鹿。", "sēnlín lǐ pǎo guò yì zhī lù", "A deer ran through the forest."],
  '黄油': ["面包上抹点黄油。", "miànbāo shàng mǒ diǎn huángyóu", "Spread a little butter on the bread."],
  '龙': ["中国人喜欢龙。", "Zhōngguórén xǐhuan lóng", "Chinese people are fond of dragons."]
};

/** The example for a word, or null. */
export function sentenceFor(zh) {
  return SENTENCES[zh] ?? null;
}
