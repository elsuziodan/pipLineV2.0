import { getCalls } from './dataBase/database';

async function checkLatestCalls() {
    try {
        const calls = await getCalls();
        console.log('--- ÚLTIMAS 5 INTERACCIONES ---');
        console.log(JSON.stringify(calls.slice(0, 5), null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

checkLatestCalls();
