/* notes-info.js : text shown at the top of the PDF viewer (Notes), e.g. syllabus topics. Loaded by notes.js by itself (nothing to add in index.html).
   ===== HOW TO ADD / CHANGE (instructions for Claude / future me) =====
   One block per subject (Law and Math use the same layout: one block, headings with items under them). keys = words searched in the note's file path (case-insensitive, whole words, same rule as the categories in notes.js).
   Every note whose path matches a block shows that block's text at the top of its viewer (folded to 2 lines, tap the arrow to open fully).
   - Whole subject:      keys:["law"]               -> all notes with "law" in the name/folder
   - One particular file: keys:["khata 2.1"]         -> only notes with that in the name
   - Several matches are all shown (stacked).
   Items: plain text  "Some topic"   OR   a heading with items under it  {t:"Heading",sub:["item 1","item 2",{t:"Sub-heading",sub:["..."]}]}
   (sub can nest as deep as needed; each level has its own colour). Upload notes.js and this file to the website after editing.
   QUIZ (the bear's study quiz): the bear already makes questions by itself from the headings (asks what is under a heading) and from tables (asks the value).
   To add your own questions to a block: quiz:[["Question?","Answer"],["Question 2?","Answer 2"]]  (the bear asks from the subject that is open). */
window.NOTES_INFO=[
 {keys:["law"],title:"Law topics",quiz:[["Copyright protects what?","Original creative works (writing, art, music, software)"],["Patent protects what?","Inventions (new, useful, and not obvious)"]],items:[
  {t:"Exam questions",sub:[
   "ACM Code of Ethics থেকে ১টা প্রশ্ন",
   "Pornography Control Act থেকে ১টা প্রশ্ন",
   "Right to Information Act থেকে দুইটা প্রশ্ন — যার একটা হবে theory, আরেকটা problematic",
   "Introduction to Intellectual Property থেকে ১০ মার্ক",
   "Copyright Act 2023 and Patent থেকে ১০ মার্ক"
  ]}
 ]},
 {keys:["math"],btn:"Math topics",title:"Math exam sets",items:[
   "Set 1 – Plane",
   "Set 2 – System solution and error finding",
   "Set 3 – Linear combination, dependency and independency",
   "Set 4 – Iterative method",
   "Set 5 – Eigenvalue and eigenvector"
 ]},
 {keys:["math"],title:"Math topics",quiz:[["Cramer's rule: D ≠ 0 means?","A unique solution (consistent)"],["Cramer's rule: D = 0 means?","No unique solution, so Cramer's rule cannot be used"],["Cayley-Hamilton theorem says?","Every square matrix satisfies its own characteristic equation"],["Characteristic equation of A?","det(A − λI) = 0"],["Jacobi vs Gauss-Seidel: which uses the newest values immediately?","Gauss-Seidel"],["Diagonalizing A with eigenvector matrix P?","D = P⁻¹ A P (columns of P are the eigenvectors)"],["Least squares solution of Ax = b solves?","AᵀA x = Aᵀb (the normal equations)"]],items:[
  {t:"Plane",sub:["10 টা ফরমুলার ম্যাথ"]},
  {t:"System solution",sub:[
   "Inversion algorithm (inverse matrix)",
   {t:"Cramer's rule",sub:[
    {t:"(D = 0)",sub:["inconsistent (infinite solution)"]},
    {t:"(D ≠ 0)",sub:["consistent (unique solution)","trivial solution (x = y = z = 0)"]}
   ]},
   {t:"Gaussian elimination method",sub:["no solution","exactly one solution","infinitely many solutions"]}
  ]},
  {t:"Error finding",sub:["Least squares solution","Least squares error vector","Least squares error"]},
  {t:"Linear combination, linear dependence and independence"},
  {t:"Iterative method",sub:["1. Jacobi","2. Gauss-Seidel"]},
  {t:"Eigenvalue and eigenvector",sub:[
   {t:"Cayley-Hamilton theorem (CHT)",sub:["CHT এর theorem exam এ আসবে"]},
   "Characteristic matrix",
   "Characteristic polynomial",
   "Characteristic equation",
   "Find matrix that diagonalizes A"
  ]}
 ]},
 {keys:["eee"],title:"EEE topics",quiz:[["Transformer turns ratio?","N1/N2 = V1/V2 (= I2/I1)"],["Open circuit test of a transformer gives which loss?","Core (iron) loss"],["Short circuit test of a transformer gives which loss?","Copper loss"],["Inverting op-amp gain?","−Rf / Rin"],["Non-inverting op-amp gain?","1 + Rf / R1"],["CMOS = ?","NMOS + PMOS (complementary)"],["Integrator output is the ... of the input?","Integral (square wave in, triangle wave out)"],["Differentiator output is the ... of the input?","Derivative (rate of change)"]],items:[
  {t:"BJT (Bipolar Junction Transistor)",sub:["RTL (Resistor-Transistor Logic)","DTL (Diode-Transistor Logic)","TTL (Transistor-Transistor Logic)"]},
  {t:"MOSFET (Metal-Oxide-Semiconductor Field-Effect Transistor)",sub:["NMOS (N-type MOS)","PMOS (P-type MOS)","CMOS (Complementary MOS = NMOS + PMOS)"]},
  {t:"Transformer",sub:[
   "Turns ratio",
   "Core, copper loss",
   "Short circuit test",
   "Open circuit test",
   "Equivalent circuit",
   "etc"
  ]},
  "DC generator",
  "DC motor",
  {t:"Operational amplifier (Op-amp)",sub:[
   "Inverting",
   "Non-inverting",
   "Inverting summing",
   "Differentiator",
   "Integrator"
  ]}
 ]},
 {keys:["oop","java"],title:"OOP topics",quiz:[["Multiple and hybrid inheritance with classes: allowed in Java?","No"],["Which access modifier allows only the class itself?","private"],["Same method name, different parameters?","Overloading"],["Rewriting the parent's method in the child?","Overriding"],["Which keyword refers to the parent class?","super"],["Which keyword refers to the current object?","this"],["Java passes primitives by ...?","Value (a copy is passed)"],["Static members belong to ...?","The class, not to any one object"],["Which block always runs after try / catch?","finally"],["Which one has the compiler (javac): JDK or JRE?","JDK"]],items:[
  {t:"Topics",sub:[
   "Basics (print, scan, array etc)",
   "Class and object",
   "Array of object",
   "Static",
   {t:"Inheritance (5 প্রকার)",sub:[
    "Single",
    "Multi level",
    "Hierarchical",
    "Multiple (not in Java)",
    "Hybrid (not in Java)"
   ]},
   "Package",
   {t:"Encapsulation",sub:[
    "public (every class has access)",
    "protected (subclass / same package)",
    "default (any class in same package)",
    "private (only class itself has access)"
   ]},
   {t:"Polymorphism",sub:[
    {t:"Overriding",sub:["Parent's method rewriting"]},
    {t:"Overloading",sub:["Same name, different parameter"]},
    {t:"Subclass polymorphism",sub:["Type casting into parent"]}
   ]},
   "Abstract class",
   "Framework",
   "Generic class",
   "Try exception (try, catch, finally, throw, throws, user defined exception)"
  ]},
  {t:"Subtopics (যা পড়াইছিল)",sub:[
   "JRE, JDK",
   "Constructor",
   "keyword \"this\"",
   "keyword \"super\"",
   "Scope and lifetime of variable",
   {t:"Parameter passing",sub:["Pass by value","Pass by reference"]},
   "Instance variable/method",
   "Static variable/method ⭐",
   "toString()"
  ]}
 ]},
 {keys:["dsa"],title:"DSA overview",items:[
  "Search (linear, binary) · Sort (bubble, insertion, selection, counting) · Stack · Queue (linear, circular) · Linked list (singly, doubly) · Heap (heapify, heap sort) · BST · Huffman · Graph (BFS, DFS)"
 ]},
 {keys:["dsa"],title:"DSA topics",quiz:[["Stack follows which order?","LIFO (last in, first out)"],["Queue follows which order?","FIFO (first in, first out)"],["Which sort does not compare elements?","Counting sort"],["Inorder traversal of a BST gives?","Sorted (ascending) order"],["Huffman code: fixed or variable length?","Variable length (lossless compression)"],["BFS uses which data structure?","Queue"],["DFS (iterative) uses which data structure?","Stack"],["Binary search needs what kind of array?","A sorted array"],["Insert at the head of a singly linked list?","O(1)"]],items:[
  "Complexity calculation from equation",
  "Search (linear, binary)",
  "Sort (bubble, insertion, selection, counting)",
  "Stack → arithmetic expression",
  "Queue (linear, circular)",
  "Linked list (singly, doubly)",
  "Heap, heapify, heap sort",
  {t:"Binary search tree (BST)",sub:[
   "Most balanced",
   "Least balanced (skewed tree)"
  ]},
  "BST sort (inorder traverse)",
  "Inorder successor",
  {t:"Huffman algorithm",sub:[
   {t:"Can be recognized by",sub:[
    "Variable length code",
    "Lossless compression"
   ]}
  ]},
  "Fixed length code (বেশি কিছু না, log₂ length দিয়ে একটু হিসাব করা)",
  {t:"Graph",sub:[
   "Dense graph, sparse graph",
   "Adjacency list, adjacency matrix"
  ]},
  {t:"Graph traversal",sub:[
   "Breadth first search (BFS)",
   "Depth first search (DFS)"
  ]}
 ]},
 {keys:["dsa"],tab:"cx",title:"Time complexity",note:"Worst case. BST: average and worst. n = items, k = range, V = vertices, E = edges.",table:[
  ["Linear search","O(n)"],
  ["Binary search","O(log₂ n)"],
  ["Bubble / insertion / selection sort","O(n²)"],
  ["Counting sort","O(n + k)"],
  ["Heap sort","O(n log₂ n)"],
  ["Stack, queue","O(1)"],
  ["Linked list search","O(n)"],
  ["Heap insert / delete","O(log₂ n)"],
  ["BST search / insert / delete","Average: O(log₂ n), Worst: O(n)"],
  ["BST sort (inorder traversal)","Average: O(n log₂ n), Worst: O(n²)"],
  ["Huffman","O(n log₂ n)"],
  ["BFS, DFS","O(V + E)"]
 ]}
];