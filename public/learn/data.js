window.SAT=[
{id:"rw",name:"Reading and Writing",facts:"54 questions · 64 minutes · 2 modules",domains:[
{id:"ii",name:"Information and Ideas",pct:"about 26%",desc:"Understanding what a text says and what it proves.",skills:[
["ci","Central Ideas and Details","Finding the main point of a text and the facts that support it."],
["inf","Inferences","Completing a text with the conclusion that the evidence supports."],
["ce","Command of Evidence","Choosing the quote, or the data in a table or graph, that supports or weakens a claim."]]},
{id:"cs",name:"Craft and Structure",pct:"about 28%",desc:"How words and texts are built and why the author wrote them.",skills:[
["wic","Words in Context","Choosing the word that fits the meaning and tone of a sentence."],
["tsp","Text Structure and Purpose","Seeing why an author wrote a passage, or a part of it, and how it is built."],
["ctc","Cross-Text Connections","Seeing how two short texts relate: agree, disagree or respond to each other."]]},
{id:"ei",name:"Expression of Ideas",pct:"about 20%",desc:"Making writing clear, organised and effective.",skills:[
["rs","Rhetorical Synthesis","Using a list of notes to write a sentence that meets a stated goal."],
["tr","Transitions","Choosing the word or phrase that links two ideas logically."]]},
{id:"sec",name:"Standard English Conventions",pct:"about 26%",desc:"The grammar and punctuation rules of formal English.",skills:[
["bd","Boundaries","Punctuation that joins or separates sentences and parts of sentences."],
["fss","Form, Structure, and Sense","Verb tense, subject–verb agreement, pronouns, plurals and modifiers."]]}]},
{id:"m",name:"Math",facts:"44 questions · 70 minutes · 2 modules",domains:[
{id:"alg",name:"Algebra",pct:"about 35%",desc:"Lines, equations and systems: the engine of the Math section.",skills:[
["le1","Linear equations in one variable","Solving equations with one unknown, including no solution and infinitely many."],
["lf","Linear functions","Slope, intercepts and what each number means in a real situation."],
["le2","Linear equations in two variables","Writing and reading equations of lines with x and y."],
["sys","Systems of two linear equations","Finding where two lines meet, or how many solutions they have."],
["li","Linear inequalities","Solving and graphing inequalities in one or two variables."]]},
{id:"adv",name:"Advanced Math",pct:"about 35%",desc:"Curves, powers and expressions.",skills:[
["nf","Nonlinear functions","Quadratic, exponential and other curves: reading and building them."],
["ne","Nonlinear equations and systems","Solving equations with squares, and lines meeting curves."],
["eq","Equivalent expressions","Rewriting an expression in a different but equal form."]]},
{id:"psda",name:"Problem-Solving and Data Analysis",pct:"about 15%",desc:"Numbers in real life: rates, percents and data.",skills:[
["rr","Ratios, rates and units","Proportions, speed, density and converting units."],
["pc","Percentages","Percent of, percent change and combined percents."],
["od","One-variable data","Mean, median, range and spread of a data set."],
["td","Two-variable data","Scatterplots and lines of best fit."],
["pr","Probability","The chance of events, including conditional probability from tables."],
["inf2","Inference from samples","What a sample can and cannot tell us, and margin of error."],
["cl","Evaluating statistical claims","Judging whether a study supports its conclusion."]]},
{id:"geo",name:"Geometry and Trigonometry",pct:"about 15%",desc:"Shapes, angles and right triangles.",skills:[
["av","Area and volume","Formulas for shapes and solids."],
["lat","Lines, angles and triangles","Angle rules, similar and congruent triangles."],
["rt","Right triangles and trigonometry","Pythagoras, special triangles, sine, cosine and tangent."],
["circ","Circles","Arcs, sectors, radius and the circle equation."]]}]}];
window.DEEP={
wic:{subs:[["Fill in the missing word","A short text with one word missing. You choose the word that completes it best."],["Precise meaning","A word you already know that has more than one meaning. The text decides which one is used."],["Tone and strength","Two choices mean nearly the same, but one is too strong or too weak for what the author describes."]],
codes:[
{t:"Cover the choices, then guess the word",start:"The sentence that contains the blank.",stop:"The full stop at the end of that sentence.",skip:"The answer choices, until you have your own word. The rest of the passage.",why:"The clue is nearly always inside that one sentence. Guessing first protects you from tempting wrong words."},
{t:"Find the direction word",start:"The words just before and after the blank: but, although, because, so, not only.",stop:"At the end of the clause that holds the clue.",skip:"The opening of the passage.",why:"A direction word tells you if the missing word agrees with the nearby idea or opposes it."},
{t:"Read one sentence back only when you must",start:"One sentence before the blank, only if the blank sentence makes no sense alone.",stop:"The end of the blank sentence.",skip:"Everything further back.",why:"The SAT rarely hides the clue more than one sentence away. Reading more only costs time."},
{t:"Plug each choice in and read the whole sentence",start:"The start of the sentence with your choice in the blank.",stop:"The end of that sentence.",skip:"Choices you already crossed out with a reason.",why:"A word can sound right alone and still break the sentence."},
{t:"Test the second meaning",start:"The blank sentence again.",stop:"Its end.",skip:"Nothing else.",why:"If an easy word looks odd, check its less common meaning. The SAT likes words like “reserved” or “bear”."},
{t:"Match the strength",start:"The words describing how big, bad or good the thing is.",stop:"After the describing words.",skip:"Choices much stronger or weaker than those words.",why:"“Devastating” does not fit a small problem. Two similar words are separated by strength."}]},
ci:{subs:[["Main idea","What the whole passage is mostly about, in one sentence that covers its beginning, middle and end."],["Supporting detail","A specific fact the text states directly. The question tells you where to look."],["Best summary","Which choice best states the passage’s main point or what the writer or character did."]],
codes:[
{t:"Read the question first",start:"The question line, then the passage.",stop:"When you know whether you are hunting for a big idea or a small fact.",skip:"Reading the passage with no goal.",why:"Reading with a goal is faster and you remember the right things."},
{t:"Main idea: start and end",start:"The first sentence, then the last sentence.",stop:"When you can say the point in about eight words.",skip:"The examples, numbers and names in the middle until you need to confirm.",why:"Short passages state the claim at the edges. The middle usually supports it."},
{t:"Watch the turn word",start:"The sentence with but, however, yet or although.",stop:"At the end of that sentence.",skip:"The part before the turn, unless the question asks about it.",why:"The author’s real point usually comes after the turn."},
{t:"Detail question: go straight to the place",start:"The line or sentence the question names.",stop:"The end of the sentence that holds the answer.",skip:"The rest of the passage.",why:"Detail answers are stated in the text. They are not guessed."},
{t:"Remove the extremes",start:"The answer choices after you have the main idea.",stop:"When two choices remain.",skip:"Choices with always, never, only or completely.",why:"Wrong choices are too narrow (one detail), too broad (bigger than the text) or off the topic."},
{t:"Prove every word",start:"The one choice you like.",stop:"After you find its words in the passage.",skip:"Choices you cannot prove.",why:"If one word in the choice is not in the text, it is a trap."}]},
bd:{subs:[["Joining two complete sentences","Two groups of words that could each be a sentence. Join with a full stop, a semicolon, or a comma plus and, but, or, so."],["Introducing or explaining","A colon or dash that comes after a complete sentence to introduce a list, an example or an explanation."],["Extra information","Words that can be removed without breaking the sentence. They need a matching pair of commas, dashes or brackets."],["Punctuation that does not belong","A comma between the subject and its verb, or between a verb and its object."]],
codes:[
{t:"Read only one sentence",start:"The beginning of the sentence that holds the underlined part.",stop:"The full stop at its end.",skip:"Every other sentence.",why:"Punctuation depends on the structure of this sentence only."},
{t:"Cover one side and test",start:"Cover everything on one side of the punctuation.",stop:"Check the other side, then swap.",skip:"The sound of the sentence. Do not choose by where you would pause.",why:"If both sides can stand alone, you need a full stop, a semicolon, or a comma plus a joining word."},
{t:"A comma alone cannot join two sentences",start:"The punctuation mark in the choices.",stop:"Check what each side is.",skip:"Choices that use only a comma between two complete sentences.",why:"This is called a comma splice. The SAT counts it as an error every time."},
{t:"Colon needs a complete sentence before it",start:"The words just before the colon or dash.",stop:"At the colon.",skip:"What comes after it.",why:"What follows can be a list or a phrase. What comes before must be able to stand alone."},
{t:"Extra information uses a matching pair",start:"The opening mark of the extra words.",stop:"The closing mark.",skip:"Mixing types, like a dash at the start and a comma at the end.",why:"Take the extra words out. If the sentence still works, the pair is correct."},
{t:"No comma between subject and verb",start:"The subject of the sentence.",stop:"The verb that goes with it.",skip:"Choices that put one comma between them.",why:"A single comma never separates a subject from its verb."}]},
sys:{subs:[["Solve for a value","Find x, y, or something like x + y that is made from both."],["Number of solutions","Decide if the lines cross once (one solution), never (none) or are the same line (infinitely many)."],["Word problems","Turn a story into two equations, usually a total count and a total value."],["Graph reading","Read the point where two lines cross on a graph or table."]],
codes:[
{t:"Read the last sentence first",start:"The last sentence, to see exactly what they ask for.",stop:"After underlining it (x? y? x + y?).",skip:"The numbers in the story, until you know what you need.",why:"Many answers are not x or y alone. Knowing the target saves a whole step."},
{t:"Ask for x + y? Add them",start:"Both equations, lined up.",stop:"When you have added them and divided.",skip:"Solving for x or y separately.",why:"Adding the equations gives the sum directly. It is the fastest path."},
{t:"Use Desmos",start:"Type both equations into Desmos.",stop:"At the point where the lines cross.",skip:"All the algebra.",why:"It takes about twenty seconds and removes arithmetic mistakes."},
{t:"Same slope? Count the solutions",start:"The numbers in front of x and y in each equation.",stop:"After comparing them as a ratio.",skip:"Solving the system.",why:"Same ratio but different constants means no solution. Same ratio and same constant means infinitely many."},
{t:"Word problem: name the letters first",start:"The nouns and the prices or counts in the story.",stop:"When you have two equations: one total count and one total value.",skip:"Story decoration that has no number.",why:"Write “x = adult tickets, y = child tickets” before anything else. It prevents swapping them."},
{t:"Line up before you subtract",start:"The coefficients of one variable.",stop:"When they match or are opposite.",skip:"Cross-multiplying everything.",why:"Multiply one whole equation so a variable cancels."},
{t:"Check in the other equation",start:"Your answer.",stop:"After plugging it into the equation you did not use.",skip:"Re-solving.",why:"If it works in both, it is right."}]}
};
