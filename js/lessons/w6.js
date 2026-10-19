/* World 6: Toccata Sky: ZK proofs (KIP-16), lanes (KIP-21), based apps, safety. */
(function () {
  var SK = window.SK;

  SK.addLesson({
    id: '6-1', title: 'Proofs on L1', min: 6,
    blurb: 'Zero-knowledge proofs, and what it costs to check one inside a script.',
    steps: [
      { t: 'say', m: 'hi', x: 'Some computations are too big to redo on every node.\n\nA **zero-knowledge proof** lets someone prove “I did this computation correctly” in a tiny package. The chain doesn’t redo the work. It just **verifies the proof**.' },
      { t: 'reveal', id: 'zk-proof', term: 'ZK proof', plain: 'A short receipt that says a big computation was done correctly, so nobody has to redo it.',
        x: 'Kaspa can verify these right inside a script, using a dedicated opcode (KIP-16).' },
      { t: 'widget', w: 'proofRace', gate: true, x: 'How much does checking a proof cost, next to one ordinary signature check?' },
      { t: 'compare', x: 'Two kinds of proof are supported.',
        a: { h: 'Groth16 (tag 0x20)', items: ['A very compact proof', 'About **1.649 ms** to verify', 'Not quantum-safe'] },
        b: { h: 'STARK, RISC Zero Succinct (tag 0x21)', items: ['A larger proof', 'About **9.081 ms** to verify', 'Quantum-safe'] } },
      { t: 'code', title: 'Verifying a proof', badge: 'docs', x: 'In Silverscript, verifying a Groth16 proof is one line.', lines: [
        ['g16.verify(vk, proof, ...publicInputs);', 'Check a Groth16 proof against a verification key and the public inputs. If the check fails, the whole script aborts.', 'The opcode behind it is OpZkPrecompile (0xa6).']
      ] },
      { t: 'mc', b: 1, q: 'Which kind of proof is quantum-safe?',
        opts: ['STARK (RISC Zero Succinct)', 'Groth16', 'Both', 'Neither'], a: 0,
        why: 'Groth16 is compact but not quantum-safe. The STARK is larger and quantum-safe.' },
      { t: 'mc', b: 1, q: 'Roughly how much more expensive is verifying a STARK than one signature check?',
        opts: ['About 738 times', 'About 2 times', 'About 10 times', 'The same'], a: 0,
        why: '9.081 ms against 12.311 μs is roughly 738 times.' },
      { t: 'tf', q: 'If a proof check fails, the script carries on with a warning.', a: false,
        why: 'A failed verification aborts script execution. There is no “carry on”.' },
      { t: 'match', q: 'Match each item to what it is.', pairs: [
        ['0x20', 'Groth16'], ['0x21', 'RISC Zero Succinct STARK'], ['OpZkPrecompile', 'The opcode that verifies proofs']
      ], why: 'Two precompile tags and one opcode.' },
      {"t":"say","m":"think","x":"One more thing. Checking a proof tells you the proof is **valid**. It does not tell you it is the proof **you needed**.\n\nYour covenant script has to supply that meaning."},
      {"t":"explore","x":"Tap each question a proof-checking covenant must answer.","items":[{"icon":"code","h":"Is it the right program?","x":"The script pins the verifying key (Groth16) or the image id (RISC Zero STARK), so a valid proof of some other program is refused."},{"icon":"link","h":"Does it start from the current state?","x":"The script compares the proof’s starting commitment with the state inside its own redeem script."},{"icon":"envelope","h":"Does it end at the new state?","x":"The script rebuilds the successor lock from the proof’s ending commitment and requires the output to match."},{"icon":"tree","h":"Is the successor in the same family?","x":"The covenant binding and the script together keep the lineage."}],"pro":{"h":"The budget for a STARK","x":"A STARK check costs 25,000,000 script units, so the input needs a compute_budget of 2,500, which grants 25,009,999."}},
      {"t":"mc","b":1,"q":"What does the proof opcode (OpZkPrecompile) answer on its own?","opts":["Does this proof verify for this key and these public inputs?","Is this the program my contract needs?","Does the successor output carry the new state?","Is the sender allowed to spend?"],"a":0,"why":"It checks validity only and aborts on failure. Everything about meaning is the covenant script’s job."},
      {"t":"tf","b":1,"q":"If a script never pins the verifying key or image id, a valid proof of a different program could unlock it.","a":true,"why":"The proof would verify, but for the wrong program. Pinning the program identity is what ties the proof to your contract."},
      {"t":"mc","q":"A proof verifies. Which check is the covenant script still responsible for?","opts":["That the successor lock installs the proven new state","That the proof is mathematically sound","That Groth16 is quantum-safe","That ECDSA is faster"],"a":0,"why":"The proof says the hidden transition is valid. The script must make sure this transaction installs exactly that result."}
    ]
  });

  SK.addLesson({
    id: '6-2', title: 'Lanes', min: 6,
    blurb: 'Why an app can prove just its own activity on a very busy chain.',
    steps: [
      { t: 'say', m: 'hi', x: 'Picture one huge highway where every app’s cars mix together. To prove what **your** app did, you’d have to track every car.\n\n**Lanes** fix that: each app gets its own lane.' },
      { t: 'widget', w: 'lanes', gate: true, x: 'Pick a lane. See how much of the block a lane proof has to look at.' },
      { t: 'reveal', id: 'user-lane', term: 'User lane', plain: 'A lane on the highway for one app. Its transactions are tagged so a prover can follow only that app.',
        x: 'A user lane is a V1 transaction whose subnetwork ID is a 4-byte namespace followed by 16 zero bytes.' },
      { t: 'say', m: 'think', x: 'Careful: this “lane” is a **sequencing** idea. It has nothing to do with the parallel UTXOs from World 1.\n\nBoth are about doing many things at once, but they live at different layers.' },
      { t: 'explore', x: 'Lane rules worth knowing.', items: [
        { icon: 'envelope', h: 'Which lane am I in?', x: 'A transaction’s lane is its subnetwork ID.' },
        { icon: 'bolt', h: 'How many lanes fit in a block?', x: 'At most 50 distinct non-coinbase lanes per block.' },
        { icon: 'coin', h: 'What about gas?', x: 'Only user-lane V1 transactions may carry gas, and the total per lane per block is capped at 1,000,000,000.' },
        { icon: 'shield', h: 'How does a lane get proven?', x: 'KIP-21 commits to each lane separately, so an app can prove just its own slice. See [[seqcommit]].' }
      ] },
      { t: 'mc', b: 1, q: 'What does the cost of a lane proof follow?',
        opts: ['The app’s own activity', 'All transactions on Kaspa', 'The number of miners', 'The price of KAS'], a: 0,
        why: 'Cost follows the activity on the lane, not the total throughput of the network.' },
      { t: 'mc', b: 1, q: 'A user-lane subnetwork ID is 20 bytes. How many of them are the namespace?',
        opts: ['4', '16', '20', '1'], a: 0,
        why: 'A 4-byte namespace followed by 16 zero bytes.' },
      { t: 'tf', b: 1, q: 'Lanes and parallel UTXOs are the same idea.', a: false,
        why: 'Lanes partition sequencing for proofs. Parallel UTXOs are about independent state. Don’t mix the words.' },
      { t: 'mc', q: 'At most how many distinct non-coinbase lanes can one block contain?',
        opts: ['50', '5', '500', 'Unlimited'], a: 0,
        why: 'KIP-21 caps a block at 50 distinct lanes.' }
    ]
  });

  SK.addLesson({
    id: '6-3', title: 'Based apps', min: 6,
    blurb: 'When an app needs shared state that thousands of people update.',
    steps: [
      { t: 'say', m: 'hi', x: 'What if your app needs shared state that many people update at once, like an order book?\n\nOne envelope can’t be opened by everybody at the same moment. Enter the **based app**.' },
      { t: 'widget', w: 'basedFlow', gate: true, x: 'Step through how a based app works.',
        pro: { h: 'about vprogs', x: '[[vprogs]] is an evolving reference for the runtime and proving pipeline. It is a moving target, not a finished SDK, so check the repository before relying on it.' } },
      { t: 'reveal', id: 'based-app', term: 'Based app', plain: 'An app where users send ordinary transactions on the app’s lane, a program off-chain runs them in order, and a ZK proof settles the result on Kaspa.',
        x: 'Kaspa orders the data. The proof keeps the runtime honest.' },
      { t: 'sort', b: 1, q: 'Which tool fits better?', buckets: ['An L1 covenant', 'A based app'], items: [
        { t: 'A tip jar that pays one creator monthly', b: 0, why: 'Independent envelopes with simple rules. A covenant is enough.' },
        { t: 'A token with simple transfers', b: 0, why: 'KCC20 covers it with covenants.' },
        { t: 'A shared order book updated by thousands of traders', b: 1, why: 'Shared mutable state with high contention.' },
        { t: 'A vault with a time lock', b: 0, why: 'Simple rules on one envelope.' },
        { t: 'A game world everyone modifies at once', b: 1, why: 'Shared state again.' }
      ], why: 'Simple rules on independent envelopes: covenants. Heavily shared state: based apps.' },
      { t: 'mc', b: 1, q: 'In a based app, what does each user operation look like on Kaspa?',
        opts: ['An ordinary V1 transaction with a payload, on the app’s lane', 'A covenant spend that runs the whole app', 'A message sent only off-chain', 'A ZK proof'], a: 0,
        why: 'Operations are ordinary lane transactions. The execution happens off-chain and is proven later.' },
      { t: 'tf', b: 1, q: 'Every based-app operation must itself be a covenant spend.', a: false,
        why: 'Only the settlement step needs a covenant. User operations are ordinary lane transactions.' },
      { t: 'mc', q: 'What does the settlement covenant check?',
        opts: ['The proof, the sequencing anchor and any exits', 'Only the fee', 'Each user’s private key', 'Nothing: it trusts the runtime'], a: 0,
        why: 'It verifies the ZK proof against the KIP-21 anchor, so the runtime can’t cheat.' },
      { t: 'mc', q: 'When should you reach for a based app?',
        opts: ['When you truly need shared state that many people update', 'For every project, to be safe', 'Whenever a token is involved', 'Only for time locks'], a: 0,
        why: 'It is the heavier tool. Use it only when covenants alone can’t do the job.' }
    ]
  });

  SK.addLesson({
    id: '6-4', title: 'The safety net', min: 7,
    blurb: 'The habits that keep funds safe, and your graduation.',
    steps: [
      { t: 'say', m: 'hi', x: 'You have the powers. Now the habits that keep funds safe.\n\nThink of this as the checklist you run before you ship anything.' },
      { t: 'explore', x: 'Seven habits. Tap each one.', items: [
        { icon: 'shield', h: 'The ID guards the door, the script judges the move', x: 'The covenant ID controls who may join a family. Your script still has to validate every transition.' },
        { icon: 'check', h: 'Validate every successor', x: 'Check the successor’s template and state. Never trust an output because it looks right.' },
        { icon: 'code', h: 'Authenticate code by hash', x: 'Compare template hashes so a lookalike can’t sneak in.' },
        { icon: 'target', h: 'Cap and check your loops', x: 'Give every loop an unroll bound, and validate list lengths yourself, because the runtime bound check may be optimised away.' },
        { icon: 'bug', h: 'Casts are unchecked', x: 'A cast like `byte[32](data)` does not verify the length for you. Add `require(data.length == 32)` first.' },
        { icon: 'envelope', h: 'Think envelopes, not accounts', x: 'Design your app as state transitions of UTXOs, not as storage slots that get edited.' },
        { icon: 'info', h: 'APIs move', x: 'Silverscript and friends are still evolving. Check the repositories, test hard and get an audit before real money is involved.' }
      ] },
      { t: 'match', b: 1, q: 'Match each mistake to its fix.', pairs: [
        ['Treating it like an account with global storage', 'Design UTXO state transitions'], ['Trusting an output because it looks right', 'Validate template and state explicitly'],
        ['Assuming the covenant ID checks the logic', 'Write the rules in the script'], ['Loops with no cap', 'Add an unroll bound and check lengths']
      ], why: 'Every classic mistake has a simple, boring fix.' },
      {"t":"build","b":1,"sketch":true,"q":"A cast like `byte[32](data)` never checks the length. Write the line that must come right before `byte[32] h = byte[32](data);`.","tokens":["require(","data.length","==","32",");","checkSig(s, pk)","<="],"a":["require(","data.length","==","32",");"],"why":"Casts are unchecked: `byte[32](data)` only reinterprets the bytes and never checks the length. So the script must first require that `data.length` is exactly 32."},
      { t: 'mc', b: 1, q: 'A teammate says: “our covenant ID guarantees only valid transfers.” What do you reply?',
        opts: ['The ID only guards membership. The script must validate each transition.', 'Correct, nothing else is needed.', 'The ID checks amounts automatically.', 'Only miners can verify transfers.'], a: 0,
        why: 'The ID guards the door. The script judges the move.' },
      { t: 'mc', b: 1, q: 'Your app is a simple monthly pledge to a creator. What is the best starting point?',
        opts: ['A plain covenant, like Mecenas', 'A based app with ZK proofs', 'A custom consensus change', 'A global account contract'], a: 0,
        why: 'Start with the simplest tool that works. Heavier tools are for problems that need them.' },
      { t: 'say', m: 'yay', x: 'That’s the whole quest.\n\nYou can read Silverscript, reason about covenants, and spot the classic mistakes. When you build for real, check the repos, test hard, and get an audit.\n\nIt was a pleasure haunting this with you.' }
    ]
  });
})();
