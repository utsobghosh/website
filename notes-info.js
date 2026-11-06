/* notes-info.js : text shown at the top of the PDF viewer (Notes), e.g. syllabus topics. Loaded by notes.js by itself (nothing to add in index.html).
   ===== HOW TO ADD / CHANGE (instructions for Claude / future me) =====
   One block per subject (Law and Math use the same layout: one block, headings with items under them). keys = words searched in the note's file path (case-insensitive, whole words, same rule as the categories in notes.js).
   Every note whose path matches a block shows that block's text at the top of its viewer (folded to 2 lines, tap the arrow to open fully).
   - Whole subject:      keys:["law"]               -> all notes with "law" in the name/folder
   - One particular file: keys:["khata 2.1"]         -> only notes with that in the name
   - Several matches are all shown (stacked).
   Items: plain text  "Some topic"   OR   a heading with items under it  {t:"Heading",sub:["item 1","item 2",{t:"Sub-heading",sub:["..."]}]}
   (sub can nest as deep as needed; each level has its own colour). Upload notes.js and this file to the website after editing. */
window.NOTES_INFO=[
 {keys:["law"],title:"Law topics",items:[
  {t:"Exam questions",sub:[
   "ACM Code of Ethics থেকে ১টা প্রশ্ন",
   "Pornography Control Act থেকে ১টা প্রশ্ন",
   "Right to Information Act থেকে দুইটা প্রশ্ন — যার একটা হবে theory, আরেকটা problematic",
   "Introduction to Intellectual Property থেকে ১০ মার্ক",
   "Copyright Act 2023 and Patent থেকে ১০ মার্ক"
  ]}
 ]},
 {keys:["math"],title:"Math topics",items:[
  {t:"Exam sets",sub:[
   "Set 1 – Plane",
   "Set 2 – System solution and error finding",
   "Set 3 – Linear combination, dependency and independency",
   "Set 4 – Iterative method",
   "Set 5 – Eigenvalue and eigenvector"
  ]},
  {t:"Plane",sub:[
   "10 টা ফরমুলার ম্যাথ"
  ]},
  {t:"System solution",sub:[
   "Inversion algorithm (inverse matrix)",
   {t:"Cramer's rule",sub:[
    {t:"(D = 0)",sub:[
     "inconsistent (infinite solution)"
    ]},
    {t:"(D ≠ 0)",sub:[
     "consistent (unique solution)",
     "trivial solution (x = y = z = 0)"
    ]}
   ]},
   {t:"Gaussian elimination method",sub:[
    "no solution",
    "exactly one solution",
    "infinitely many solutions"
   ]}
  ]},
  {t:"Error finding",sub:[
   "Least squares solution",
   "Least squares error vector",
   "Least squares error"
  ]},
  {t:"Linear combination, linear dependence and independence"},
  {t:"Iterative method",sub:[
   "1. Jacobi",
   "2. Gauss-Seidel"
  ]},
  {t:"Eigenvalue and eigenvector",sub:[
   {t:"Cayley-Hamilton theorem (CHT)",sub:[
    "CHT এর theorem exam এ আসবে"
   ]},
   "Characteristic matrix",
   "Characteristic polynomial",
   "Characteristic equation",
   "Find matrix that diagonalizes A"
  ]}
 ]}
];