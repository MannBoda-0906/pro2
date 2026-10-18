import fetch from 'node-fetch';

async function testVideoAThenVideoB() {
  const BASE = 'http://localhost:5000/api';
  console.log('=== REPRODUCING UNGROUNDED & NON-CURRENT QUIZ ISSUES ===');

  // Video A: Gravitation (Hindi video)
  console.log('\n--- 1. Submitting Video A (Gravitation in Hindi) ---');
  const resA = await fetch(`${BASE}/quizzes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: 'grav1111111',
      sourceUrl: 'https://www.youtube.com/watch?v=grav1111111',
      title: 'गुरुत्वाकर्षण और न्यूटन का सार्वत्रिक नियम (Gravitation)',
      transcript: [
        { text: 'आज हम न्यूटन के गुरुत्वाकर्षण के नियम को समझेंगे।', start: 0, duration: 10 },
        { text: 'प्रत्येक कण दूसरे कण को आकर्षित करता है: F = G * m1 * m2 / r^2.', start: 10, duration: 15 },
        { text: 'यह गुरुत्वाकर्षण बल दोनों द्रव्यमानों के बीच कार्य करता है।', start: 25, duration: 15 }
      ],
      difficulty: 'medium',
      count: 25,
      language: 'en'
    })
  });
  const dataA = await resA.json();
  console.log('Video A Status:', resA.status);
  console.log('Video A Success:', dataA.success);
  console.log('Video A Questions count:', dataA.quiz?.questions?.length);
  console.log('Video A Q1 Question:', dataA.quiz?.questions?.[0]?.question);
  console.log('Video A Q1 Concept:', dataA.quiz?.questions?.[0]?.conceptName);
  console.log('Video A Q1 Formula:', dataA.quiz?.questions?.[0]?.structuredSolution?.numerical?.relationship || dataA.quiz?.questions?.[0]?.formulaUsed);

  // Video B: Binary Search (Computer Science)
  console.log('\n--- 2. Submitting Video B (Binary Search) ---');
  const resB = await fetch(`${BASE}/quizzes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: 'algo2222222',
      sourceUrl: 'https://www.youtube.com/watch?v=algo2222222',
      title: 'Binary Search Algorithm in Computer Science',
      transcript: [
        { text: 'Binary search is an efficient search algorithm on sorted arrays with time complexity O(log n).', start: 0, duration: 15 },
        { text: 'We divide the search interval in half by calculating mid = low + (high - low) / 2.', start: 15, duration: 20 },
        { text: 'If target equals array at mid we found it. Otherwise we recurse left or right.', start: 35, duration: 20 }
      ],
      difficulty: 'medium',
      count: 25,
      language: 'en'
    })
  });
  const dataB = await resB.json();
  console.log('Video B Status:', resB.status);
  console.log('Video B Success:', dataB.success);
  console.log('Video B Questions count:', dataB.quiz?.questions?.length);
  console.log('Video B Q1 Question:', dataB.quiz?.questions?.[0]?.question);
  console.log('Video B Q1 Concept:', dataB.quiz?.questions?.[0]?.conceptName);
  console.log('Video B Q1 Formula:', dataB.quiz?.questions?.[0]?.structuredSolution?.numerical?.relationship || dataB.quiz?.questions?.[0]?.formulaUsed);

  // Video C: French Revolution (History)
  console.log('\n--- 3. Submitting Video C (French Revolution - History) ---');
  const resC = await fetch(`${BASE}/quizzes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: 'hist3333333',
      sourceUrl: 'https://www.youtube.com/watch?v=hist3333333',
      title: 'The French Revolution of 1789 and Storming of the Bastille',
      transcript: [
        { text: 'In 1789, the French Revolution began with the convocation of the Estates General.', start: 0, duration: 20 },
        { text: 'On July 14, revolutionaries stormed the Bastille fortress in Paris, demanding liberty, equality, and fraternity.', start: 20, duration: 25 },
        { text: 'The National Assembly proclaimed the Declaration of the Rights of Man and of the Citizen.', start: 45, duration: 25 }
      ],
      difficulty: 'medium',
      count: 25,
      language: 'en'
    })
  });
  const dataC = await resC.json();
  console.log('Video C Status:', resC.status);
  console.log('Video C Success:', dataC.success);
  console.log('Video C Questions count:', dataC.quiz?.questions?.length);
  console.log('Video C Q1 Question:', dataC.quiz?.questions?.[0]?.question);
  console.log('Video C Q1 Concept:', dataC.quiz?.questions?.[0]?.conceptName);
  console.log('Video C Q1 Formula:', dataC.quiz?.questions?.[0]?.structuredSolution?.numerical?.relationship || dataC.quiz?.questions?.[0]?.formulaUsed);
}

testVideoAThenVideoB().catch(console.error);
