import { CaptionService } from '../services/captionService.js';
import { S1_VideoAnalysis } from '../services/quizPipeline/S1_videoAnalysis.js';
import { S2_ConceptExtraction } from '../services/quizPipeline/S2_conceptExtraction.js';

async function traceTitleDominance() {
  console.log('=== STEP 1 TRACE: REAL VIDEO TRANSCRIPT & PROMPTS ===\n');

  // Let's use demo-mit-cs transcript or a real video caption fetch
  const videoId = 'k6U-i4gXka8';
  const realTitle = 'MIT 6.0001: Introduction to Computer Science and Programming in Python';
  const dummyTitle = 'Completely Unrelated Fake Cooking Video Title';

  let transcript;
  try {
    const res = await CaptionService.fetchTranscript(videoId, 'en');
    transcript = res.transcript;
  } catch (err) {
    console.log('Online caption fetch fallback to local lecture segments:', err.message);
    transcript = [
      { text: "Welcome to MIT 6.0001 Introduction to Computer Science and Programming in Python.", start: 0, duration: 8 },
      { text: "In this course, we are going to learn what computation really is and how you can think computationally.", start: 8, duration: 10 },
      { text: "First, what does a computer do? At its fundamental core, a computer performs calculations and remembers results.", start: 18, duration: 12 },
      { text: "Calculations can be built-in operations like addition or multiplication, or complex algorithms defined by software.", start: 30, duration: 14 },
      { text: "There are two main types of knowledge: declarative knowledge and imperative knowledge.", start: 44, duration: 12 },
      { text: "Declarative knowledge is statements of fact. For example, 'the square root of x is a number y such that y squared equals x'.", start: 56, duration: 15 },
      { text: "Imperative knowledge, on the other hand, is a 'how-to' recipe. It gives step-by-step instructions for deducing information.", start: 71, duration: 16 },
      { text: "An algorithm is a finite sequence of instructions that solves a computational problem. It must have a halting condition.", start: 87, duration: 18 },
      { text: "We will use Python because it has a clean syntax, great readability, and high expressiveness.", start: 105, duration: 15 },
      { text: "Python programs are made of expressions, objects, and types. Every object in Python has a type that dictates valid operations.", start: 120, duration: 18 },
      { text: "Scalar types include integers, floats, booleans, and NoneType. Variables allow you to bind names to objects in memory.", start: 138, duration: 20 }
    ];
  }

  const rawFullText = transcript.map(s => s.text).join(' ');
  console.log(`Transcript Length: ${rawFullText.length} characters`);
  console.log(`First 300 characters of transcript:\n"${rawFullText.slice(0, 300)}..."\n`);

  // Show how S1 prompt was constructed
  console.log('--- Text received by Stage 1 (Video Analysis) AI call ---');
  console.log(`Prompt Header:
VIDEO TITLE: "${realTitle}"
TRANSCRIPT EVIDENCE:
"""
${rawFullText.slice(0, 200)}...
"""`);

  // Show how local extraction in S1 treated title:
  const localEvReal = S1_VideoAnalysis.extractLocally(realTitle, transcript);
  const localEvDummy = S1_VideoAnalysis.extractLocally(dummyTitle, transcript);

  console.log('\n--- Evidence Chapter & Definitions from Real Title vs Dummy Title in S1 ---');
  console.log(`Real Title Chapter: "${localEvReal.chapter}", Subject: "${localEvReal.subject}"`);
  console.log(`Dummy Title Chapter: "${localEvDummy.chapter}", Subject: "${localEvDummy.subject}"`);
  console.log(`Real Title Defs:`, localEvReal.definitions.map(d => d.term));
  console.log(`Dummy Title Defs:`, localEvDummy.definitions.map(d => d.term));
}

traceTitleDominance().catch(console.error);
