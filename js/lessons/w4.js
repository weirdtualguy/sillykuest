/* World 4: Family Trees: covenant IDs, topology, bindings. */
(function () {
  var SK = window.SK;

  SK.addLesson({
    id: '4-1', title: 'The shape of a spend', min: 5,
    blurb: 'Declare how many envelopes go in and out, and let Silverscript write the plumbing.',
    steps: [
      { t: 'say', m: 'hi', x: 'Writing every check by hand gets tedious. So Silverscript lets you **declare** the shape of transaction you expect, and it generates the plumbing for you.' },
      { t: 'reveal', id: 'topology', term: 'Topology', plain: 'How many envelopes go in, and how many come out.',
        x: 'It is written **from:to**. 1:1 is one in, one out. 1:N is one in, several out. N:M is several in, several out.' },
      { t: 'widget', w: 'topology', gate: true, x: 'Switch between the three shapes and read what each one needs.' },
      { t: 'code', title: 'Shortcuts', badge: 'docs', x: 'You already met the first shortcut. Here are all three forms.', lines: [
        ['#[covenant.singleton]', 'Shortcut for one in, one out (1:1).'],
        ['#[covenant.fanout(to = Y)]', 'Shortcut for one in, up to Y out (1:N).'],
        ['#[covenant(binding=cov, from=X, to=Y)]', 'The full form, here for N:M. `from` and `to` can be constructor parameters.']
      ] },
      {"t":"build","b":1,"src":"splitter","q":"Declare a **fan-out**: one input, many outputs, with at most `max_outs` of them.","tokens":["#[","covenant.fanout(","to","=","max_outs",")","]","covenant.singleton","covenant.delegate"],"a":["#[","covenant.fanout(","to","=","max_outs",")","]"],"why":"The fan-out shortcut is 1:N: one input, up to `max_outs` outputs, with the cap written in `to`. `singleton` is the 1:1 shortcut and `delegate` marks a delegate function."},
      { t: 'match', b: 1, q: 'Match each shape to the arguments its rule receives.', pairs: [
        ['1:1', 'State prev_state, State new_state'], ['1:N', 'State prev_state, State[] new_states'], ['N:M', 'State[] prev_states, State[] new_states']
      ], why: 'Whenever there are several, the argument becomes a list: `State[]`.' },
      { t: 'tf', q: 'In an N:M covenant, `prev_states` is a single `State`.', a: false,
        why: 'With several inputs, `prev_states` is a list: `State[]`.' },
      {"t":"build","src":"vault","q":"Write the full declaration for an **N:M** covenant: binding `cov`, then `from` up to `max_ins`, then `to` up to `max_outs`, then `verification` mode.","tokens":["#[","covenant(","binding=cov",",","from=max_ins",",","to=max_outs",",","mode=verification",")","]","binding=auth"],"a":["#[","covenant(","binding=cov",",","from=max_ins",",","to=max_outs",",","mode=verification",")","]"],"why":"This is the full form the VaultNM contract uses. `binding=cov` lets each input find its family mates, `from` and `to` set the shape, and `mode=verification` means the spender proposes the new states and your rule only checks them. `binding=auth` is the other binding; N:M vaults use `cov`."}
    ]
  });

  SK.addLesson({
    id: '4-2', title: 'Family badges', min: 7,
    blurb: 'Where covenant IDs come from, and why nobody can forge one.',
    steps: [
      { t: 'say', m: 'hi', x: 'Fingerprints change on every spend. So how does Kaspa know envelope #57 belongs to the same family as envelope #1?\n\nThe **covenant ID**. Let’s see where one comes from.' },
      { t: 'explore', x: 'An output can carry a covenant ID in only two ways.', items: [
        { icon: 'tree', h: 'Continuation', x: 'An input that already carries the ID authorizes a new output with the **same** ID. The family carries on. See [[continuation]].' },
        { icon: 'star', h: 'Genesis', x: 'A brand-new family is born. Its ID is a hash of an **outpoint** (a pointer to one specific earlier envelope, which can only be spent once) plus the first outputs. See [[genesis]].' }
      ] },
      { t: 'widget', w: 'lineage', gate: true, x: 'Start a family, continue it, then try to forge a member.' },
      { t: 'reveal', id: 'covenant-binding', term: 'Covenant binding', plain: 'A label on a new envelope: “I belong to this family, and this input approved me”.',
        x: 'It is the pair **authorizing_input** and **covenant_id** on an output.',
        pro: { h: 'how the genesis ID is made', x: 'CovenantIDHash is BLAKE2b-256 with the domain tag “CovenantID”. The authorized outputs are ordered by strictly increasing output index, and the binding itself is left out of the hash to avoid self-reference.' } },
      { t: 'say', m: 'think', x: 'Notice what the covenant ID does **not** do. It controls who may **join** the family. It does not check that a transition makes sense. That is the script’s job.\n\nTwo jobs, two tools: **the ID guards the door, the script judges the move.**' },
      { t: 'mc', b: 1, q: 'Can someone forge an output that carries a covenant ID?',
        opts: ['Not without a continuation from an input with that ID, or a valid genesis', 'Yes, by copying the ID from another envelope', 'Yes, if they pay a higher fee', 'Only miners can'], a: 0,
        why: 'Membership is checked by consensus. Forging would mean passing the script checks or finding a hash preimage.' },
      { t: 'tf', b: 1, q: 'A covenant ID alone guarantees that every transition follows the app’s rules.', a: false,
        why: 'The ID controls admission to the family. The script still has to validate each transition.' },
      { t: 'mc', b: 1, q: 'Why can’t two different families get the same genesis ID by accident?',
        opts: ['The ID is hashed from an outpoint, and an outpoint never repeats', 'Kaspa checks a global list of names', 'IDs are picked at random', 'Each wallet may only start one family'], a: 0,
        why: 'An outpoint can only be spent once, so each genesis hashes something unique.' },
      { t: 'order', q: 'Put the birth of a family in order.', items: [
        'Pick an outpoint to spend', 'Hash it together with the first authorized outputs', 'The result is the new covenant ID', 'The new outputs carry it in a covenant binding'
      ], why: 'Outpoint, hash, ID, binding. That is genesis.' }
    ]
  });

  SK.addLesson({
    id: '4-3', title: 'Auth or cov?', min: 6,
    blurb: 'Two ways to count your family’s envelopes in a transaction.',
    steps: [
      { t: 'say', m: 'hi', x: 'A script often needs to ask: “which envelopes in this transaction are **mine**?” There are two ways to answer, and the choice follows from the topology.' },
      { t: 'explore', x: 'Two bindings.', items: [
        { icon: 'check', h: 'auth: one input authorizes its outputs', x: 'Used for 1:N. The input asks: which outputs did **I** authorize? See [[auth-binding]].' },
        { icon: 'link', h: 'cov: group by covenant ID', x: 'Used for N:M. The script asks: which inputs and outputs in this transaction carry **my family’s ID**? See [[cov-binding]].' }
      ] },
      { t: 'explore', x: 'And these are the questions an envelope can ask. Tap each.', items: [
        { icon: 'search', h: 'OpInputCovenantId', x: 'Which family does input i belong to?' },
        { icon: 'search', h: 'OpOutputCovenantId', x: 'Which family does output i belong to?' },
        { icon: 'check', h: 'OpOutputAuthorizingInput', x: 'Which input approved output i?' },
        { icon: 'check', h: 'OpAuthOutputCount and OpAuthOutputIdx', x: 'How many outputs did input i authorize, and which one is the k-th?' },
        { icon: 'link', h: 'OpCovInputCount and OpCovInputIdx', x: 'How many inputs carry this family ID, and which one is the k-th?' },
        { icon: 'link', h: 'OpCovOutputCount and OpCovOutputIdx', x: 'How many outputs carry this family ID, and which one is the k-th?' }
      ], pro: { h: 'where to find them all', x: 'Every opcode, with its hex value, is in the **Opcodes** tab of the dictionary.' } },
      { t: 'sort', b: 1, code: true, q: 'What does the compiler say?', buckets: ['Compile error', 'Warning only', 'Fine'], items: [
        { t: 'binding=auth, from=3', b: 0, why: 'The auth binding requires from=1.' },
        { t: 'binding=cov, from=1', b: 1, why: 'Allowed, but a warning: auth is the better fit for 1:N.' },
        { t: 'binding=cov with several groups', b: 0, why: 'cov with multiple covenant groups is an error.' },
        { t: 'binding=auth, from=1, to=4', b: 2, why: 'A perfectly normal fan-out.' },
        { t: 'termination=allowed on a fan-out', b: 0, why: 'termination only belongs on a singleton in transition mode.' },
        { t: 'singleton + transition + termination=allowed', b: 2, why: 'The one valid home for termination.' }
      ], why: 'The rules keep declarations unambiguous: auth for from=1, cov for groups, termination only on singletons.' },
      { t: 'mc', b: 1, q: 'Which binding fits a 1:N fan-out?',
        opts: ['auth', 'cov', 'delegate', 'None: fan-outs have no binding'], a: 0,
        why: 'One input authorizes its own outputs, which is exactly what auth does.' },
      { t: 'tf', q: 'A contract with any `binding=cov` declaration is a leader contract.', a: true,
        why: 'cov declarations make the contract a leader. More about leaders in World 5.' },
      { t: 'mc', q: 'You leave out `binding` and `from` is 1. What is the default?',
        opts: ['auth', 'cov', 'A compile error', 'delegate'], a: 0,
        why: 'With from equal to 1 the default is auth. With larger values the default is cov.' }
    ]
  });

  SK.addLesson({
    id: '4-4', title: 'Challenge: the pot splitter', min: 7,
    blurb: 'Split one envelope into many without creating value from nothing.',
    steps: [
      { t: 'say', m: 'wow', x: 'One envelope in, several out. The catch: the pieces must add up to the pot, no more and no less.\n\nSplit a pot yourself first, then read the real thing.' },
      { t: 'widget', w: 'splitter', gate: true, x: 'Split a pot of 10. Make one valid split, then break a rule on purpose.' },
      { t: 'code', ex: 'splitter', x: 'Now the covenant that enforces it.' },
      { t: 'bug', b: 1, q: 'A teammate wrote this. Tap the line that lets someone create value from nothing.', lines: [
        'int total = 0;', 'for(i, 0, new_states.length, max_outs) {', '    total = total + new_states[i].amount;', '}', 'require(total >= prev_state.amount);'
      ], bug: 4, fix: { opts: ['require(total == prev_state.amount);', 'require(total <= prev_state.amount);', 'require(total > prev_state.amount);', 'require(total == prev_state.amount + 1);'], a: 0 }, why: '`>=` allows the pieces to add up to **more** than the pot. It must be `==`.' },
      { t: 'fill', code: true, q: 'Only the owner may split the pot.', text: 'require(checkSig(owner_sig, pubkey(prev_state.___)));', chips: ['owner', 'amount', 'max_outs', 'total'], a: ['owner'],
        why: 'The pot’s `owner` state field holds the key that must sign.' },
      { t: 'mc', q: 'What is `max_outs` for?',
        opts: ['It caps the loop and the number of pieces', 'It sets the fee', 'It picks the leader', 'It is the covenant ID'], a: 0,
        why: 'Loops are unrolled at compile time, so they need a cap. It doubles as the largest allowed fan-out.' },
      { t: 'tf', b: 1, q: 'In the splitter, anyone may split the pot.', a: false,
        why: 'Only a valid signature from the owner passes the `checkSig` line.' },
      { t: 'mc', b: 1, q: 'The pot is 10 and `max_outs` is 4. Which split is accepted?',
        opts: ['4 + 4 + 2', '6 + 6', '3 + 3 + 2 + 1 + 1', '9'], a: 0,
        why: '4 + 4 + 2 adds to 10 with 3 pieces. 6 + 6 is 12, five pieces exceed the cap, and 9 is not 10.' },
      {"t":"say","m":"think","x":"Quick round: what can and cannot a covenant do?"},
      {"t":"tf","b":1,"q":"Setting a Covenant ID on an output forces that output to obey the family’s rules.","a":false,"why":"The ID only names the family. The script must validate the successor’s lock and state."},
      {"t":"mc","b":1,"q":"A Counter-style macro checks the successor’s script. What does it not check by itself?","opts":["The successor’s value","The successor’s lock","The new count","The covenant family"],"a":0,"why":"The successor check compares the lock only. If the value must be preserved, add an explicit value check."},
      {"t":"mc","b":1,"q":"What can a covenant script see?","opts":["Only the transaction that is spending it","Every transaction in the block","The whole UTXO set","Its own past spends"],"a":0,"why":"Introspection reads the current transaction’s inputs, outputs and fields. Anything else has to be passed in through co-spent inputs, outputs or arguments."}
    ]
  });

  SK.addLesson({
    id: '4-5', title: "Workshop: split the pot", min: 8,
    blurb: "Write the rules and the loop of the pot splitter line by line.",
    steps: [
      {"t":"say","m":"hi","x":"Workshop time for the pot splitter. One envelope goes in, several come out, and the pieces must add up to the pot. You will write its rules and its loop yourself."},
      {"t":"say","m":"think","x":"The splitter has four rules: only the **owner** may split, there must be **at least one piece**, every piece must hold **something**, and the pieces must **add up** to the pot."},
      {"t":"slots","mono":true,"b":1,"src":"splitter","q":"Match each rule to the line that enforces it.","slots":["Only the owner may split","There must be at least one piece","Every piece must hold something","The pieces must add up to the pot"],"pieces":["require(checkSig(owner_sig, pubkey(prev_state.owner)));","require(new_states.length > 0);","require(new_states[i].amount > 0);","require(total == prev_state.amount);","require(total >= prev_state.amount);"],"a":[0,1,2,3],"why":"The signature check keeps strangers out, the length check forbids an empty split, the amount check forbids empty pieces, and the sum check must use `==`. The decoy `>=` would let the pieces add up to more than the pot."},
      {"t":"build","src":"splitter","q":"Inside the loop, add this piece’s amount to the running `total`.","tokens":["total","=","total","+","new_states[i].amount",";","prev_state.amount","-"],"a":["total","=","total","+","new_states[i].amount",";"],"why":"The loop visits piece `i` and adds its amount to `total`. After the loop, the covenant compares `total` with the pot."},
      {"t":"build","src":"splitter","q":"Write the loop header: visit every new piece, with a cap of `max_outs`.","tokens":["for(","i",",","0",",","new_states.length",",","max_outs",") {","prev_state.amount","6"],"a":["for(","i",",","0",",","new_states.length",",","max_outs",") {"],"why":"The counter `i` runs from 0 up to the number of pieces. The last argument is the cap, `max_outs`, because loops are unrolled at compile time and must be bounded."},
      {"t":"order","b":1,"mono":true,"src":"splitter","q":"Assemble the body of `split` after the signature check. One line is a decoy.","items":["int total = 0;","for(i, 0, new_states.length, max_outs) {","    require(new_states[i].amount > 0);","    total = total + new_states[i].amount;","}","require(total == prev_state.amount);"],"extra":["require(total >= prev_state.amount);"],"why":"Start the total at zero, loop over the pieces (each one positive, each one added in), then check the sum with `==` after the loop. The `>=` decoy is the classic bug that lets value appear from nothing."},
      {"t":"bug","b":1,"src":"splitter","q":"The totals look right on small splits, but a thief hides value in the later pieces. Tap the buggy line.","lines":["int total = 0;","for(i, 0, new_states.length, max_outs) {","    total = total + new_states[0].amount;","}","require(total == prev_state.amount);"],"bug":2,"fix":{"opts":["total = total + new_states[i].amount;","total = total + prev_state.amount;","total = new_states[i].amount;","total = total + new_states.length;"],"a":0},"why":"The loop visits piece `i`, but this line always reads piece 0. The sum counts the first piece again and again and ignores the rest. With a pot of 10, the pieces 5 and 100 would pass as 5 + 5."},
      {"t":"say","m":"yay","x":"You wrote the rules, the loop and the sum check of a real fan-out covenant. Every line you wrote is a line the compiler would enforce."}
    ]
  });
})();
