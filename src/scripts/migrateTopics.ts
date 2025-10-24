import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

const PRIMARY_SCHOOL_TOPICS = [
  'Хотелось ли вам пойти в школу? Что привлекало/не привлекало?',
  'Как вы помните свой первый сентября и начальную школу?',
  'Был ли в школе навык или знание, которые вас по-настоящему удивили?',
  'Как давалась учеба (отношение к предметам, успеваемость)?',
  'Как вы учились писать, читать и считать? Приносило ли это вам удовольствие и были ли неприятные истории на этом пути?',
  'Были ли у вас страшные учителя?',
  'Помогали ли вам с учёбой, домашними заданиями?',
  'Как в вашей семье воспринимались успехи и неудачи в школе?',
  'В чём проявлялся ваш познавательный интерес? Ставили ли вы эксперименты в процессе изучения мира?',
  'Были ли у вас деньги в детстве и как вы ими распоряжались и могли ли вы распоряжаться по своему усмотрению?',
  'Как вы добирались до школы, самостоятельно или с родителями? Как осваивали пространство города?',
  'Были ли первые школьные друзья?',
  'Были ли в этом периоде истории, связанные с тем, что вы говорили неправду, фантазировали?',
  'Как вам кажется в какой момент закончилось ваше детство, что вы потеряли?',
  'Было ли вам стыдно за себя или родителей в начальной школьной жизни?',
  'Какие штуки из детства вы купили или сделали только потом, а какие ещё не сделали?',
  'Ожидаете ли вы сейчас одобрения со стороны руководителя или старших коллег, когда выполняете работу?',
  'Как вы относитесь к правилам и нормам в жизни?',
];

export async function migrateTopicsToFirestore() {
  console.log('🚀 Starting topics migration...');

  try {
    const topicsCollection = collection(db, 'topics');

    for (let i = 0; i < PRIMARY_SCHOOL_TOPICS.length; i += 1) {
      const topicData = {
        ageRange: 'primary-school',
        text: PRIMARY_SCHOOL_TOPICS[i],
        order: i + 1,
        createdAt: serverTimestamp(),
        createdBy: 'system',
      };

      await addDoc(topicsCollection, topicData);
      console.log(`✅ Migrated topic ${i + 1}/${PRIMARY_SCHOOL_TOPICS.length}`);
    }

    console.log('🎉 Migration completed successfully!');
    console.log(`Total topics migrated: ${PRIMARY_SCHOOL_TOPICS.length}`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}
