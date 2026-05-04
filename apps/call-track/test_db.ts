import { getHistoryPaginated } from './src/config/conversations.js';
async function test() {
  const result = await getHistoryPaginated('+524777800840', 5);
  console.log("Result +:", result);
  const result2 = await getHistoryPaginated(' 524777800840', 5);
  console.log("Result space:", result2);
}
test();
