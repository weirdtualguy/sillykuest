/* World 5: Teamwork: N:M, leader and delegates, KCC20 tokens, the minter, multi-contract. */
(function () {
  var SK = window.SK;

  SK.addLesson({
    id: '5-1', title: 'Covenants can’t phone each other', min: 6,
    blurb: 'How two covenants cooperate when neither can call the other.',
    steps: [
      { t: 'say', m: 'hi', x: 'Imagine two covenants that must cooperate: a **token**, and a **minter** that decides when new tokens may be created.\n\nIn most languages one would simply call the other. Covenants can’t. There is no “eval”.' },
      { t: 'say', m: 'think', x: 'So they cooperate the way two people sign one contract: **in the same transaction**.\n\nThe token’s state names its owner as a covenant ID. To spend the token, the transaction must also spend an envelope from that covenant. The token script checks that a co-spent input carries the right ID.' },
      { t: 'widget', w: 'handshake', gate: true, x: 'Try to spend a token that is owned by covenant C.' },
      { t: 'reveal', id: 'icc', term: 'ICC', plain: 'Covenants cooperating by being spent together in one transaction, because they can’t call each other.',
        x: 'Each covenant still validates only its own side. The handshake is simply: “is an input of that family present?”' },
      { t: 'order', q: 'Put the handshake in order.', items: [
        'The token’s state stores a covenant ID as its owner', 'The spender includes an input from that covenant', 'The token script checks that input’s covenant ID', 'Each covenant validates its own side'
      ], why: 'Store the owner ID, include a witness input, check its ID, and let each side validate itself.' },
      { t: 'mc', b: 1, q: 'How does a token know its minter approved a spend?',
        opts: ['A co-spent input carries the minter’s covenant ID', 'The token calls the minter’s code', 'The minter signs with a public key', 'The miners relay a message'], a: 0,
        why: 'The token script uses `OpInputCovenantId` on a witness input and compares it with the owner ID.' },
      { t: 'tf', b: 1, q: 'One covenant can execute another covenant’s code.', a: false,
        why: 'There is no eval. Covenants can only look at each other through the shared transaction.' },
      { t: 'mc', b: 1, q: 'In a multi-contract transaction, what does each covenant validate?',
        opts: ['Its own side of the transaction', 'Everything, on behalf of the others', 'Only the fee', 'Nothing: miners do it'], a: 0,
        why: 'Each covenant checks its own inputs and outputs. The cooperation happens by both being present.' }
    ]
  });

  SK.addLesson({
    id: '5-2', title: 'Leader and delegates', min: 7,
    blurb: 'When many envelopes move together, one input does the heavy checking.',
    steps: [
      { t: 'say', m: 'hi', x: 'When many envelopes of one family are spent together (N in, M out), making every input re-check the whole transition would be wasteful.\n\nSo we elect a **leader**.' },
      { t: 'widget', w: 'leader', gate: true, x: 'Pick which input is the delegate and which one it follows.' },
      { t: 'reveal', id: 'leader-delegate', term: 'Leader and delegate', plain: 'One input does the heavy checking for the whole group. The others just point at it and check their own signature.',
        x: 'The leader validates the full transition. Each delegate verifies that a valid leader was chosen, and authenticates itself locally.' },
      { t: 'code', ex: 'vault', x: 'This is the real thing: **VaultNM**, an N:M vault. Find the leader’s function and the delegate’s.',
        pro: { h: 'a limit of generated delegates', x: 'A generated delegate authenticates the contract at input zero, but it cannot tell which entrypoint that input selected.' } },
      { t: 'mc', b: 1, q: 'What is the leader’s job?',
        opts: ['Validate the full N:M transition', 'Pay the fees', 'Hold the covenant ID', 'Sign for every delegate'], a: 0,
        why: 'The leader sees all the old and new states and checks the transition as a whole.' },
      { t: 'tf', b: 1, q: 'A delegate may pick a leader with a higher input index than its own.', a: false,
        why: 'The rule is `leader_index < current_input_index`. That makes cycles impossible.' },
      { t: 'sort', q: 'Who does this: the leader or a delegate?', buckets: ['Leader', 'Delegate'], items: [
        { t: 'Checks the whole N:M transition', b: 0, why: 'That is the leader’s job.' },
        { t: 'Points at the leader and checks its own signature', b: 1, why: 'Delegates stay light.' },
        { t: 'Runs the function declared with `binding=cov`', b: 0, why: 'cov declarations are the leader’s policy.' },
        { t: 'Runs the `#[covenant.delegate]` function', b: 1, why: 'That function is what delegates execute.' },
        { t: 'Sits at covenant input 0', b: 0, why: 'The leader is the group’s first input.' }
      ], why: 'One leader does the big check. Everyone else keeps it light.' },
      { t: 'mc', q: 'How many `#[covenant.delegate]` functions can a contract have?',
        opts: ['At most one', 'Exactly two', 'One per entry', 'Any number'], a: 0,
        why: 'A contract may declare at most one delegate function.' }
    ]
  });

  SK.addLesson({
    id: '5-3', title: 'Tokens with KCC20', min: 7,
    blurb: 'A token standard made entirely of covenants.',
    steps: [
      { t: 'say', m: 'hi', x: 'Tokens! **KCC20** is a token standard built entirely from covenants.\n\nA token is a covenant family where each envelope carries an **amount** and an **owner**.' },
      { t: 'code', ex: 'kcc20', x: 'Here is what a token envelope carries.' },
      { t: 'explore', x: 'Three ways to say who owns a token.', items: [
        { icon: 'lock', h: 'Public key (0x00)', x: 'The owner proves it with a signature from that key.' },
        { icon: 'code', h: 'Script hash (0x01)', x: 'The owner is a script: a matching P2SH input must be present in the transaction.' },
        { icon: 'link', h: 'Covenant ID (0x02)', x: 'The owner is another covenant family: a matching input from it must be present. That is the handshake from lesson 5.1.' }
      ] },
      { t: 'say', m: 'think', x: 'The golden rule: for ordinary token envelopes, tokens **in** must equal tokens **out**.\n\nOnly an envelope flagged `isMinter` may change the supply.' },
      { t: 'widget', w: 'tokenLab', gate: true, x: 'Try the same actions on a normal envelope and then on a minter envelope.',
        pro: { h: 'the tests tell the story', x: 'The KCC20 tests check things like: a non-minter cannot change totals, a non-minter cannot create a minter output, and a merge where one signature is wrong is rejected.' } },
      { t: 'mc', b: 1, q: 'A normal (non-minter) token spend. What must hold?',
        opts: ['Total tokens in equals total tokens out', 'Total out may be larger', 'Total out must be zero', 'The amount may change if the owner signs'], a: 0,
        why: 'Conservation: only a minter envelope may change the supply.' },
      { t: 'tf', b: 1, q: 'A non-minter token spend can create a minter output.', a: false,
        why: 'That would be privilege escalation. Non-minters can never create minter outputs.' },
      { t: 'match', q: 'Match each identifier type to how ownership is proven.', pairs: [
        ['0x00', 'A signature from the key'], ['0x01', 'A matching script input'], ['0x02', 'A matching covenant input']
      ], why: 'Key, script, or covenant. The last one is how covenants own tokens.' },
      { t: 'mc', q: 'You merge two token envelopes, but one owner’s signature is wrong. What happens?',
        opts: ['The whole spend is rejected', 'Only that envelope is skipped', 'The tokens are burned', 'It passes if the other signature is valid'], a: 0,
        why: 'Every input has to authenticate. One bad signature rejects the whole merge.' },
      {"t":"say","m":"think","x":"Tokens can be kept in more than one way. The question that separates them is always: **what makes a transfer valid?**"},
      {"t":"table","cols":["Approach","Who decides a transfer is valid","Where balances live"],"rows":[["Indexer protocol (for example KRC-20)","An off-chain indexer, after the fact","The indexer’s database"],["Covenant token (KCC20)","The covenant scripts, run by consensus on every spend","Inside token UTXOs"],["Based-app token","A ZK proof, checked at settlement","An off-chain state root"]],"pro":{"h":"Handle with care","x":"KRC-20 is a third-party protocol, and there is no established standard yet for based-app tokens. Treat those two rows as a sketch. The covenant row is the one this quest teaches."}},
      {"t":"mc","b":1,"q":"A covenant token spend breaks a rule. What happens?","opts":["The transaction is rejected","Indexers ignore it but it is still included","It is accepted and fixed later","Nothing: only wallets check"],"a":0,"why":"Consensus runs the KCC20 script at spend time, so a rule-breaking spend is rejected. With an indexer protocol the carrier transaction is still included and only the indexer ignores it."},
      {"t":"tf","b":1,"q":"A wallet can make an invalid covenant-token transfer valid by displaying it as valid.","a":false,"why":"Wallets and indexers only read UTXOs to show balances. The scripts and consensus decide validity."},
      {"t":"match","q":"Match each approach to what holds the balance.","pairs":[["Indexer protocol","The indexer’s database"],["Covenant token","State inside token UTXOs"],["Based-app token","An off-chain state root"]],"why":"Three ways to keep a token, three different places for the truth."}
    ]
  });

  SK.addLesson({
    id: '5-4', title: 'The minter', min: 6,
    blurb: 'The covenant that decides when new tokens may exist.',
    steps: [
      { t: 'say', m: 'hi', x: 'KCC20 answers: “what is a valid token transition?”\n\nThe **minter** answers a different question: “under what policy may new tokens be created?”\n\nTwo covenants, two jobs, one handshake.' },
      { t: 'explore', x: 'The life of a token, in four moments.', items: [
        { icon: 'rocket', h: '1. The minter is created', x: 'The [[minter|KCC20Minter]] comes first, with an allowance of how much it may issue.' },
        { icon: 'link', h: '2. The two learn about each other', x: 'The token family and its minter are bound together, so each can recognise the other by covenant ID.' },
        { icon: 'coin', h: '3. Minting', x: 'A transaction spends the minter and a minter-flagged token envelope together. New tokens appear and the minter’s allowance goes down.' },
        { icon: 'lock', h: '4. The allowance runs out', x: 'Once the allowance is used up, no more tokens can be created.' }
      ] },
      { t: 'match', b: 1, q: 'Match each part to its job.', pairs: [
        ['KCC20 covenant', 'Decides what a valid token transition is'], ['KCC20Minter covenant', 'Decides when and how much new supply may be issued'], ['The handshake', 'Both are spent together in one transaction'], ['isMinter flag', 'Marks a token envelope that may change supply']
      ], why: 'Two covenants with separate jobs, joined by the handshake.' },
      { t: 'mc', b: 1, q: 'After a mint, what does the next minter envelope carry?',
        opts: ['A reduced issuance allowance', 'The same allowance as before', 'A new covenant ID', 'The minted tokens'], a: 0,
        why: 'The remaining allowance goes down by the amount that was minted.' },
      { t: 'mc', q: 'Why are the minter and a token envelope spent in the same transaction?',
        opts: ['Each covenant validates its own side of the same handshake', 'To pay a lower fee', 'Because only one can exist at a time', 'To change the covenant ID'], a: 0,
        why: 'Covenants can’t call each other, so they meet in one transaction.' },
      { t: 'tf', q: 'The minter checks that token outputs use the expected code by comparing template hashes.', a: true,
        why: 'Same principle as lesson 3.2: authenticate the code part by its hash, never by how it looks.' },
      { t: 'mc', b: 1, q: 'Someone tries to mint more than the allowance. Which covenant blocks it?',
        opts: ['The minter covenant rejects it', 'The token covenant rejects it', 'Nothing blocks it', 'Miners vote'], a: 0,
        why: 'The minter is the policy keeper. It validates its own side, and the over-mint fails there.' },
      { t: 'say', m: 'yay', x: 'You now know the whole toolbox: envelopes, rules, state, templates, IDs, leaders and tokens.\n\nOne world left: how Kaspa goes beyond single envelopes.' }
    ]
  });

  SK.addLesson({
    id: '5-5', title: "Workshop: token rules", min: 8,
    blurb: "Write the token and minter rules: in equals out, mint within the allowance.",
    steps: [
      {"t":"say","m":"hi","x":"Last workshop before the sky. Tokens and their minter come down to a few short rules, and you can now write them."},
      {"t":"say","m":"think","x":"Three names to keep in mind: `totalIn` and `totalOut` are the token sums going in and out, and `hasMinterIn` says whether a minter envelope is among the inputs. The minter’s own state holds the **allowance** left to mint."},
      {"t":"build","b":1,"src":"kcc20","q":"A normal token spend has no minter input. Tokens in must equal tokens out. Write the check.","before":["if (!hasMinterIn) {"],"after":["}"],"tokens":["require(","totalIn","==","totalOut",");",">=","amount"],"a":[["require(","totalIn","==","totalOut",");"],["require(","totalOut","==","totalIn",");"]],"why":"For ordinary token envelopes the golden rule is tokens in equal tokens out, so the check uses `==`. Only a minter input may break it, which is why the check sits inside `if (!hasMinterIn)`."},
      {"t":"build","src":"minter","q":"The minter may not mint more than the allowance it still holds in `prev_state.amount`. Write the check.","tokens":["require(","mintAmount","<=","prev_state.amount",");",">=","totalOut"],"a":["require(","mintAmount","<=","prev_state.amount",");"],"why":"`mintAmount` is what is being minted now, and `prev_state.amount` is the allowance left. Minting must stay within it, so the check is `<=`."},
      {"t":"build","src":"kcc20","q":"A token is owned by a covenant family. The witness input sits at index `wIdx`. Check that its Covenant ID equals the owner stored in the token state.","tokens":["require(","OpInputCovenantId(wIdx)","==","prev_states[i].ownerIdentifier",");","OpOutputCovenantId(0)","prev_states[i].amount"],"a":["require(","OpInputCovenantId(wIdx)","==","prev_states[i].ownerIdentifier",");"],"why":"When a token is owned by a covenant family, the spender includes an input from that family as a witness. The token compares that input’s Covenant ID with the owner stored in its state."},
      {"t":"slots","mono":true,"b":1,"q":"Match each rule to the line that enforces it.","slots":["A normal spend may not create a minter output","Minting needs a positive amount","Minting stays within the allowance"],"pieces":["if (!hasMinterIn) { require(!new_states[j].isMinter); }","require(mintAmount > 0);","require(mintAmount <= prev_state.amount);","require(mintAmount >= prev_state.amount);"],"a":[0,1,2],"why":"Without a minter input, no output may be flagged as a minter. A mint must be positive and within the allowance. The decoy `>=` would demand minting at least the whole allowance, the opposite of a limit."},
      {"t":"bug","src":"minter","q":"Someone mints more than the allowance and the minter accepts it. Tap the buggy line.","lines":["require(prev_state.initialized);","require(checkSig(ownerSig, owner));","require(mintAmount > 0);","require(mintAmount >= prev_state.amount);"],"bug":3,"fix":{"opts":["require(mintAmount <= prev_state.amount);","require(mintAmount == prev_state.amount);","require(mintAmount != prev_state.amount);","require(mintAmount > prev_state.amount);"],"a":0},"why":"`>=` demands a mint at least as big as the allowance, which is the opposite of a limit. The check must be `<=`."},
      {"t":"say","m":"yay","x":"Equal in and out, mint within the allowance, and ownership checked by ID. That is the heart of the token standard, written by you."}
    ]
  });
})();
