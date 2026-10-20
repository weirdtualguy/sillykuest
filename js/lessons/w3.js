/* World 3: First Covenants: declarations, singleton, modes, state, templates, security. */
(function () {
  var SK = window.SK;

  SK.addLesson({
    id: '3-1', title: 'Your first covenant: the counter', min: 6,
    blurb: 'A covenant with memory that may only count up by exactly one.',
    steps: [
      { t: 'say', m: 'hi', x: 'Time to build a covenant with memory: a **counter** that goes up by exactly one every time it’s spent.\n\nIt’s the “hello world” of covenants.' },
      { t: 'code', ex: 'counter', x: 'Read it first. Tap each line.',
        pro: { h: 'verification mode', x: 'Because `bump` returns nothing, it runs in verification mode: the spender proposes `new_state` and your rule only validates it. Return a value instead and you get transition mode (lesson 3.3).' } },
      { t: 'widget', w: 'fingerprint', propose: true, gate: true, x: 'You are the spender now. Propose a next count. The covenant decides whether to accept it.' },
      { t: 'reveal', id: 'state-field', term: 'State field', plain: 'A variable on the sticky note that may change from one envelope to the next.',
        x: 'In the counter, `int count = init_count;` declares one. `init_count` is only its starting value.' },
      { t: 'mc', b: 1, q: 'Who decides whether the proposed next state is acceptable?',
        opts: ['The covenant’s own rule (`require`) running in the script', 'The miners, case by case', 'The previous owner, by signing', 'Nobody: any next state is fine'], a: 0,
        why: 'The script validates the transition. If a `require` fails, the spend is rejected.' },
      { t: 'tf', b: 1, q: 'If `new_state.count` is `prev_state.count + 2`, the spend is accepted.', a: false,
        why: 'The rule says exactly plus one. Anything else fails the `require`.' },
      { t: 'fill', code: true, q: 'Complete the rule.', text: 'require(new_state.count == prev_state.count ___ 1);', chips: ['+', '-', '*', '=='], a: ['+'],
        why: 'The new count must be the old count plus one.' },
      { t: 'mc', q: 'In the counter, what is `State`?',
        opts: ['All the sticky-note fields of the contract, bundled together', 'The current state of the whole blockchain', 'A function name', 'The covenant ID'], a: 0,
        why: '`State` bundles the contract’s state fields. In the counter that is just `count`.' }
    ]
  });

  SK.addLesson({
    id: '3-2', title: 'The copy-paste rule', min: 6,
    blurb: 'Why a covenant must check the successor’s code, not just its state.',
    steps: [
      { t: 'say', m: 'oops', x: 'Here’s a trap. Suppose the counter checks “the next count is +1” but forgets to check what **code** the next envelope runs.\n\nA thief could create a next envelope with the right count and different code, code that lets them take the money.' },
      { t: 'say', m: 'think', x: 'So a covenant must also make sure the next envelope runs **the same code**.\n\nThink of the script as three slices: fixed code before the state, the **state** itself, and fixed code after. Only the middle may change.' },
      { t: 'widget', w: 'template', gate: true, x: 'Spend the counter, then try tampering with the code.' },
      { t: 'reveal', id: 'template-hash', term: 'Template hash', plain: 'A fingerprint of the code part only, ignoring the state in the middle.',
        x: 'If the next envelope’s template hash matches the expected one, it runs the same code. Only the state can differ.',
        pro: { h: 'how it is computed', x: '`template_hash = BLAKE3(len(prefix) || prefix || len(suffix) || suffix)`, with each length written as an 8-byte signed-magnitude script number.' } },
      { t: 'explore', x: 'Silverscript gives you built-in helpers for this. Tap to see them.', items: [
        { icon: 'check', h: 'validateOutputState(idx, newState)', x: 'Output `idx` must continue with the **same template** as this contract and carry exactly this new state.' },
        { icon: 'link', h: 'validateOutputStateWithTemplate(...)', x: 'Output `idx` uses a **different** template (prefix, suffix and hash) that you authenticate by its hash. Used when one covenant creates another.' },
        { icon: 'search', h: 'readInputState(idx)', x: 'Read the state of another input that uses the same template.' }
      ] },
      { t: 'mc', b: 1, q: 'Why check the template hash of a successor?',
        opts: ['To be sure the next envelope runs the expected code, not a lookalike', 'To make the transaction cheaper', 'To change the covenant ID', 'To speed up block creation'], a: 0,
        why: 'The hash authenticates the code part. A lookalike with different code would not match.' },
      { t: 'tf', b: 1, q: 'If an output “looks right”, that is good enough validation.', a: false,
        why: 'Never trust an output because it looks right. Validate its template and its state explicitly.' },
      { t: 'order', q: 'Put the script layout in order, left to right.', items: ['Template prefix (fixed code)', 'Runtime state (changes)', 'Template suffix (fixed code)'],
        why: '[prefix][state][suffix]. Only the state slice changes between envelopes.' },
      { t: 'mc', q: 'Two consecutive counter envelopes differ. What changed?',
        opts: ['Only the state slice in the middle', 'The prefix', 'The suffix', 'The template hash'], a: 0,
        why: 'The template hash covers prefix and suffix, which stay identical. Only the state changes.' }
    ]
  });

  SK.addLesson({
    id: '3-3', title: 'One family, one live envelope', min: 6,
    blurb: 'Singletons, and the two ways a rule can work: verify or transition.',
    steps: [
      { t: 'say', m: 'hi', x: 'Our counter used `#[covenant.singleton]`. A [[singleton]] covenant always has exactly **one live envelope** per family. Spend it and exactly one successor appears.\n\nLike passing a baton in a relay race.' },
      { t: 'compare', x: 'A rule can work in two ways.',
        a: { h: 'Verification mode', items: ['The spender **proposes** the new state', 'Your rule only **checks** it', 'The default when the function returns nothing'] },
        b: { h: 'Transition mode', items: ['Your rule **computes** the new state', 'It **returns** it', 'The default when the function returns something'] } },
      { t: 'code', ex: 'termination', x: 'A singleton in transition mode, with an exit door.' },
      { t: 'widget', w: 'singleton', gate: true, x: 'What may the rule return? Try the combinations.' },
      { t: 'mc', b: 1, q: 'In verification mode, who produces the new state?',
        opts: ['The spender proposes it and your rule validates it', 'Your rule computes it', 'The miner picks it', 'The covenant ID encodes it'], a: 0,
        why: 'Verification mode receives the proposed states as arguments. Transition mode is the one that computes and returns them.' },
      {"t":"build","b":1,"src":"termination","q":"With `termination = allowed`, the next states may be empty (the family ends) or hold exactly one successor. Write the check that allows only those two cases.","tokens":["require(","next_states.length","<=","1",");","==",">=","0"],"a":["require(","next_states.length","<=","1",");"],"why":"An empty list terminates the family and a one-item list continues it, so the length may be 0 or 1: `<= 1`. Two or more is never allowed for a singleton."},
      { t: 'tf', q: '`termination = allowed` can be used on any covenant declaration.', a: false,
        why: 'It is only valid on a singleton in transition mode. Elsewhere it is a compile error.' },
      { t: 'match', q: 'Match each case to its meaning.', pairs: [
        ['Function returns nothing', 'Verification mode'], ['Function returns a value', 'Transition mode'], ['Returns an empty list', 'Terminate the family'], ['Returns a one-item list', 'Continue with one successor']
      ], why: 'The shape of the return value decides the mode and the outcome.' }
    ]
  });

  SK.addLesson({
    id: '3-4', title: 'Challenge: build and debug', min: 7,
    blurb: 'Assemble the counter, then hunt two sneaky bugs.',
    steps: [
      { t: 'say', m: 'wow', x: 'Challenge time! You’ll build the counter from scrambled lines, then go bug hunting.\n\nNo timer. Take your time.' },
      {"t":"explore","x":"Before you start, three questions to ask of any rule. Bugs hide in the answers.","items":[{"icon":"envelope","h":"Which state does it look at?","x":"A rule sees `prev_state`, the old state, and `new_state`, the proposed one. A rule that checks the wrong one, or only the constructor value, works once and then gets stuck."},{"icon":"bolt","h":"How strict is the comparison?","x":"`==`, `>`, `>=` and `<=` look alike at a glance, so ask which values each one accepts. `>` lets a count jump. `>=` lets a split add up to too much. `<=` lets the sender in too early."},{"icon":"lock","h":"Whose key does it check?","x":"Every door should check the signature of the person it belongs to: the recipient’s key for `transfer`, the sender’s key for `reclaim`."}]},
      { t: 'order', b: 1, mono: true, q: 'Build the Counter. Put the lines in order.', items: [
        'pragma silverscript ^0.1.0;', 'contract Counter(int init_count) {', '    int count = init_count;', '    #[covenant.singleton]',
        '    function bump(State prev_state, State new_state) {', '        require(new_state.count == prev_state.count + 1);', '    }', '}'
      ], why: 'Header, contract, state field, declaration, function, rule, then close the function and the contract.' },
      { t: 'bug', b: 1, q: 'This counter must go up by exactly one. Tap the buggy line.', lines: [
        'contract Counter(int init_count) {', '    int count = init_count;', '    #[covenant.singleton]', '    function bump(State prev_state, State new_state) {',
        '        require(new_state.count > prev_state.count);', '    }', '}'
      ], bug: 4, fix: { opts: ['require(new_state.count == prev_state.count + 1);', 'require(new_state.count >= prev_state.count + 1);', 'require(new_state.count == prev_state.count);', 'require(new_state.count > prev_state.count + 1);'], a: 0 }, why: '`>` accepts any bigger number, so the count could jump from 1 to 1,000,000. The rule must say `== prev_state.count + 1`.' },
      { t: 'bug', b: 1, q: 'The sender should only be able to reclaim money **after** the deadline. Tap the line that breaks that.', lines: [
        'entry reclaim(sig senderSig) {', '    require(checkSig(senderSig, sender));', '    require(tx.time <= timeout);', '}'
      ], bug: 2, fix: { opts: ['require(tx.time >= timeout);', 'require(tx.time == timeout);', 'require(tx.time < timeout);', 'require(this.ageDaa >= timeout);'], a: 0 }, why: '`<=` lets the sender reclaim before the deadline, which defeats the timeout. It should be `>=`.' },
      { t: 'mc', q: 'Why does the counter use `==` instead of `>`?',
        opts: ['It must advance exactly one step at a time', '`>` is not allowed in Silverscript', '`==` is cheaper to run', '`>` only works on temporals'], a: 0,
        why: 'The promise is “plus one”. A looser check would let someone skip ahead.' },
      { t: 'mc', b: 1, q: 'A counter checks the new count but never checks the successor’s template. What can a thief do?',
        opts: ['Create a successor with the right count but different code', 'Change the covenant ID', 'Print new KAS', 'Nothing: the count rule is enough'], a: 0,
        why: 'Without the template check the next envelope could run any code. The state would look right while the money was stolen.' },
      { t: 'say', m: 'yay', x: 'You just built and debugged your first covenant.\n\nYou can now read a covenant with memory and spot the classic mistakes. That is most of the battle.' }
    ]
  });

  SK.addLesson({
    id: "3-5", title: "Fees and the compute budget in numbers", min: 7,
    blurb: "Count script units, size a budget, and see why a proof costs what it costs.",
    steps: [
      {"t":"say","m":"hi","x":"Every input is allowed a small amount of script work. How much more it may do is set by its **compute budget**, and you can count it exactly.\n\nLet’s do real arithmetic."},
      {"t":"reveal","id":"script-unit","term":"Script unit","plain":"A tiny piece of script work. Checking one signature costs 100,000 of them.","x":"Each input may spend `compute_budget * 10,000 + 9,999` script units."},
      {"t":"say","m":"think","x":"The allowance for one input is **budget × 10,000 + 9,999**. Here are some budgets and what they grant."},
      {"t":"table","cols":["compute_budget","Script units granted"],"rows":[["0","9,999"],["1","19,999"],["10","109,999"],["2,500","25,009,999"],["65,535","655,359,999"]],"pro":{"h":"Where the numbers come from","x":"1 compute_budget = 100 compute grams = 10,000 script units. The budget is a u16, so 65,535 is the most any input can be granted."}},
      {"t":"mc","b":1,"q":"How many script units does `compute_budget = 1` grant?","opts":["19,999","10,000","9,999","100,000"],"a":0,"why":"1 × 10,000 + 9,999 = 19,999."},
      {"t":"say","m":"calm","x":"What does work cost? These are the main prices."},
      {"t":"table","cols":["Operation","Script units"],"rows":[["One signature check","100,000"],["OpBlake2b hashing","2 per byte"],["OpBlake3 hashing","1 per byte"],["Newly pushed stack bytes","1 per byte"],["Groth16 proof (tag 0x20)","14,000,000 + 250,000 × (public inputs + 1)"],["STARK proof (tag 0x21)","25,000,000"]]},
      {"t":"say","m":"think","x":"To size a budget, add up the script units your script needs and call the total R. Then:\n\n**minimum budget = (R − 9,999) ÷ 10,000, rounded up, and never below 0.**"},
      {"t":"mc","b":1,"q":"A script needs exactly 20,000 script units. What is the smallest budget that covers it?","opts":["2","1","0","3"],"a":0,"why":"20,000 − 9,999 = 10,001. Divided by 10,000 that is 1.0001, which rounds up to 2. Budget 1 grants 19,999, one unit short."},
      {"t":"tf","b":1,"q":"A budget of 0 grants no script units at all.","a":false,"why":"Every input gets 9,999 free script units, so budget 0 still grants 9,999."},
      {"t":"say","m":"hi","x":"Example: a Counter spend. Assume a 300-byte redeem script that is hashed twice with BLAKE2b, plus 1,000 newly pushed bytes. These sizes are illustrative, not measured."},
      {"t":"table","cols":["Part","Script units"],"rows":[["Hash the script twice: 2 × 300 × 2","1,200"],["Push 1,000 bytes","1,000"],["Total R","2,200"],["Budget needed","0"]]},
      {"t":"mc","b":1,"q":"The Counter input needs about 2,200 script units. Which budget is enough?","opts":["0, because 9,999 are free","10","1,000","65,535"],"a":0,"why":"The free allowance already covers 2,200. A fee-paying input in the same transaction is budgeted on its own."},
      {"t":"say","m":"wow","x":"Proofs are priced the same way, just with much bigger numbers."},
      {"t":"explore","x":"Tap each proof to see the budget it needs.","items":[{"icon":"shield","h":"STARK (tag 0x21)","x":"25,000,000 script units, so a budget of 2,500, which grants 25,009,999."},{"icon":"lock","h":"Groth16 (tag 0x20)","x":"14,000,000 + 250,000 × (public inputs + 1). With 5 public inputs that is 15,500,000, so a budget of 1,550."},{"icon":"bolt","h":"Not the same as speed","x":"A STARK takes about 738 times as long as a signature check, yet in script units it costs 25,000,000 ÷ 100,000 = 250 signature checks. Script units are fixed consensus prices, not timings."}]},
      {"t":"mc","b":1,"q":"In script units, one STARK verification equals about how many signature checks?","opts":["250","738","134","25"],"a":0,"why":"25,000,000 ÷ 100,000 = 250. The 738 figure is a latency ratio, not a script-unit ratio."},
      {"t":"match","b":1,"q":"Match each budget to the script units it grants.","pairs":[["0","9,999"],["10","109,999"],["2,500","25,009,999"],["65,535","655,359,999"]],"why":"Each is budget × 10,000 + 9,999. The last is the biggest budget a u16 can hold."},
      {"t":"say","m":"think","x":"The budget is only one part of the fee. The fee is inputs minus outputs, and it must be at least **fee rate × mass**. The minimum rate is 1.0 sompi per gram, and the mass is the largest of three dimensions: transient, compute and storage.","pro":{"h":"The three kinds of mass","x":"Block space is limited, so every transaction has a **mass**. It is the **largest** of three costs: **transient** (how many bytes it sends), **compute** (how much script work it asks for) and **storage** (how much it grows the set of envelopes). Creating many tiny outputs can raise the storage mass."}},
      {"t":"explore","x":"Two transactions you will meet in the next lesson. The sizes are assumed.","items":[{"icon":"coin","h":"Deploy from one input","x":"Compute mass about 2,050, storage mass about 21,667. The larger one wins, so the fee is 21,667 sompi."},{"icon":"bolt","h":"Spend the covenant","x":"Compute mass about 2,230, storage mass 0. Compute wins, so the fee is 2,230 sompi."}],"pro":{"h":"A caveat","x":"These masses use assumed transaction sizes and the older size and output terms of compute mass, so treat them as the shape of the calculation, not exact fees."}},
      {"t":"mc","b":1,"q":"At a fee rate of 2.0 sompi per gram, a transaction of mass 2,230 pays how much?","opts":["4,460 sompi","2,230 sompi","1,115 sompi","22,300 sompi"],"a":0,"why":"Fee = rate × mass = 2.0 × 2,230 = 4,460: 2,230 mandatory plus 2,230 priority."}
    ]
  });

  SK.addLesson({
    id: "3-6", title: "Follow one transaction", min: 7,
    blurb: "Deploy a Counter, then spend it once, field by field.",
    steps: [
      {"t":"say","m":"hi","x":"Time to follow one covenant from birth to its first spend.\n\nEvery hash, id and key here is a made-up placeholder such as `H0` or `X`. The shapes are real."},
      {"t":"explore","x":"Meet the cast.","items":[{"icon":"coin","h":"Alice’s funding coin","x":"A plain key-locked envelope holding 200,000,000 sompi. It pays for the deploy."},{"icon":"shield","h":"The Counter","x":"`Counter(init_count = 0)` with one state field, `count`."},{"icon":"tree","h":"The Covenant ID, X","x":"A 32-byte family ID, created when the covenant is deployed."},{"icon":"coin","h":"A second coin","x":"100,000,000 sompi. It pays the fee for the first spend, so the covenant’s own value stays untouched."}]},
      {"t":"say","m":"think","x":"The state `count` is 8 bytes. Between generations only that middle slice of the [[redeem-script|redeem script]] changes."},
      {"t":"table","cols":["Generation","count","State bytes"],"rows":[["0 (deploy)","0","00 00 00 00 00 00 00 00"],["1 (after one bump)","1","01 00 00 00 00 00 00 00"]],"pro":{"h":"Same template, new hash","x":"The prefix and suffix are identical, so the template hash stays the same. The state bytes differ, so the script hash differs."}},
      {"t":"code","title":"The deploy transaction, two outputs","badge":"docs","x":"H0 stands for the 32-byte script hash of generation 0.","lines":[["outputs[0].script_public_key = 00 00 aa 20 H0 87","The covenant cell: script version 0, OpBlake2b, push 32 bytes, the script hash, OpEqual. 37 bytes in all."],["outputs[0].covenant_binding = { authorizing_input: 0, covenant_id: X }","Genesis binding: input 0 approves this output and starts the family X."],["outputs[1].script_public_key = 00 00 20 ALICE_PK ac","Change goes back to Alice as a 36-byte P2PK lock."]]},
      {"t":"mc","b":1,"q":"At deploy time, who runs the Counter script?","opts":["Nobody: an output script only runs when it is spent","Every node, once","Only the deployer’s wallet","The miner who includes the block"],"a":0,"why":"The deploy only creates the envelope. Consensus never runs the script until someone spends it."},
      {"t":"tf","b":1,"q":"Consensus checks that the initial state of a new covenant is sensible.","a":false,"why":"It checks structure, balances and the Genesis rule for the Covenant ID, not what the script says. Compare a covenant’s template hash with an audited build before relying on it."},
      {"t":"say","m":"think","x":"Now the spend. Input 0 is the covenant cell. Input 1 is the second coin that pays the fee. Output 0 is the successor cell with the same value, locked to the new hash `H1`."},
      {"t":"order","b":1,"q":"Put the Counter’s spend checks in order.","items":["The script pushes the new state, the entry tag and the redeem script","The engine hashes the revealed script and compares it to H0","The bump entry is selected","The rule new count == old count + 1 is checked","The successor lock is rebuilt and compared to the output"],"why":"Reveal and verify the script first, then run the rule, then make sure the successor output really carries the new state."},
      {"t":"mc","b":1,"q":"The successor’s script hash is H1, different from H0. Why?","opts":["The state bytes inside the script changed","The Covenant ID changed","The template changed","The fee changed"],"a":0,"why":"Only the state slice differs. The template and the Covenant ID stay the same."},
      {"t":"tf","b":1,"q":"The successor output gets a brand new Covenant ID.","a":false,"why":"A Continuation binding keeps the same ID X, because input 0 already carries it."},
      {"t":"say","m":"oops","x":"What would a hostile spender try? Each attack is stopped by someone. Sort them out."},
      {"t":"sort","b":1,"q":"Who stops each attack?","buckets":["Consensus","The covenant script"],"items":[{"t":"Claim count = 5 instead of 1","b":1,"why":"The rule requires count to be the old count plus 1."},{"t":"Authorize two successors for the Counter","b":1,"why":"The script requires exactly one authorized output."},{"t":"Bind X using an input that does not carry X","b":0,"why":"It is neither a valid Genesis nor a Continuation, so consensus rejects it."},{"t":"Bind X to a P2PK output the attacker owns","b":1,"why":"Consensus admits the binding, but the script’s successor-lock check fails."}],"why":"Consensus guards lineage: who may carry a Covenant ID. The script guards the transition: what the next state and lock must look like."},
      {"t":"say","m":"yay","x":"You followed a covenant from deploy to spend. Remember the address from lesson 1-6? After this spend the `kaspa:p…` address encodes H1 instead of H0.\n\nThe Covenant ID, the template and the rules carry on."}
    ]
  });

  SK.addLesson({
    id: '3-7', title: "Workshop: break it, fix it", min: 7,
    blurb: "Write the counter’s rule, assemble the whole contract, then hunt a bug that looks harmless.",
    steps: [
      {"t":"say","m":"hi","x":"Another workshop, this time for covenants with memory. You will write the Counter’s rule, assemble the whole contract from lines, and hunt a bug that looks harmless."},
      {"t":"say","m":"think","x":"Remember the two states a rule can see: `prev_state` is the old state and `new_state` is the proposed one. Most covenant bugs are a rule that looks at the **wrong one**, or compares them too loosely."},
      {"t":"build","b":1,"src":"counter","q":"Write the Counter’s rule: the new count must be **exactly one more** than the old count.","tokens":["require(","new_state.count","==","prev_state.count","+","1",");",">","-"],"a":[["require(","new_state.count","==","prev_state.count","+","1",");"],["require(","prev_state.count","+","1","==","new_state.count",");"]],"why":"The rule compares the proposed `new_state` with the old `prev_state` and demands exactly one step up. `>` would accept any bigger number and `-` would count down. Writing it as `prev_state.count + 1 == new_state.count` is the same rule, so it counts too."},
      {"t":"build","src":"counter","q":"Write the function header. It receives the old state and the new state, both of type `State`.","tokens":["function","bump(","State","prev_state",",","State","new_state",") {","entry","State[]"],"a":["function","bump(","State","prev_state",",","State","new_state",") {"],"why":"A covenant function receives the old state and the proposed new state. Each input is written as a type followed by a name, and the two are separated by a comma. The rule inside then compares them."},
      {"t":"order","b":1,"mono":true,"src":"counter","q":"Assemble the Counter. Two of the lines are decoys.","items":["contract Counter(int init_count) {","    int count = init_count;","    #[covenant.singleton]","    function bump(State prev_state, State new_state) {","        require(new_state.count == prev_state.count + 1);","    }","}"],"extra":["    #[covenant.fanout(to = max_outs)]","        require(new_state.count > prev_state.count);"],"why":"The contract line, the state field, the singleton declaration, then the function with its rule, then two closing braces. `fanout` is for one-in, many-out covenants, and the `>` rule would let the count jump."},
      {"t":"bug","b":1,"src":"counter","q":"This counter should climb by one each time it is spent. It looks fine, but it breaks on the second spend. Tap the buggy line.","lines":["contract Counter(int init_count) {","    int count = init_count;","    #[covenant.singleton]","    function bump(State prev_state, State new_state) {","        require(new_state.count == init_count + 1);","    }","}"],"bug":4,"fix":{"opts":["require(new_state.count == prev_state.count + 1);","require(new_state.count == prev_state.count);","require(new_state.count + 1 == prev_state.count);","require(new_state.count > init_count + 1);"],"a":0},"why":"`init_count` is only the starting value, fixed when the contract is created. The first spend would pass, but after that the count would be stuck. The rule must compare with the **previous state** so the count can keep climbing: 1, 2, 3."},
      {"t":"say","m":"yay","x":"That is the whole loop of covenant work: say the rule in words, write the line, assemble the contract, and test it by trying to break it."}
    ]
  });
})();
