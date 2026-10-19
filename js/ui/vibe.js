/* Vibe Check: "VibeBot" shows a real contract with one line broken and swears it is safe.
   The player finds the line, then picks the repair. Every repair is copied from the contract
   library (SK.examples, badge docs), so the right answer can never drift from the contract.
   Row: [example id, first line, last line, broken line, broken text, wrong repairs, why, VibeBot's claim] */
(function () {
  var SK = window.SK;
  var C = [
    ['timeout', 6, 9, 7, 'require(checkSig(senderSig, recipient));',
      ['require(checkSig(recipientSig, sender));', 'require(checkSig(senderSig, timeout));', 'require(checkSig(sender, senderSig));'],
      'The sender’s door must check the **sender’s** key. With `recipient` here the sender can never take the money back, and the recipient gets a second way in.', 'Only the sender can reclaim. Audited and safe.'],
    ['p2pk', 3, 5, 4, 'require(true);',
      ['require(checkSig(pk, s));', 'require(s != pk);', 'require(checkSig(s, s));'],
      '`require(true)` always passes, so **anyone** can spend. The lock needs `checkSig(s, pk)`: the signature first, then the key. Swapping them is the same kind of slip.', 'I simplified the lock. Same security, fewer lines.'],
    ['mecenas', 3, 6, 4, 'require(this.ageDaa <= period);',
      ['require(this.ageDaa == period);', 'require(tx.time >= period);', 'require(this.ageDaa >= pledge);'],
      '`<=` allows withdrawals while the envelope is young and blocks them later. The rule is a **minimum** age: `>= period`.', 'The payout is time-gated. I double checked.'],
    ['mecenas', 18, 20, 19, 'require(blake2b(byte[](pk)) != funder);',
      ['require(blake2b(byte[](pk)) == recipient);', 'require(pk == funder);', 'require(blake2b(byte[](funder)) == pk);'],
      '`!=` accepts every key **except** the funder’s, the opposite of the point. The hash of the revealed key must equal the stored `funder` hash.', 'Only the funder can pull the money back. Verified.'],
    ['splitter', 10, 16, 15, 'require(total >= prev_state.amount);',
      ['require(total <= prev_state.amount);', 'require(total != prev_state.amount);', 'require(total > prev_state.amount);'],
      '`>=` lets the pieces add up to **more** than the old pot: free money. The pieces must add up to exactly the old amount, so `==`.', 'The pot is split exactly. No money is created.'],
    ['splitter', 6, 9, 8, 'require(checkSig(owner_sig, pubkey(new_states[0].owner)));',
      ['require(checkSig(owner_sig, pubkey(init_owner)));', 'require(checkSig(pubkey(prev_state.owner), owner_sig));', 'require(prev_state.owner == new_states[0].owner);'],
      'The new pieces are written by whoever builds the transaction. If the signature is checked against **their** owner field, a thief just names themselves. Check the owner stored in `prev_state`, the envelope being spent.', 'Only the owner can split. I tested it.'],
    ['vault', 19, 24, 24, 'require(in_sum <= out_sum);',
      ['require(in_sum != out_sum);', 'require(in_sum == 0);', 'require(in_sum >= out_sum + 1);'],
      '`<=` lets the outputs hold more than the inputs: the vault prints money. Outputs may never sum to more than inputs, so `in_sum >= out_sum`.', 'Value is conserved across the vault. Looks great.'],
    ['minter', 22, 25, 24, 'require(prev_state.initialized);',
      ['require(prev_state.amount == 0);', 'require(prev_state.initialized == true);', 'require(!prev_state.isMinter);'],
      'One missing `!`. The init step must run only while the minter is **not** yet initialized. As written it can never run the first time.', 'Init runs once and only once. Production ready.'],
    ['minter', 33, 37, 36, 'require(mintAmount >= prev_state.amount);',
      ['require(mintAmount == prev_state.amount);', 'require(mintAmount != prev_state.amount);', 'require(mintAmount >= 0);'],
      'A cap is a **ceiling**. `>=` demands at least the whole allowance and allows anything above it, so the supply cap means nothing. It must be `<=`.', 'Minting is capped by the allowance. 100% secure.'],
    ['timeout', 6, 9, 8, 'require(tx.timestamp >= timeout);',
      ['require(tx.time <= timeout);', 'require(this.ageDaa >= timeout);', 'require(tx.time == timeout);'],
      'Models love inventing plausible names. The docs list `tx.time`, not `tx.timestamp`. **If a name is not in the docs, do not trust it**, however confident the AI sounds.', 'Timeout logic is straightforward. Ship it.']
  ];

  function build(c) {
    var ex = SK.examples && SK.examples[c[0]], lines = [], i;
    if (!ex) return null;
    for (i = c[1]; i <= c[2]; i++) { if (!ex.lines[i]) return null; lines.push(ex.lines[i][0]); }
    var ind = Math.min.apply(null, lines.filter(function (l) { return l.trim(); }).map(function (l) { return l.match(/^\s*/)[0].length; }));
    lines = lines.map(function (l) { return l.slice(ind); }); // dedent: contract-level indent wastes phone width
    var at = c[3] - c[1], orig = lines[at], good = orig.trim();
    lines[at] = orig.match(/^\s*/)[0] + c[4];
    var opts = SK.shuffle(c[5].concat(good));
    return { key: null, step: { t: 'bug', q: '**VibeBot says:** “' + c[7] + '” Tap the line that proves it wrong.', lines: lines, bug: at, fix: { opts: opts, a: opts.indexOf(good) }, why: c[6] } };
  }

  SK.vibe = { rows: C, build: build };
  SK.vibeSteps = function (n) { return SK.shuffle(C.slice()).map(build).filter(Boolean).slice(0, n); };
})();
