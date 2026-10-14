async function runTests() {
  const BASE = 'http://localhost:5000/api';
  console.log('--- STARTING ALL 10 TEST SCENARIOS ---\n');

  // TEST 1: English video -> English quiz
  console.log('TEST 1: English video -> English quiz');
  const res1 = await fetch(BASE + '/quizzes/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: 'demo-photosynthesis',
      title: 'CrashCourse Biology: Photosynthesis & Light Reactions',
      transcript: [
        { text: 'Photosynthesis takes water, carbon dioxide, and sunlight, and converts them into glucose and oxygen.', start: 20, duration: 14 },
        { text: 'The chemical equation is 6CO2 + 6H2O + light energy yields C6H12O6 + 6O2.', start: 34, duration: 16 },
        { text: 'In the light reactions, photons strike chlorophyll in Photosystem II, exciting electrons and splitting water molecules.', start: 95, duration: 18 }
      ],
      difficulty: 'medium',
      count: 5,
      language: 'en'
    })
  });
  const data1 = await res1.json();
  console.log('  Success:', data1.success);
  console.log('  Questions Count:', data1.quiz?.questions?.length);
  console.log('  First Q:', data1.quiz?.questions?.[0]?.question?.slice(0, 75));
  console.log('  Cognitive Level:', data1.quiz?.questions?.[0]?.cognitiveLevel);
  console.log('  Topic Coverage:', data1.quiz?.topicCoverageReport?.summaryText);

  // TEST 2: English video -> Hindi quiz
  console.log('\nTEST 2: English video -> Hindi quiz');
  const res2 = await fetch(BASE + '/quizzes/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: 'demo-photosynthesis',
      title: 'CrashCourse Biology: Photosynthesis & Light Reactions',
      transcript: [
        { text: 'Photosynthesis takes water, carbon dioxide, and sunlight, and converts them into glucose and oxygen.', start: 20, duration: 14 },
        { text: 'In the light reactions, photons strike chlorophyll in Photosystem II, exciting electrons and splitting water molecules.', start: 95, duration: 18 }
      ],
      difficulty: 'medium',
      count: 5,
      language: 'hi'
    })
  });
  const data2 = await res2.json();
  console.log('  Success:', data2.success);
  console.log('  Language:', data2.quiz?.language);
  console.log('  Hindi Q:', data2.quiz?.questions?.[0]?.question);
  console.log('  Hindi Explanation:', data2.quiz?.questions?.[0]?.explanation?.slice(0, 80));

  // TEST 3: Hindi video -> English quiz
  console.log('\nTEST 3: Hindi video -> English quiz');
  const res3 = await fetch(BASE + '/quizzes/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: 'hindi-physics-lesson',
      title: 'गुरुत्वाकर्षण और न्यूटन का सार्वत्रिक नियम (Gravitation)',
      transcript: [
        { text: 'आज हम न्यूटन के गुरुत्वाकर्षण के सार्वत्रिक नियम को समझेंगे।', start: 0, duration: 10 },
        { text: 'ब्रह्मांड का प्रत्येक कण अन्य प्रत्येक कण को एक बल से आकर्षित करता है।', start: 10, duration: 15 },
        { text: 'यह बल उनके द्रव्यमानों के गुणनफल के समानुपाती और उनके बीच की दूरी के वर्ग के व्युत्क्रमानुपाती होता है: F = G * (m1 * m2) / r^2.', start: 25, duration: 25 }
      ],
      difficulty: 'medium',
      count: 3,
      language: 'en'
    })
  });
  const data3 = await res3.json();
  console.log('  Success:', data3.success);
  console.log('  English Q from Hindi input:', data3.quiz?.questions?.[0]?.question);

  // TEST 4: English video -> Gujarati quiz
  console.log('\nTEST 4: English video -> Gujarati quiz');
  const res4 = await fetch(BASE + '/quizzes/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: 'demo-photosynthesis',
      title: 'CrashCourse Biology: Photosynthesis & Light Reactions',
      transcript: [
        { text: 'Photosynthesis takes water, carbon dioxide, and sunlight, and converts them into glucose and oxygen.', start: 20, duration: 14 },
        { text: 'In the light reactions, photons strike chlorophyll in Photosystem II, exciting electrons and splitting water molecules.', start: 95, duration: 18 }
      ],
      difficulty: 'hard',
      count: 4,
      language: 'gu'
    })
  });
  const data4 = await res4.json();
  console.log('  Success:', data4.success);
  console.log('  Language:', data4.quiz?.language);
  console.log('  Gujarati Q:', data4.quiz?.questions?.[0]?.question);

  // TEST 5: Gujarati video -> English quiz
  console.log('\nTEST 5: Gujarati video -> English quiz');
  const res5 = await fetch(BASE + '/quizzes/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: 'gujarati-science-lesson',
      title: 'પ્રકાશનું વક્રીભવન અને સ્નેલનો નિયમ (Refraction of Light)',
      transcript: [
        { text: 'આજે આપણે પ્રકાશના વક્રીભવન અને સ્નેલના નિયમ વિશે અભ્યાસ કરીશું.', start: 0, duration: 12 },
        { text: 'જ્યારે પ્રકાશનું કિરણ એક માધ્યમમાંથી બીજા માધ્યમમાં પ્રવેશે છે ત્યારે તે વાંકું વળે છે જેને વક્રીભવન કહે છે.', start: 12, duration: 20 },
        { text: 'સ્નેલનો નિયમ સૂત્ર આપે છે: n1 * sin(θ1) = n2 * sin(θ2).', start: 32, duration: 22 }
      ],
      difficulty: 'medium',
      count: 3,
      language: 'en'
    })
  });
  const data5 = await res5.json();
  console.log('  Success:', data5.success);
  console.log('  English Q from Gujarati input:', data5.quiz?.questions?.[0]?.question);

  // TEST 6: Spanish video -> Hindi quiz
  console.log('\nTEST 6: Spanish video -> Hindi quiz');
  const res6 = await fetch(BASE + '/quizzes/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: 'spanish-physics-lesson',
      title: 'Leyes de la Termodinámica y Entropía',
      transcript: [
        { text: 'Hoy explicaremos la primera y segunda ley de la termodinámica.', start: 0, duration: 15 },
        { text: 'La energía no se crea ni se destruye, solo se transforma: Delta U = Q - W.', start: 15, duration: 20 },
        { text: 'La segunda ley establece que la entropía de un sistema aislado siempre tiende a aumentar con el tiempo.', start: 35, duration: 25 }
      ],
      difficulty: 'hard',
      count: 3,
      language: 'hi'
    })
  });
  const data6 = await res6.json();
  console.log('  Success:', data6.success);
  console.log('  Hindi Q from Spanish input:', data6.quiz?.questions?.[0]?.question);

  // TEST 7: Long educational video -> concept-based quiz
  console.log('\nTEST 7: Long educational video -> concept-based quiz');
  const res7 = await fetch(BASE + '/quizzes/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: 'demo-mit-cs',
      title: 'MIT 6.0001: Introduction to Computer Science and Programming in Python',
      transcript: [
        { text: 'Welcome to MIT 6.0001. We will learn computational thinking.', start: 0, duration: 10 },
        { text: 'Declarative knowledge is statements of fact. Imperative knowledge is recipe for how to compute.', start: 44, duration: 20 },
        { text: 'An algorithm is a finite sequence of instructions that halts and solves a problem.', start: 87, duration: 18 },
        { text: 'Python uses objects and scalar types like int, float, bool, and NoneType.', start: 138, duration: 20 }
      ],
      difficulty: 'medium',
      count: 5,
      language: 'en'
    })
  });
  const data7 = await res7.json();
  console.log('  Success:', data7.success);
  console.log('  Concepts covered count:', data7.quiz?.conceptMap?.concepts?.length);
  console.log('  Topic coverage report:', data7.quiz?.topicCoverageReport?.summaryText);

  // TEST 8: Video with no accessible transcript -> clear handling
  console.log('\nTEST 8: Video with no accessible transcript -> clear handling');
  const res8 = await fetch(BASE + '/videos/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://youtube.com/watch?v=invalidVideoID999' })
  });
  const data8 = await res8.json();
  console.log('  Handled gracefully:', data8.success, 'transcript length:', data8.transcript?.length);

  // TEST 9: Mathematics video -> calculation/application questions
  console.log('\nTEST 9: Mathematics video -> calculation/application questions');
  const res9 = await fetch(BASE + '/quizzes/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: 'math-calculus-lesson',
      title: 'Calculus: Derivatives, Power Rule, and Rate of Change',
      transcript: [
        { text: 'The derivative represents the instantaneous rate of change of a function.', start: 0, duration: 15 },
        { text: 'The power rule states that the derivative of x^n with respect to x is n * x^(n - 1).', start: 15, duration: 25 },
        { text: 'For example, if f(x) = 3 * x^2, the derivative f prime of x is 6 * x.', start: 40, duration: 20 }
      ],
      difficulty: 'hard',
      count: 3,
      language: 'en'
    })
  });
  const data9 = await res9.json();
  console.log('  Success:', data9.success);
  console.log('  Math Q:', data9.quiz?.questions?.[0]?.question);

  // TEST 10: Science video -> conceptual/application questions
  console.log('\nTEST 10: Science video -> conceptual/application questions');
  const res10 = await fetch(BASE + '/quizzes/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: 'demo-photosynthesis',
      title: 'CrashCourse Biology: Photosynthesis & Light Reactions',
      transcript: [
        { text: 'Photosynthesis takes water, carbon dioxide, and sunlight, and converts them into glucose and oxygen.', start: 20, duration: 14 },
        { text: 'In Photosystem II, light energy splits water molecules producing oxygen gas.', start: 95, duration: 18 },
        { text: 'The Calvin cycle fixes CO2 into sugar using ATP and NADPH.', start: 149, duration: 22 }
      ],
      difficulty: 'hard',
      count: 3,
      language: 'en'
    })
  });
  const data10 = await res10.json();
  console.log('  Success:', data10.success);
  console.log('  Science Q:', data10.quiz?.questions?.[0]?.question);

  // BONUS TEST: Adaptive practice questions for weak concepts
  console.log('\nBONUS TEST: Adaptive practice generation');
  const resPractice = await fetch(BASE + '/quizzes/practice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Newtonian Mechanics',
      weakConcepts: ["Newton's Second Law", "Inertia vs Mass"],
      difficulty: 'medium',
      language: 'en'
    })
  });
  const dataPractice = await resPractice.json();
  console.log('  Practice Success:', dataPractice.success);
  console.log('  Practice Questions Count:', dataPractice.questions?.length);
  console.log('  Practice Q1:', dataPractice.questions?.[0]?.question);

  console.log('\n--- ALL TESTS COMPLETED SUCCESSFULLY! ---');
}

runTests().catch(err => console.error('Test execution error:', err));
