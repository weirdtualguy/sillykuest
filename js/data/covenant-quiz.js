/* Covenants Quiz: the question bank, the result ladder and the draw.
   Every question restates a fact that a lesson already teaches (`src` is that lesson), worded so it stands alone
   for someone who has never opened the app. Keep it that way: add a lesson fact first, then a quiz question.
   tier 1 = easy (worlds 1-2), 2 = medium (worlds 3-5), 3 = hard (worlds 5-6). A round draws 3 + 4 + 3 = 10,
   easiest first, so the share card reads like a gradient. Question steps use the same shape as lesson steps. */
(function () {
  var SK = window.SK = window.SK || {};

  SK.QUIZ_PICK = { 1: 3, 2: 4, 3: 3 };
  SK.QUIZ_LEN = 10;

  SK.quizBank = [
    /* ---- tier 1 ---- */
    { id: 'q01', tier: 1, src: '1-1', t: 'mc', q: 'You spend a 10 KAS UTXO and send 3 KAS to Sam. What happens to the original UTXO?',
      opts: ['It is used up, and new UTXOs are created', 'It stays, now holding 7 KAS', 'It is split in half automatically', 'Sam receives the original UTXO'], a: 0,
      why: 'A UTXO is immutable. Spending it destroys it and creates new UTXOs: here, one for Sam and one for your change.' },
    { id: 'q02', tier: 1, src: '1-1', t: 'tf', q: 'A Kaspa transaction can edit the amount inside an existing UTXO.', a: false,
      why: 'UTXOs are immutable. A transaction spends old UTXOs and creates new ones.' },
    { id: 'q03', tier: 1, src: '1-3', t: 'mc', q: 'How is a covenant different from a plain signature lock?',
      opts: ['It also checks the spend: where the coins go and how much', 'It makes the spender pay a second fee', 'It runs the rule on a separate computer', 'It makes the coins impossible to spend'], a: 0,
      why: 'A plain lock checks who is spending. A covenant also constrains what the spend may do.' },
    { id: 'q04', tier: 1, src: '1-4', t: 'tf', q: 'The covenant ID changes every time the covenant’s state changes.', a: false,
      why: 'The covenant ID is the stable part. The script hash is what changes with the state.' },
    { id: 'q05', tier: 1, src: '1-6', t: 'tf', q: 'A Kaspa address contains the amount of KAS to send.', a: false,
      why: 'An address only points at a lock. It carries no amount, no covenant ID and no state.' },
    { id: 'q06', tier: 1, src: '1-6', t: 'mc', q: 'Which kind of address does a stateful covenant output use?',
      opts: ['A script-hash address, `kaspa:p…`', 'A key address, `kaspa:q…`', 'A special covenant prefix'], a: 0,
      why: 'Stateful covenants are P2SH outputs, so the address shows a script hash and starts with `p`.' },
    { id: 'q07', tier: 1, src: '1-7', t: 'mc', q: 'How many sompi are in 1 KAS?',
      opts: ['100,000,000', '1,000,000', '1,000', '21,000,000'], a: 0,
      why: '1 KAS = 10^8 sompi, so 100,000,000.' },
    { id: 'q08', tier: 1, src: '2-1', t: 'mc', q: 'In Silverscript, what happens when the condition inside `require(...)` is false?',
      opts: ['The spend fails and nothing moves', 'A warning is printed and the spend carries on', 'The line is retried', 'The coins go back to the sender'], a: 0,
      why: '`require` is a guard. If it fails, the whole spend is rejected.' },
    { id: 'q09', tier: 1, src: '2-5', t: 'tf', q: 'A covenant runs by itself when its time lock expires.', a: false,
      why: 'A covenant only runs when someone spends its UTXO. Time locks decide when a spend becomes valid, not what triggers it.' },
    { id: 'q10', tier: 1, src: '2-5', t: 'tf', q: 'A Silverscript `for` loop can repeat an unbounded number of times.', a: false,
      why: 'Loops are unrolled at compile time, so they need a cap.' },

    /* ---- tier 2 ---- */
    { id: 'q11', tier: 2, src: '3-1', t: 'mc', q: 'A covenant carries state from one spend to the next. Who decides whether a proposed next state is acceptable?',
      opts: ['The covenant’s own rule (`require`) running in the script', 'The miners, case by case', 'The previous owner, by signing', 'Nobody: any next state is fine'], a: 0,
      why: 'The script validates the transition. If a `require` fails, the spend is rejected.' },
    { id: 'q12', tier: 2, src: '3-2', t: 'mc', q: 'Why should a covenant check the template hash of its successor?',
      opts: ['To be sure the next UTXO runs the expected code, not a lookalike', 'To make the transaction cheaper', 'To change the covenant ID', 'To speed up block creation'], a: 0,
      why: 'The hash authenticates the code part. A lookalike with different code would not match.' },
    { id: 'q13', tier: 2, src: '3-2', t: 'tf', q: 'If a successor output “looks right”, that is good enough validation.', a: false,
      why: 'Never trust an output because it looks right. Validate its template and its state explicitly.' },
    { id: 'q14', tier: 2, src: '3-4', t: 'mc', q: 'A counter covenant checks the new count but never checks the successor’s code. What can a thief do?',
      opts: ['Create a successor with the right count but different code', 'Change the covenant ID', 'Print new KAS', 'Nothing: the count rule is enough'], a: 0,
      why: 'Without the template check the next UTXO could run any code. The state would look right while the money was stolen.' },
    { id: 'q15', tier: 2, src: '3-6', t: 'tf', q: 'Consensus checks that a new covenant’s initial state is sensible.', a: false,
      why: 'It checks structure, balances and the genesis rule for the covenant ID, not what the script says. Compare a covenant’s template hash with an audited build before relying on it.' },
    { id: 'q16', tier: 2, src: '3-6', t: 'mc', q: 'When you deploy a covenant, who runs its script?',
      opts: ['Nobody: an output script only runs when it is spent', 'Every node, once', 'Only the deployer’s wallet', 'The miner who includes the block'], a: 0,
      why: 'The deploy only creates the UTXO. Consensus never runs the script until someone spends it.' },
    { id: 'q17', tier: 2, src: '4-2', t: 'tf', q: 'A covenant ID alone guarantees that every transition follows the app’s rules.', a: false,
      why: 'The ID controls admission to the family. The script still has to validate each transition.' },
    { id: 'q18', tier: 2, src: '4-4', t: 'mc', q: 'What can a covenant script see?',
      opts: ['Only the transaction that is spending it', 'Every transaction in the block', 'The whole UTXO set', 'Its own past spends'], a: 0,
      why: 'Introspection reads the current transaction’s inputs, outputs and fields. Anything else has to be passed in through co-spent inputs, outputs or arguments.' },
    { id: 'q19', tier: 2, src: '4-2', t: 'mc', q: 'Why can’t two different covenant families get the same genesis ID by accident?',
      opts: ['The ID is hashed from an outpoint, and an outpoint never repeats', 'Kaspa checks a global list of names', 'IDs are picked at random', 'Each wallet may only start one family'], a: 0,
      why: 'An outpoint can only be spent once, so each genesis hashes something unique.' },
    { id: 'q20', tier: 2, src: '5-3', t: 'mc', q: 'A covenant token that is not a minter gets spent. What must hold for the token amounts?',
      opts: ['Total tokens in equals total tokens out', 'Total out may be larger', 'Total out must be zero', 'The amount may change if the owner signs'], a: 0,
      why: 'Conservation: only a minter may change the supply.' },

    /* ---- tier 3 ---- */
    { id: 'q21', tier: 3, src: '5-1', t: 'tf', q: 'One covenant can execute another covenant’s code.', a: false,
      why: 'There is no eval. Covenants can only look at each other through the shared transaction.' },
    { id: 'q22', tier: 3, src: '5-1', t: 'mc', q: 'How does a token covenant know its minter approved a spend?',
      opts: ['A co-spent input carries the minter’s covenant ID', 'The token calls the minter’s code', 'The minter signs with a public key', 'The miners relay a message'], a: 0,
      why: 'The token script reads the covenant ID of a witness input and compares it with the owner ID.' },
    { id: 'q23', tier: 3, src: '5-2', t: 'tf', q: 'A delegate may pick a leader with a higher input index than its own.', a: false,
      why: 'The rule is `leader_index < current_input_index`. That makes cycles impossible.' },
    { id: 'q24', tier: 3, src: '5-3', t: 'tf', q: 'A wallet can make an invalid covenant-token transfer valid by displaying it as valid.', a: false,
      why: 'Wallets and indexers only read UTXOs to show balances. The scripts and consensus decide validity.' },
    { id: 'q25', tier: 3, src: '6-1', t: 'tf', q: 'If a script never pins the verifying key or image ID, a valid proof of a different program could unlock it.', a: true,
      why: 'The proof would verify, but for the wrong program. Pinning the program identity is what ties the proof to your contract.' },
    { id: 'q26', tier: 3, src: '6-1', t: 'mc', q: 'A zero-knowledge proof verifies on-chain. What is the covenant script still responsible for?',
      opts: ['That the successor lock installs the proven new state', 'That the proof is mathematically sound', 'That Groth16 is quantum-safe', 'That ECDSA is faster'], a: 0,
      why: 'The proof says the hidden transition is valid. The script must make sure this transaction installs exactly that result.' },
    { id: 'q27', tier: 3, src: '6-3', t: 'tf', q: 'Every based-app operation must itself be a covenant spend.', a: false,
      why: 'Only the settlement step needs a covenant. User operations are ordinary lane transactions.' },
    { id: 'q28', tier: 3, src: '6-2', t: 'tf', q: 'Lanes and parallel UTXOs are the same idea.', a: false,
      why: 'Lanes partition sequencing for proofs. Parallel UTXOs are about independent state. Don’t mix the words.' },
    { id: 'q29', tier: 3, src: '6-1', t: 'mc', q: 'Which kind of proof is quantum-safe?',
      opts: ['STARK (RISC Zero Succinct)', 'Groth16', 'Both', 'Neither'], a: 0,
      why: 'Groth16 is compact but not quantum-safe. The STARK is larger and quantum-safe.' }
  ];

  /* The result ladder reuses the quest's own badge names, so the card previews what the app hands out. */
  SK.quizTiers = [
    { min: 0, name: 'Fresh Ghost', color: '#E8E6FF', quip: 'Everyone starts as a ghost.' },
    { min: 3, name: 'Postmaster', color: '#37D6B4', quip: 'You know your envelopes.' },
    { min: 5, name: 'Silver Tongue', color: '#9A8CFF', quip: 'Fluent enough to read a contract.' },
    { min: 7, name: 'Copycat Catcher', color: '#FFA05C', quip: 'No lookalike gets past you.' },
    { min: 8, name: 'Family Historian', color: '#FF7F90', quip: 'You can trace every covenant ID.' },
    { min: 9, name: 'Sky Walker', color: '#55B9FF', quip: 'Proofs and lanes, no problem.' },
    { min: 10, name: 'Ghost Architect', color: '#FFCB45', quip: 'Flawless. Sil is taking notes.' }
  ];
  SK.quizTier = function (score) {
    var t = SK.quizTiers[0];
    SK.quizTiers.forEach(function (x) { if (score >= x.min) t = x; });
    return t;
  };
  /* what the quiz suggests as a starting level: the same three answers the welcome screen offers */
  SK.quizLevel = function (score) { return score >= 8 ? 'builder' : score >= 5 ? 'basics' : 'new'; };

  /* Draw one round: SK.QUIZ_PICK[tier] random questions per tier, easiest tier first. Returns player steps. */
  SK.quizSteps = function () {
    var out = [];
    [1, 2, 3].forEach(function (tier) {
      var pool = SK.quizBank.filter(function (q) { return q.tier === tier; });
      SK.shuffle(pool).slice(0, SK.QUIZ_PICK[tier]).forEach(function (q) { out.push({ step: q, key: null }); });
    });
    return out;
  };
})();
