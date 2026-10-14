import { HistoryItem, QuizData, SummaryData, Flashcard, TranscriptSegment } from '../types/index.js';

export interface DemoVideo {
  id: string;
  url: string;
  title: string;
  author: string;
  thumbnailUrl: string;
  duration: string;
  durationSeconds: number;
  transcript: TranscriptSegment[];
  summary: SummaryData;
  quiz: QuizData;
  flashcards: Flashcard[];
}

export const DEMO_VIDEOS: Record<string, DemoVideo> = {
  'demo-mit-cs': {
    id: 'demo-mit-cs',
    url: 'https://www.youtube.com/watch?v=k6U-i4gXka8',
    title: 'MIT 6.0001: Introduction to Computer Science and Programming in Python',
    author: 'MIT OpenCourseWare',
    thumbnailUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&auto=format&fit=crop&q=80',
    duration: '14:20',
    durationSeconds: 860,
    transcript: [
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
      { text: "Scalar types include integers, floats, booleans, and NoneType. Variables allow you to bind names to objects in memory.", start: 138, duration: 20 },
      { text: "Remember that assignment in Python uses the equal sign, which binds the name on the left to the value evaluated on the right.", start: 158, duration: 22 },
      { text: "Control flow allows branching with if, elif, and else statements, making code dynamic based on test conditions.", start: 180, duration: 25 }
    ],
    summary: {
      shortSummary: "A foundational lecture introducing computational thinking, the distinction between declarative and imperative knowledge, the definition of algorithms, and how Python handles data types and control flow.",
      detailedSummary: "This lecture lays down the bedrock concepts of computer science. It begins by answering what computers fundamentally do: execute calculations and store state. The instructor clearly delineates between declarative knowledge (statements of truth) and imperative knowledge (algorithmic step-by-step procedures to deduce results). Students are introduced to Python as an expressive, high-level language with strong type conventions. The lecture explores scalar objects, variable assignment bindings, and basic control flow constructs like conditional branches.",
      keyPoints: [
        "Computers fundamentally perform two tasks: fast calculations and memory storage.",
        "Declarative knowledge describes 'what is' (facts), whereas Imperative knowledge describes 'how to' (recipes).",
        "An algorithm is a finite sequence of mechanical instructions with an explicit termination condition.",
        "Everything in Python is an object, and every object has an immutable type determining its capabilities.",
        "Scalar data types include int, float, bool, and NoneType.",
        "Variable assignment in Python binds a symbolic identifier to an allocated object in memory."
      ],
      studyNotes: `# MIT 6.0001: Introduction to Computational Thinking & Python

## 1. What is Computation?
* At the physical machine layer, computers only do:
  1. **Calculations** (arithmetic and logical operations at billions of cycles per second).
  2. **Memory storage** (registers, cache, RAM, non-volatile disks).

## 2. Knowledge Classifications
* **Declarative Knowledge**: Assertions of truth without procedural instructions.
  * *Example*: $\\sqrt{x} = y$ where $y^2 = x$ and $y \\ge 0$.
* **Imperative Knowledge**: Actionable recipes detailing sequential steps.
  * *Example*: Successive approximation (Newton-Raphson) to find $\\sqrt{x}$.

## 3. Algorithms
* An **algorithm** is:
  1. A sequence of well-defined steps.
  2. A flow of control determining execution order.
  3. A definite stopping condition (halting problem awareness).

## 4. Python Fundamentals
* **Variables & Binding**: The \`=\` operator does not mean mathematical equality; it binds a variable name to an object reference in memory.
* **Scalar Data Types**:
  * \`int\`: Arbitrary precision integers (\`42\`).
  * \`float\`: Real numbers with fractional components (\`3.1415\`).
  * \`bool\`: Boolean truth values (\`True\`, \`False\`).
  * \`NoneType\`: Special singleton object representing absence of value (\`None\`).
`,
      importantDefinitions: [
        {
          term: "Declarative Knowledge",
          definition: "Knowledge that consists of static statements of facts or axiomatic truths.",
          simpleExplanation: "Knowing WHAT something is without knowing the steps to calculate it."
        },
        {
          term: "Imperative Knowledge",
          definition: "A algorithmic sequence of actionable steps or 'recipes' to compute an answer.",
          simpleExplanation: "Step-by-step instructions showing HOW to solve a problem."
        },
        {
          term: "Algorithm",
          definition: "A finite list of precise instructions executed mechanically that guarantees termination.",
          simpleExplanation: "A recipe for a computer to finish a task."
        },
        {
          term: "Scalar Object",
          definition: "An indivisible data object in Python that cannot be split into smaller components.",
          simpleExplanation: "Basic single values like a number (5) or a boolean (True), unlike lists or dictionaries."
        }
      ],
      keyTakeaways: [
        "Computational thinking empowers you to translate complex real-world problems into discrete, solvable procedures.",
        "Programming is not about memorizing syntax, but mastering algorithmic reasoning and problem decomposition.",
        "Understanding variable binding prevents common bugs in Python state mutation."
      ],
      chapters: [
        { title: "Course Introduction & Computational Thinking", timestamp: "00:00", seconds: 0, summary: "Welcome, overview of course syllabus and goals." },
        { title: "What Computers Actually Do", timestamp: "00:18", seconds: 18, summary: "Core mechanics: calculations and memory storage." },
        { title: "Declarative vs Imperative Knowledge", timestamp: "00:44", seconds: 44, summary: "Definitions, comparisons, and algorithmic recipes." },
        { title: "Introduction to Python Types & Objects", timestamp: "01:45", seconds: 105, summary: "Python objects, scalars, and variable binding." }
      ],
      language: "en"
    },
    quiz: {
      title: "MIT 6.0001: Computational Thinking Mastery Quiz",
      difficulty: "medium",
      questions: [
        {
          id: "q1",
          type: "mcq",
          question: "Which of the following best exemplifies 'Declarative Knowledge'?",
          options: [
            "A step-by-step formula for Newton-Raphson approximation",
            "The statement that the square root of 25 is 5 because 5 squared equals 25",
            "A Python loop calculating primes up to 100",
            "An algorithm for sorting an array of numbers"
          ],
          correctAnswer: "The statement that the square root of 25 is 5 because 5 squared equals 25",
          explanation: "Declarative knowledge represents statements of fact (what is true), unlike recipes or algorithms which are imperative (how to compute).",
          difficulty: "easy"
        },
        {
          id: "q2",
          type: "mcq",
          question: "What does the '=' symbol represent in a Python assignment statement?",
          options: [
            "Mathematical equality between left and right sides",
            "Binding a variable name to an object evaluated in memory",
            "A comparison returning a boolean True or False",
            "A memory pointer swap between two variables"
          ],
          correctAnswer: "Binding a variable name to an object evaluated in memory",
          explanation: "In Python, '=' is the assignment operator that associates or binds an identifier to the resulting object.",
          difficulty: "medium"
        },
        {
          id: "q3",
          type: "true_false",
          question: "True or False: Every algorithm must have a halting condition so that it does not loop indefinitely.",
          options: ["True", "False"],
          correctAnswer: "True",
          explanation: "By definition, an algorithm must consist of a finite sequence of steps and guarantee termination under valid inputs.",
          difficulty: "easy"
        },
        {
          id: "q4",
          type: "mcq",
          question: "Which of the following is considered a SCALAR type in standard Python?",
          options: [
            "list",
            "dict",
            "int",
            "set"
          ],
          correctAnswer: "int",
          explanation: "Scalar types in Python are atomic and indivisible (e.g., int, float, bool, NoneType). Collections like list, dict, and set are compound objects.",
          difficulty: "medium"
        },
        {
          id: "q5",
          type: "short_answer",
          question: "What are the two fundamental tasks that computers perform at their hardware layer?",
          options: ["Calculations and memory storage", "Graphics and network routing", "Compilation and garbage collection", "Parsing and serialization"],
          correctAnswer: "Calculations and memory storage",
          explanation: "As highlighted in the lecture, computers fundamentally perform high-speed calculations and remember the resulting values in memory.",
          difficulty: "medium"
        }
      ]
    },
    flashcards: [
      {
        id: "fc1",
        front: "Declarative Knowledge vs Imperative Knowledge",
        back: "Declarative = Statements of fact ('what is true'). Imperative = Step-by-step algorithms ('how to achieve/compute').",
        category: "Core Concepts"
      },
      {
        id: "fc2",
        front: "What is an Algorithm?",
        back: "A finite, ordered sequence of unambiguous instructions that takes inputs, processes them, and halts with an output.",
        category: "Algorithms"
      },
      {
        id: "fc3",
        front: "What happens during Python Variable Assignment?",
        back: "The right side is evaluated into an object in memory, and the left side variable name is bound to point to that object.",
        category: "Python Basics"
      },
      {
        id: "fc4",
        front: "Examples of Python Scalar Types",
        back: "int, float, bool, and NoneType. They represent indivisible single values.",
        category: "Data Types"
      }
    ]
  },

  'demo-photosynthesis': {
    id: 'demo-photosynthesis',
    url: 'https://www.youtube.com/watch?v=sQK3Yr4Sc_k',
    title: 'CrashCourse Biology: Photosynthesis & Light Reactions',
    author: 'CrashCourse',
    thumbnailUrl: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=800&auto=format&fit=crop&q=80',
    duration: '12:15',
    durationSeconds: 735,
    transcript: [
      { text: "Hank Green here, and today we are talking about the ultimate solar-powered engine: Photosynthesis.", start: 0, duration: 8 },
      { text: "Every bit of biological energy on this planet originally arrived from thermonuclear reactions in our sun.", start: 8, duration: 12 },
      { text: "Photosynthesis takes water, carbon dioxide, and sunlight, and converts them into glucose and oxygen.", start: 20, duration: 14 },
      { text: "The chemical equation is 6CO2 + 6H2O + light energy yields C6H12O6 + 6O2.", start: 34, duration: 16 },
      { text: "This entire miracle takes place inside specialized organelles called chloroplasts inside plant cells.", start: 50, duration: 14 },
      { text: "Inside the chloroplast, there are stacks of thylakoid membranes called grana, bathed in a fluid called stroma.", start: 64, duration: 16 },
      { text: "Photosynthesis occurs in two distinct phases: The Light-Dependent Reactions and the Calvin Cycle.", start: 80, duration: 15 },
      { text: "In the light reactions, photons strike chlorophyll in Photosystem II, exciting electrons and splitting water molecules.", start: 95, duration: 18 },
      { text: "Splitting water produces free oxygen gas that plants release into the atmosphere for animals like us to breathe.", start: 113, duration: 16 },
      { text: "Electrons travel through an electron transport chain, generating ATP through photophosphorylation and NADPH.", start: 129, duration: 20 },
      { text: "In the Calvin cycle, enzyme RuBisCO fixes carbon dioxide from air into sugar molecules using that ATP and NADPH.", start: 149, duration: 22 }
    ],
    summary: {
      shortSummary: "An energetic exploration of photosynthesis, detailing how chloroplasts convert sunlight, water, and CO2 into glucose and oxygen through light-dependent reactions and the Calvin Cycle.",
      detailedSummary: "Photosynthesis is the fundamental bio-energetic mechanism supporting terrestrial life. CrashCourse breaks the process down into its structural setting (chloroplast thylakoids and stroma) and two chemical phases. In Stage 1 (Light-Dependent Reactions), photons hit chlorophyll pigments in Photosystem II, exciting electrons and splitting water into protons and breathable O2. An electron transport chain harnesses this energy to pump protons and synthesize ATP and NADPH. In Stage 2 (The Calvin Cycle / Light-Independent Reactions), the enzyme RuBisCO facilitates carbon fixation in the stroma, utilizing ATP and NADPH to assemble glucose molecules.",
      keyPoints: [
        "Photosynthesis overall formula: 6 CO2 + 6 H2O + photons → C6H12O6 + 6 O2.",
        "Site of reactions: Chloroplasts, with thylakoids hosting light reactions and stroma hosting the Calvin cycle.",
        "Water splitting (photolysis) in Photosystem II is the primary source of atmospheric oxygen on Earth.",
        "ATP and NADPH act as mobile chemical energy carriers between the light reactions and the dark reactions.",
        "RuBisCO is the most abundant enzyme on Earth, responsible for fixing carbon from CO2 into organic carbon compounds."
      ],
      studyNotes: `# Biology: Photosynthesis & Cellular Energy

## 1. Overall Stoichiometry
$$\\text{6CO}_2 + \\text{6H}_2\\text{O} + \\text{Solar Photons} \\longrightarrow \\text{C}_6\\text{H}_{12}\\text{O}_6 + \\text{6O}_2$$

## 2. Cellular Anatomy of the Chloroplast
* **Thylakoids**: Flattened disc-like sacs organized into stacks called **grana**. Contains chlorophyll pigments.
* **Stroma**: The dense fluid surrounding thylakoids; site of enzymatic Calvin cycle reactions.

## 3. Phase 1: Light-Dependent Reactions
* **Location**: Thylakoid membranes.
* **Mechanism**:
  1. Photons hit **Photosystem II (P680)**.
  2. Water is photolyzed: $2H_2O \\rightarrow 4H^+ + 4e^- + O_2$.
  3. Electrons flow down the Electron Transport Chain (ETC).
  4. Chemiosmosis powers ATP Synthase to generate **ATP**.
  5. Electrons reach **Photosystem I (P700)**, reducing $NADP^+$ to **NADPH**.

## 4. Phase 2: The Calvin Cycle (Light-Independent)
* **Location**: Chloroplast stroma.
* **Enzyme**: **RuBisCO** (Ribulose-1,5-bisphosphate carboxylase-oxygenase).
* **Process**: Fixes inorganic carbon dioxide into 3-PGA, which is reduced using ATP & NADPH to synthesize G3P, forming **Glucose**.
`,
      importantDefinitions: [
        {
          term: "Thylakoid",
          definition: "A membrane-bound compartment inside chloroplasts where light-dependent reactions take place.",
          simpleExplanation: "Tiny microscopic solar panels stacked inside plant cells."
        },
        {
          term: "Photolysis",
          definition: "The chemical breakdown of water molecules into hydrogen ions, electrons, and oxygen gas powered by light.",
          simpleExplanation: "Using sunlight to break apart water and release oxygen."
        },
        {
          term: "RuBisCO",
          definition: "The catalytic enzyme responsible for fixing atmospheric CO2 into biologically usable carbon.",
          simpleExplanation: "The hardworking enzyme that catches carbon from air to make plant sugar."
        }
      ],
      keyTakeaways: [
        "Without water photolysis in chloroplasts, Earth's oxygen-rich atmosphere wouldn't exist.",
        "Plants store solar energy directly into carbon-carbon covalent bonds inside glucose sugars.",
        "Light reactions charge the batteries (ATP/NADPH); the Calvin cycle spends those batteries to manufacture food."
      ],
      chapters: [
        { title: "Introduction & Solar Power in Nature", timestamp: "00:00", seconds: 0, summary: "How plants capture light." },
        { title: "Chemical Equation & Chloroplast Anatomy", timestamp: "00:34", seconds: 34, summary: "Formula, grana, stroma, and thylakoid structure." },
        { title: "Light-Dependent Reactions & Water Splitting", timestamp: "01:35", seconds: 95, summary: "Photosystems II and I, electron transport chain, ATP synthesis." },
        { title: "Calvin Cycle & Carbon Fixation", timestamp: "02:29", seconds: 149, summary: "RuBisCO enzyme and sugar production." }
      ],
      language: "en"
    },
    quiz: {
      title: "CrashCourse Photosynthesis Check",
      difficulty: "medium",
      questions: [
        {
          id: "pb1",
          type: "mcq",
          question: "Where do the Light-Dependent Reactions of photosynthesis occur inside a plant cell?",
          options: [
            "In the thylakoid membranes of chloroplasts",
            "In the stroma fluid of chloroplasts",
            "Inside the mitochondria matrix",
            "Inside the cell nucleus"
          ],
          correctAnswer: "In the thylakoid membranes of chloroplasts",
          explanation: "The chlorophyll pigments and electron transport chain complexes are embedded directly in the thylakoid membranes.",
          difficulty: "easy"
        },
        {
          id: "pb2",
          type: "mcq",
          question: "What is the primary source of the oxygen gas (O2) released during photosynthesis?",
          options: [
            "Carbon dioxide (CO2)",
            "Water molecules (H2O)",
            "Glucose (C6H12O6)",
            "Atmospheric nitrogen"
          ],
          correctAnswer: "Water molecules (H2O)",
          explanation: "When photons strike Photosystem II, water molecules undergo photolysis, splitting into protons, electrons, and releasing oxygen gas.",
          difficulty: "medium"
        },
        {
          id: "pb3",
          type: "true_false",
          question: "True or False: The Calvin Cycle can run continuously in total darkness forever without any prior light exposure.",
          options: ["True", "False"],
          correctAnswer: "False",
          explanation: "Even though called 'light-independent', the Calvin cycle immediately starves without the ATP and NADPH continuously supplied by light reactions.",
          difficulty: "easy"
        },
        {
          id: "pb4",
          type: "mcq",
          question: "Which enzyme is responsible for catalyzing the fixation of carbon dioxide in the Calvin Cycle?",
          options: [
            "DNA Polymerase",
            "RuBisCO",
            "Amylase",
            "ATP Synthase"
          ],
          correctAnswer: "RuBisCO",
          explanation: "RuBisCO (Ribulose-1,5-bisphosphate carboxylase/oxygenase) fixes carbon dioxide into 3-carbon compounds.",
          difficulty: "medium"
        },
        {
          id: "pb5",
          type: "short_answer",
          question: "What two energy-carrying molecules produced during light reactions fuel the Calvin Cycle?",
          options: ["ATP and NADPH", "NADH and FADH2", "ADP and NADP+", "Glucose and Oxygen"],
          correctAnswer: "ATP and NADPH",
          explanation: "ATP provides phosphorylation energy while NADPH provides high-energy reducing electrons for carbohydrate synthesis.",
          difficulty: "easy"
        }
      ]
    },
    flashcards: [
      {
        id: "pfc1",
        front: "Overall Chemical Formula for Photosynthesis",
        back: "6 CO2 + 6 H2O + Light Energy -> C6H12O6 + 6 O2",
        category: "Chemistry"
      },
      {
        id: "pfc2",
        front: "What is the function of Photosystem II?",
        back: "Absorbs photons, excites electrons, and splits water molecules into oxygen, protons, and electrons.",
        category: "Light Reactions"
      },
      {
        id: "pfc3",
        front: "What does RuBisCO do?",
        back: "It fixes atmospheric inorganic CO2 into organic carbon molecules during the Calvin cycle in the stroma.",
        category: "Calvin Cycle"
      },
      {
        id: "pfc4",
        front: "Thylakoid vs Stroma",
        back: "Thylakoid: membrane discs where light reactions occur. Stroma: surrounding fluid where Calvin cycle occurs.",
        category: "Anatomy"
      }
    ]
  },

  'demo-neural-networks': {
    id: 'demo-neural-networks',
    url: 'https://www.youtube.com/watch?v=aircAruvnKk',
    title: '3Blue1Brown: But what is a neural network? Deep learning, chapter 1',
    author: '3Blue1Brown',
    thumbnailUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&auto=format&fit=crop&q=80',
    duration: '19:13',
    durationSeconds: 1153,
    transcript: [
      { text: "This is a 3, it's roughly 28 by 28 pixels, but your brain recognizes it instantly without any effort.", start: 0, duration: 10 },
      { text: "If I asked you to write a traditional computer program with if-statements to recognize handwritten digits, it is notoriously hard.", start: 10, duration: 14 },
      { text: "A multilayer perceptron takes in 784 pixel grayscale values as activations in an input layer.", start: 24, duration: 16 },
      { text: "Each neuron holds a number called an activation, typically between 0 and 1.", start: 40, duration: 12 },
      { text: "Information propagates forward across hidden layers to an output layer containing 10 neurons, one for each digit 0 through 9.", start: 52, duration: 18 },
      { text: "Every connection between two neurons has an associated weight indicating how positive or negative the connection is.", start: 70, duration: 15 },
      { text: "To compute the next neuron's activation, we compute the weighted sum of all incoming activations plus a bias.", start: 85, duration: 16 },
      { text: "Then we pass this sum through an activation function, historically the sigmoid function, or modernly ReLU.", start: 101, duration: 16 },
      { text: "Learning in a neural network means finding the optimal combination of thousands of weights and biases using gradient descent.", start: 117, duration: 20 }
    ],
    summary: {
      shortSummary: "Grant Sanderson of 3Blue1Brown introduces deep learning by deconstructing how a multilayer perceptron identifies handwritten digits (MNIST) through weighted sums, biases, activation functions, and layer transformations.",
      detailedSummary: "The video presents neural networks not as magical black boxes, but as geometric mathematical functions that map high-dimensional input spaces (such as 784-dimensional pixel arrays) into structured probability vectors. Sanderson walks through an architecture with 784 input neurons, two hidden layers of 16 neurons each, and an output layer of 10 neurons. He explains how each neuron's activation is calculated as the dot product of previous layer activations and incoming weights, offset by a bias, and compressed through a non-linear activation function like Sigmoid or ReLU. The network learns by tuning these parameters via backpropagation and gradient descent on a cost function.",
      keyPoints: [
        "A neuron in a neural network is simply a holding vessel for a real number called its activation.",
        "Input layer: 28x28 grid = 784 neurons representing pixel brightness from 0.0 (black) to 1.0 (white).",
        "Weights specify the sensitivity and polarity between connected neurons; positive weights reinforce while negative weights suppress.",
        "Biases set the threshold determining how active the neuron must be before its activation turns meaningful.",
        "Activation functions (Sigmoid $\\sigma(x)$, ReLU $\\max(0, x)$) introduce non-linearity, allowing networks to approximate arbitrary functions.",
        "The complete network is essentially a massive parameter matrix with over 13,000 tunable knobs."
      ],
      studyNotes: `# 3Blue1Brown: Mathematics of Deep Neural Networks

## 1. Network Architecture (MNIST Benchmark)
* **Input Layer**: $28 \\times 28 = 784$ neurons (grayscale values $a \\in [0, 1]$).
* **Hidden Layers**: Two intermediate layers with 16 neurons each.
* **Output Layer**: 10 neurons corresponding to digits $[0, 9]$. Highest activation indicates the prediction.

## 2. Mathematical Neuron Equation
For neuron $j$ in layer $l$:
$$a_j^{(l)} = \\sigma \\left( \\sum_{k} w_{jk}^{(l)} a_k^{(l-1)} + b_j^{(l)} \\right)$$

* $w_{jk}^{(l)}$: Weight connecting neuron $k$ in layer $l-1$ to neuron $j$ in layer $l$.
* $b_j^{(l)}$: Bias for neuron $j$ in layer $l$.
* $\\sigma(z)$: Activation function (e.g. Sigmoid $\\frac{1}{1 + e^{-z}}$ or ReLU $\\max(0, z)$).

## 3. Matrix Representation
$$\\mathbf{a}^{(l)} = \\sigma \\left( \\mathbf{W}^{(l)} \\mathbf{a}^{(l-1)} + \\mathbf{b}^{(l)} \\right)$$

## 4. Concept of Layer Abstraction
* **Layer 1**: Individual pixels.
* **Layer 2**: Edges, loops, horizontal bars.
* **Layer 3**: Combinations of loops and stems (e.g., top loop of 8, vertical stroke of 1).
* **Layer 4**: Final digit classification decision.
`,
      importantDefinitions: [
        {
          term: "Neuron Activation",
          definition: "A scalar value held by an artificial neuron, usually representing normalized intensity or confidence.",
          simpleExplanation: "A number between 0 and 1 showing how 'excited' or lit up the neuron is."
        },
        {
          term: "Weight",
          definition: "A tunable numerical parameter that scales the strength and sign of connection between two neurons.",
          simpleExplanation: "A knob that controls how much one neuron listens to another."
        },
        {
          term: "Bias",
          definition: "An additive parameter that shifts the activation threshold of a neuron before passing it into an activation function.",
          simpleExplanation: "A threshold indicating how high the total signal must be before the neuron fires."
        },
        {
          term: "Activation Function",
          definition: "A non-linear mathematical operation applied to the weighted sum of inputs (e.g., Sigmoid, ReLU).",
          simpleExplanation: "A mathematical filter that squashes large numbers and gives the network the ability to learn complex curved shapes."
        }
      ],
      keyTakeaways: [
        "Neural networks do not 'think' like humans; they evaluate high-dimensional matrix products and vector additions.",
        "Non-linear activation functions are mandatory; stacking linear operations without them collapses back into a single linear matrix.",
        "Machine learning is optimization: finding weights and biases that minimize output classification error."
      ],
      chapters: [
        { title: "Introduction & MNIST Handwritten Digits", timestamp: "00:00", seconds: 0, summary: "The challenge of image recognition for traditional code." },
        { title: "Neurons and Activations", timestamp: "00:40", seconds: 40, summary: "Definition of neuron activations and layer architecture." },
        { title: "Weights, Biases, and Formulas", timestamp: "01:10", seconds: 70, summary: "Dot products, incoming weights, and bias offsets." },
        { title: "Sigmoid and ReLU Activation Functions", timestamp: "01:41", seconds: 101, summary: "Why non-linearity is essential for deep architectures." }
      ],
      language: "en"
    },
    quiz: {
      title: "Neural Networks Deep Dive Quiz",
      difficulty: "hard",
      questions: [
        {
          id: "nn1",
          type: "mcq",
          question: "For a 28x28 pixel grayscale image input, how many neurons must the input layer contain?",
          options: ["28 neurons", "280 neurons", "784 neurons", "1024 neurons"],
          correctAnswer: "784 neurons",
          explanation: "28 rows multiplied by 28 columns equals 784 discrete pixel values, requiring 784 input activations.",
          difficulty: "easy"
        },
        {
          id: "nn2",
          type: "mcq",
          question: "Why are non-linear activation functions like Sigmoid or ReLU necessary in deep neural networks?",
          options: [
            "They make the computations run faster on GPUs",
            "Without non-linearities, any number of stacked layers collapses into a single trivial linear transformation",
            "They prevent the weights from becoming negative numbers",
            "They guarantee 100% accuracy on training data"
          ],
          correctAnswer: "Without non-linearities, any number of stacked layers collapses into a single trivial linear transformation",
          explanation: "The composition of linear functions is always just another linear function. Non-linear activation functions allow networks to approximate arbitrary non-linear boundaries.",
          difficulty: "hard"
        },
        {
          id: "nn3",
          type: "true_false",
          question: "True or False: A negative weight between neuron A and neuron B means high activation in A will decrease the activation in B.",
          options: ["True", "False"],
          correctAnswer: "True",
          explanation: "Weights act as multipliers. A negative weight multiplies a positive activation into a negative value, suppressing the receiving neuron's sum.",
          difficulty: "medium"
        },
        {
          id: "nn4",
          type: "mcq",
          question: "In the expression a = σ(w·x + b), what role does the parameter 'b' (bias) play?",
          options: [
            "It scales the learning rate",
            "It sets an offset or threshold for how active the incoming inputs must be before the neuron fires",
            "It divides the gradient during backpropagation",
            "It specifies how many hidden layers exist"
          ],
          correctAnswer: "It sets an offset or threshold for how active the incoming inputs must be before the neuron fires",
          explanation: "Bias shifts the activation function along the input axis, determining how high the weighted sum must be to produce meaningful output.",
          difficulty: "medium"
        },
        {
          id: "nn5",
          type: "short_answer",
          question: "What algorithm is used to iteratively adjust weights and biases in the direction of steepest error reduction?",
          options: ["Gradient Descent", "Binary Search", "Dijkstra's Algorithm", "Quicksort"],
          correctAnswer: "Gradient Descent",
          explanation: "Gradient descent computes the gradient of the cost function with respect to every weight and bias and steps downhill towards the minimum error.",
          difficulty: "medium"
        }
      ]
    },
    flashcards: [
      {
        id: "nnfc1",
        front: "What is an Artificial Neuron Activation?",
        back: "A numerical value (typically between 0 and 1) representing the degree of stimulation or feature presence in that unit.",
        category: "Architecture"
      },
      {
        id: "nnfc2",
        front: "Formula for a Layer's Activations",
        back: "a^(l) = σ( W^(l) · a^(l-1) + b^(l) ), where σ is the non-linear activation function.",
        category: "Mathematics"
      },
      {
        id: "nnfc3",
        front: "Role of the Bias Parameter",
        back: "Shifts the activation curve horizontally, controlling the baseline excitation threshold required for firing.",
        category: "Parameters"
      },
      {
        id: "nnfc4",
        front: "Why is ReLU (Rectified Linear Unit) popular?",
        back: "ReLU is max(0, z). It prevents vanishing gradients in deep networks and is computationally very fast to evaluate.",
        category: "Activation Functions"
      }
    ]
  }
};
