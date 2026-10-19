/* World 2: Speak Silver. Silverscript basics: types, decisions, clocks, introspection. */
(function () {
  var SK = window.SK;

  SK.addLesson({
    id: '2-1', title: 'Anatomy of a contract', min: 6,
    blurb: 'Read your first real Silverscript, line by line.',
    steps: [
      { t: 'say', m: 'hi', x: 'Time for code. Don’t panic: Silverscript is short. The smallest useful contract is **five lines**.\n\nYou’ll see real code in a dark box. Tap any line and I’ll translate it into plain English.' },
      { t: 'code', ex: 'p2pk', x: 'This is the plain key lock from World 1, written as a contract. It’s called **P2PK**.' },
      { t: 'say', m: 'think', x: 'Three words to remember.\n\nA [[contract]] is the whole program. A [[constructor|constructor parameter]] is a value baked in when the envelope is created, like writing the owner’s name on it. An [[entry]] is one way to open it.' },
      { t: 'code', ex: 'timeout', x: 'A contract can have **several entries**. Each is a different door with different rules. Here are two.' },
      { t: 'mc', b: 1, q: 'In TransferWithTimeout, who can use the `reclaim` door, and when?',
        opts: ['The sender, but only after the timeout', 'The recipient, at any time', 'Anyone, after the timeout', 'The sender, at any time'], a: 0,
        why: 'reclaim needs the sender’s signature and `tx.time >= timeout`.' },
      { t: 'mc', q: 'What happens when the condition inside `require(...)` is false?',
        opts: ['The spend fails and nothing moves', 'A warning is printed and the spend carries on', 'The line is retried', 'The coins go back to the sender'], a: 0,
        why: '`require` is a guard. If it fails, the whole spend is rejected.' },
      { t: 'tf', b: 1, q: 'A contract can only have one entry.', a: false,
        why: 'A contract can have several entries. Each one is a different way to open it.' },
      { t: 'order', b: 1, mono: true, q: 'Build the P2PK contract. Put the lines in order.', items: [
        'pragma silverscript ^0.1.0;', 'contract P2PK(pubkey pk) {', '    entry spend(sig s) {', '        require(checkSig(s, pk));', '    }', '}'
      ], why: 'Version line, then the contract, then its entry, then the guard, then close the entry and the contract.' },
      { t: 'fill', code: true, q: 'Complete the signature check.', text: 'require(checkSig(s, ___));', chips: ['pk', 's', 'tx', 'timeout'], a: ['pk'],
        why: '`checkSig(s, pk)` asks: is `s` a valid signature for the key `pk`?' }
    ]
  });

  SK.addLesson({
    id: '2-2', title: 'Types: labels on the boxes', min: 6,
    blurb: 'Every value has a type. Meet the main ones, including the time-flavoured temporal.',
    steps: [
      { t: 'say', m: 'hi', x: 'Every value in Silverscript has a **type**: a label that tells the compiler what’s in the box.\n\nTypes catch silly mistakes before they can cost real money.' },
      { t: 'explore', x: 'Meet the main types. Tap each one.', items: [
        { icon: 'coin', h: 'int', x: 'A whole number, stored in 64 bits and signed. `42`, `-100`.' },
        { icon: 'check', h: 'bool', x: '`true` or `false`.' },
        { icon: 'code', h: 'byte and byte[N]', x: 'Raw bytes. `byte[32]` is exactly 32 bytes, the size of a hash. Hex literals like `0xff` are bytes.' },
        { icon: 'lock', h: 'pubkey, sig and datasig', x: 'A [[pubkey|public key]] is 32 bytes. A [[signature]] (`sig`) is 65 bytes. A `datasig` is a 64-byte signature over data.' },
        { icon: 'book', h: 'string', x: 'UTF-8 text, for example the message in a `require`.' },
        { icon: 'flame', h: 'temporal', x: 'A time value in milliseconds. Same math as `int`, but a separate type on purpose. More on that next.' },
        { icon: 'tree', h: 'Arrays', x: '`int[]` is a list of any length. `int[3]` is a list of exactly three.' }
      ], pro: { h: 'how ints are stored', x: 'Ints are encoded as 8-byte signed-magnitude values. For example, -5 is `05 00 00 00 00 00 00 80`.' } },
      { t: 'say', m: 'think', x: '[[temporal]] deserves a second look. It’s an `int` in a clock costume. Same arithmetic, but the compiler won’t let you mix a time with a plain number by accident.\n\nIf you really mean it, you **cast**. A cast costs nothing at runtime. It only changes the label.' },
      { t: 'code', title: 'Casting', badge: 'sketch', lines: [
        ['int delay = 100;', 'A plain number.'],
        ['temporal wait = temporal(delay);', 'Same bits, new label. Now the compiler treats it as a time.'],
        ['int back = int(wait);', 'And back again.']
      ] },
      { t: 'sort', b: 1, code: true, q: 'Which type fits this value?', buckets: ['int', 'bool', 'temporal', 'byte'], items: [
        { t: '-100', b: 0, why: 'A whole number.' },
        { t: 'false', b: 1, why: 'true or false is a bool.' },
        { t: '30 seconds', b: 2, why: 'A duration is a temporal.' },
        { t: '0xff', b: 3, why: 'A hex literal is a byte.' },
        { t: '1000', b: 0, why: 'A plain whole number is an int.' }
      ], why: 'Numbers are ints, times are temporals, hex literals are bytes.' },
      { t: 'mc', b: 1, q: 'Can you add an `int` and a `temporal` directly?',
        opts: ['No. Convert one of them first with a cast', 'Yes, and the result is always an int', 'Yes, and the result is always a temporal', 'Only inside a loop'], a: 0,
        why: 'They are different types on purpose, so you can’t mix times and plain numbers by accident.' },
      { t: 'match', q: 'Match each type to its size.', pairs: [['pubkey', '32 bytes'], ['sig', '65 bytes'], ['datasig', '64 bytes'], ['int', '64-bit signed']], why: 'Sizes matter when you check lengths or build scripts.' },
      { t: 'tf', b: 1, q: 'A cast between `int` and `temporal` adds extra instructions at runtime.', a: false,
        why: 'Casts are compile-time only. No runtime conversion opcode is emitted.' }
    ]
  });

  SK.addLesson({
    id: '2-3', title: 'Decisions and loops', min: 6,
    blurb: 'if, else, require, and the loop that gets copied before it ever runs.',
    steps: [
      { t: 'say', m: 'hi', x: 'Contracts make decisions. Silverscript has the usual `if` and `else`, plus the guard you already know: `require`.' },
      { t: 'code', title: 'if, else and require', badge: 'sketch', lines: [
        ['if (x > 10) {', 'If x is bigger than 10…'],
        ['    require(y == 0);', '…then y must be zero.'],
        ['} else {', 'Otherwise…'],
        ['    require(y > 0, "y must be positive");', '…y must be positive. The text after the comma is an optional message for when the check fails.'],
        ['}']
      ] },
      { t: 'say', m: 'think', x: 'Loops are the odd one out. A Silverscript loop looks like `for(i, 0, 3, 5)`. Four parts: the counter `i`, where it **starts**, where it **stops** (not included), and a **maximum**.\n\nWhy a maximum? Because the compiler **copies the loop body that many times** before the contract ever runs. No surprises at runtime.' },
      { t: 'widget', w: 'loopUnroll', gate: true, x: 'Slide start and end. Watch the copies light up.' },
      { t: 'reveal', id: 'unroll-bound', term: 'Unroll bound', plain: 'The biggest number of times a loop may run, fixed when the contract is compiled.',
        x: 'The compiler emits exactly that many copies of your loop body, each one guarded by a check. That keeps the cost predictable.' },
      { t: 'mc', b: 1, q: 'How many times does `for(i, 0, 3, 5)` run?',
        opts: ['3 times (i = 0, 1, 2)', '4 times', '5 times', 'Until a require fails'], a: 0,
        why: 'The end value is excluded, so i runs 0, 1, 2. The 5 is only the maximum bound.' },
      { t: 'mc', q: 'What does `for(i, 5, 2, 8)` do?',
        opts: ['Nothing, because start is not below end', 'Counts down from 5 to 3', 'Runs 8 times', 'Runs forever'], a: 0,
        why: 'Loops count up. When start is not below end there are zero iterations.' },
      { t: 'mc', b: 1, q: 'Why do contracts like the pot splitter take a `max_outs` parameter?',
        opts: ['Loops need a compile-time cap, because they are unrolled', 'To limit how much KAS can be sent', 'To choose which output is the leader', 'To set the transaction fee'], a: 0,
        why: 'The loop body is copied `max_outs` times at compile time, so the cap has to be known up front.' },
      { t: 'tf', b: 1, q: 'You can always rely on a runtime check that stops a loop going past its bound.', a: false,
        why: 'The compiler may remove that runtime check. Validate your bounds yourself, for example `require(list.length <= max)`.' },
      { t: 'fill', code: true, q: 'Visit every item in `items`, with a cap of 6.', text: 'for(i, 0, ___, 6) { ... }', chips: ['items.length', '6', 'i', '0'], a: ['items.length'],
        why: 'The end is the number of items. The last argument, 6, is the unroll bound.' }
    ]
  });

  SK.addLesson({
    id: '2-4', title: 'Clocks', min: 5,
    blurb: 'Two clocks, one magic threshold, and how to say “not before Friday”.',
    steps: [
      { t: 'say', m: 'hi', x: 'Contracts often need time. “Only after Friday.” “Only if it’s been a week.” Kaspa gives you two clocks.' },
      { t: 'explore', x: 'Tap each idea.', items: [
        { icon: 'bolt', h: 'The DAA score', x: 'A counter that ticks up as the network moves forward, like a block height. See [[daa-score]]. Used by `tx.daa` and `this.ageDaa`.' },
        { icon: 'flame', h: 'The timestamp', x: 'A real-world time in milliseconds. Used by `tx.time`.' },
        { icon: 'lock', h: 'Absolute versus relative', x: 'Absolute means “not before this exact moment”. Relative means “not until this envelope is N old”.' }
      ] },
      { t: 'table', x: 'Three ways to write a time lock.', code: true, cols: ['Write', 'Type', 'Meaning'], rows: [
        ['tx.daa >= N', 'int', 'Absolute lock by DAA score'],
        ['tx.time >= T', 'temporal', 'Absolute lock by timestamp'],
        ['this.ageDaa >= N', 'int', 'Relative lock: how old this envelope is']
      ], pro: { h: 'Bitcoin-style names', x: 'Absolute locks are CLTV-style and relative locks are CSV-style. The relative threshold must satisfy 0 <= value < 2^32.' } },
      { t: 'say', m: 'think', x: 'How does Kaspa tell the two clocks apart? One magic number: **500,000,000,000**.\n\nBelow it, a value is a DAA score. At or above it, a value is a timestamp in milliseconds. It’s called the lock-time threshold.' },
      { t: 'sort', b: 1, code: true, q: 'Which clock can this value belong to?', buckets: ['DAA score (tx.daa)', 'Timestamp (tx.time)', 'Neither'], items: [
        { t: '120000', b: 0, why: 'Below the threshold, so a DAA score.' },
        { t: '1760000000000', b: 1, why: 'At or above 500,000,000,000, so a timestamp.' },
        { t: '499999999999', b: 0, why: 'One below the threshold is still a DAA score.' },
        { t: '500000000000', b: 1, why: 'The threshold itself starts the timestamp range.' },
        { t: '-5', b: 2, why: 'Negative values are not valid for either clock.' }
      ], why: 'Below 500,000,000,000 is a DAA score. At or above it is a timestamp.' },
      { t: 'code', title: 'The reclaim door, again', badge: 'docs', x: 'Here is a time lock in the wild.', lines: [
        ['entry reclaim(sig senderSig) {', 'Door 2 of TransferWithTimeout.'],
        ['    require(checkSig(senderSig, sender));', 'The sender signs…'],
        ['    require(tx.time >= timeout);', '…and the transaction’s timestamp must be at or after `timeout`. An absolute time lock.'],
        ['}']
      ] },
      {"t":"build","b":1,"src":"mecenas","q":"Write a **relative** lock: the envelope being spent must be at least `period` old, measured in DAA score.","tokens":["require(","this.ageDaa",">=","period",");","tx.daa","tx.time","<="],"a":[["require(","this.ageDaa",">=","period",");"],["require(","period","<=","this.ageDaa",");"]],"why":"`this.ageDaa` measures how old this particular envelope is, so the lock is relative to its creation. `tx.daa` and `tx.time` are absolute clocks: they compare with a fixed point on the calendar, not with the envelope’s age."},
      { t: 'mc', q: 'A teammate writes `tx.daa >= 600000000000`. What happens?',
        opts: ['It is rejected: a DAA score must be below 500,000,000,000', 'It works as a timestamp lock', 'It works and rounds down', 'It is always true'], a: 0,
        why: 'DAA-score values must be below the threshold. Constants that break that rule are rejected at compile time.' },
      { t: 'tf', q: '`tx.time` is compared with a `temporal` value, not a plain `int`.', a: true,
        why: 'That is why `timeout` is declared as `temporal` in TransferWithTimeout.' }
    ]
  });

  SK.addLesson({
    id: '2-5', title: 'Peeking at the transaction', min: 7,
    blurb: 'The covenant superpower: a script that reads the transaction spending it.',
    steps: [
      { t: 'say', m: 'wow', x: 'Here’s the superpower. A covenant script can **look at the transaction that is spending it**.\n\nWhich inputs? How many outputs? How much is going where? Let’s peek.' },
      { t: 'widget', w: 'introspect', gate: true, x: 'Tap the expressions. Each one points at something in this transaction.' },
      { t: 'say', m: 'think', x: '`tx.inputs[i]` and `tx.outputs[i]` are lists you can index.\n\n`this.activeInputIndex` is **which input is running this script right now**. A script needs it to find itself inside the transaction.' },
      { t: 'code', ex: 'mecenas', x: 'Now a real contract that uses all of it: **Mecenas**, a subscription pot. Tap lines and follow the story.',
        pro: { h: 'the opcodes behind the expressions', x: '`tx.inputs.length` is OpTxInputCount (0xb3), `tx.outputs[i].value` is OpTxOutputAmount (0xc2) and `this.activeInputIndex` is OpTxInputIndex (0xb9). The full table is in the Words tab.' } },
      {"t":"build","b":1,"src":"mecenas","q":"Read the amount of the envelope this script is opening into an `int` called `val`.","tokens":["int","val","=","tx.inputs[this.activeInputIndex]",".value",";","tx.outputs[0]",".scriptPubKey"],"a":["int","val","=","tx.inputs[this.activeInputIndex]",".value",";"],"why":"The inputs list is indexed with “my own position”, `this.activeInputIndex`, so `.value` is the amount of the envelope being opened by this script. `tx.outputs[0]` would be the first output instead."},
      { t: 'fill', b: 1, code: true, q: 'Make output 0 pay exactly one pledge.', text: 'require(tx.outputs[0].___ == pledge);', chips: ['value', 'scriptPubKey', 'version', 'length'], a: ['value'],
        why: '`.value` is the amount. `.scriptPubKey` would be the lock.' },
      {"t":"build","src":"mecenas","q":"Mecenas keeps the pot alive. Output 1 must carry the **same lock** as the envelope being spent. Write the check.","tokens":["require(","tx.outputs[1]",".scriptPubKey","==","tx.inputs[this.activeInputIndex]",".scriptPubKey",");",".value","tx.outputs[0]"],"a":[["require(","tx.outputs[1]",".scriptPubKey","==","tx.inputs[this.activeInputIndex]",".scriptPubKey",");"],["require(","tx.inputs[this.activeInputIndex]",".scriptPubKey","==","tx.outputs[1]",".scriptPubKey",");"]],"why":"Output 1 is the successor pot. Its lock, `scriptPubKey`, must equal the lock of the input being spent, so the same rules guard the leftover money. Another line checks that its `value` equals the change."},
      { t: 'match', b: 1, q: 'Match each expression to what it gives.', pairs: [
        ['tx.outputs.length', 'How many new envelopes'], ['tx.inputs[i].value', 'Amount in a spent envelope'], ['this.activeInputIndex', 'Which input runs this script'], ['tx.version', 'The transaction format version']
      ], why: 'These four are the everyday introspection expressions.' },
      { t: 'tf', q: 'In Mecenas, the recipient must sign to use the `receive` entry.', a: false,
        why: 'The rules force the money to the recipient, so no signature is needed to trigger it.' },
      {"t":"say","m":"think","x":"Quick round: can a covenant do that? Judge each statement."},
      {"t":"tf","b":1,"q":"A covenant runs by itself when its time lock expires.","a":false,"why":"A covenant only runs when someone spends its UTXO. Time locks decide when a spend becomes valid, not what triggers it."},
      {"t":"tf","b":1,"q":"A Silverscript `for` loop can repeat an unbounded number of times.","a":false,"why":"Loops are unrolled at compile time, so they need a cap, like `max_outs` in the pot splitter."},
      {"t":"tf","b":1,"q":"`byte[32](data)` checks that `data` really has 32 bytes.","a":false,"why":"A cast only reinterprets the bytes. It does not check the length."}
    ]
  });

  SK.addLesson({
    id: '2-6', title: "Workshop: write the rules", min: 7,
    blurb: "Now you write the code: build lines, assemble a door, fix a bug.",
    steps: [
      {"t":"say","m":"hi","x":"Workshop time. Until now you picked answers. Now you **write** the code. Each task states a rule in plain words, and you build the line that enforces it."},
      {"t":"say","m":"think","x":"How it works: tap pieces to add them to the line. Tap a piece **in the line** to take it back. Some pieces are decoys that look right but are not, so read the rule twice. When a rule can be written two ways, either one counts."},
      {"t":"build","b":1,"src":"p2pk","q":"Open a door called `spend` that takes a signature named `s`.","tokens":["entry","spend(","sig","s",") {","contract","pubkey","function"],"a":["entry","spend(","sig","s",") {"],"why":"An entry starts with the word `entry`, then its name, then its inputs in parentheses, each written as a type followed by a name: `sig s`. The line ends with an opening brace."},
      {"t":"build","b":1,"src":"timeout","q":"The sender may take the money back only **at or after** the deadline `timeout`. Write the time check.","tokens":["require(","tx.time",">=","timeout",");","<=","this.ageDaa"],"a":["require(","tx.time",">=","timeout",");"],"why":"`tx.time` is the time the spending transaction claims. “At or after” is `>=`. With `<=` the sender could reclaim early and the deadline would mean nothing."},
      {"t":"build","src":"mecenas","q":"Mecenas pays the recipient one pledge and keeps the rest. Write the line that computes the **change**: the pot value `val`, minus the pledge, minus the miner fee.","tokens":["int","change","=","val","-","pledge","-","minerFee",";","+"],"a":[["int","change","=","val","-","pledge","-","minerFee",";"],["int","change","=","val","-","minerFee","-","pledge",";"]],"why":"The pot holds `val`. The pledge goes to the recipient and the miner fee goes to the miners. What is left is the change, which goes back into a new pot envelope. Subtracting in either order gives the same number, so both orders count."},
      {"t":"slots","mono":true,"src":"timeout","q":"Match each rule of TransferWithTimeout to the line that enforces it.","slots":["Only the recipient may use `transfer`","Only the sender may use `reclaim`","Reclaim works only after the deadline"],"pieces":["require(checkSig(recipientSig, recipient));","require(checkSig(senderSig, sender));","require(tx.time >= timeout);","require(tx.time <= timeout);"],"a":[0,1,2],"why":"Each door has its own signature rule: the recipient’s key for `transfer`, the sender’s key for `reclaim`. The deadline belongs only to `reclaim`, and `>=` makes it a “not before” rule. The decoy `<=` would be a “not after” rule."},
      {"t":"order","b":1,"mono":true,"src":"timeout","q":"Build the `reclaim` door of TransferWithTimeout. Two of the lines are decoys.","items":["entry reclaim(sig senderSig) {","    require(checkSig(senderSig, sender));","    require(tx.time >= timeout);","}"],"extra":["    require(tx.time <= timeout);","    require(checkSig(senderSig, recipient));"],"why":"The entry line, then the sender’s signature check, then the deadline check, then the closing brace. The decoy with `<=` would allow an early reclaim, and the decoy that checks the recipient’s key would let the wrong person in."},
      {"t":"bug","src":"timeout","q":"Only the recipient should be able to use `transfer`. Tap the line that lets the wrong person in.","lines":["entry transfer(sig recipientSig) {","    require(checkSig(recipientSig, sender));","}"],"bug":1,"fix":{"opts":["require(checkSig(recipientSig, recipient));","require(checkSig(recipientSig, timeout));","require(checkSig(senderSig, recipient));","require(tx.time >= timeout);"],"a":0},"why":"The `transfer` door belongs to the recipient, so the signature must be checked against `recipient`. Checking `sender` hands the recipient’s door to the sender."},
      {"t":"say","m":"yay","x":"You just wrote the guard lines of real contracts: a header, a time lock, an amount and a pair of doors. Next up: contracts that **remember**."}
    ]
  });
})();
