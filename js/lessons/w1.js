/* World 1: Envelope Town. Kaspa basics with zero code. One new idea per lesson, and a real term only after the player has done something with it. */
(function () {
  var SK = window.SK;

  SK.addLesson({
    id: '1-1', title: 'Coins live in envelopes', min: 5,
    blurb: 'How Kaspa really holds money, and why that makes it fast.',
    steps: [
      { t: 'say', m: 'hi', x: 'Hi, I’m Sil. By the end of this quest you’ll be able to read smart-contract code that most people find scary.\n\nBut first, forget code. Forget jargon. We’re going to talk about **envelopes**.' },
      { t: 'say', m: 'think', x: 'On Kaspa, your money is not a number in an account. It’s a set of **sealed envelopes**, and each one holds some coins.\n\nHave 10 KAS? You might own one envelope with 10 inside. Let’s open it.' },
      { t: 'widget', w: 'envelopes', gate: true, x: 'Pay your friend Sam 3 KAS. Open the envelope, choose an amount, and send it.' },
      { t: 'reveal', id: 'utxo', term: 'UTXO', plain: 'A sealed envelope of coins that nobody has opened yet.',
        x: '“Unspent” means nobody has opened it yet. You never edit an envelope. You open it once, and it is replaced by new ones: one for Sam, one for your change.' },
      { t: 'mc', b: 1, q: 'You open a 10 KAS envelope and send 3 KAS to Sam. What happens to the original envelope?',
        opts: ['It stays, now holding 7 KAS', 'It is used up, and new envelopes are created', 'It is split in half automatically', 'Sam receives the original envelope'], a: 1,
        why: 'A UTXO is immutable. Spending it destroys it and creates new UTXOs: here, one for Sam and one for your change.' },
      { t: 'say', m: 'think', x: 'Many blockchains work like a bank ledger: one big book of balances that everyone edits. Kaspa works with envelopes instead. That difference matters a lot.' },
      { t: 'compare', x: 'Two ways to keep track of money.',
        a: { h: 'Account model (like Ethereum)', items: ['State is **centralized** in account storage', 'Storage slots are **updated in place**', 'Updates are **sequential**, because they share global state'] },
        b: { h: 'Envelope model (Kaspa)', items: ['State is **spread across** many UTXOs', 'UTXOs are **immutable**: spend one, create new ones', '**Naturally parallel**: independent envelopes share nothing'] } },
      { t: 'widget', w: 'parallel', gate: true, x: 'Four people pay at the same time. See what happens in each model.' },
      { t: 'tf', b: 1, q: 'On Kaspa, a transaction edits the amount inside an existing envelope.', a: false,
        why: 'Envelopes are immutable. A transaction spends old UTXOs and creates new ones.' },
      { t: 'mc', b: 1, q: 'Why can Kaspa handle unrelated payments side by side?',
        opts: ['Each UTXO is independent, so unrelated spends don’t fight over shared state', 'Miners process payments in a secret order', 'Every payment is routed through one very fast server', 'Payments are only checked once a day'], a: 0,
        why: 'No shared mutable state means no queue for unrelated spends. That is what “naturally parallel” means.' },
      { t: 'order', q: 'Put the steps of a payment in order.', items: ['Pick an envelope you own', 'Open it (spend it)', 'Create new envelopes: the payment and your change'],
        why: 'That is every Kaspa payment: pick, open, replace.' }
    ]
  });

  SK.addLesson({
    id: '1-2', title: 'Envelopes with locks', min: 4,
    blurb: 'A key lock asks one question: who is opening? Try it with and without the key.',
    steps: [
      { t: 'say', m: 'hi', x: 'In the last lesson you opened your own envelope and sent coins to Sam. What stops a stranger from opening it too?\n\nEvery envelope has a **lock**. Yours opens with your key.' },
      { t: 'widget', w: 'keylock', gate: true, x: 'Try to open this envelope. First without the key, then with it.' },
      { t: 'reveal', term: 'Signature', plain: 'A mark that only your key can make. It proves the person opening the envelope is the one who holds the key.',
        x: 'Your wallet makes a signature for every spend. The lock checks it, and a valid signature opens the envelope.' },
      { t: 'mc', q: 'You try to open the envelope without its key. What happens?',
        opts: ['The lock stays shut', 'It opens anyway', 'The coins disappear'], a: 0,
        why: 'No key, no opening. That is what a lock is for.' },
      { t: 'say', m: 'think', x: 'So a key lock asks **one** question: who is opening this?\n\nNow look at what it did **not** ask. Once your key turned, you could send the coins anywhere, even to Mallory. The lock had no say in where the coins went next.' },
      { t: 'tf', b: 1, q: 'Once the key has opened an envelope, a plain key lock still checks where the coins go.', a: false,
        why: 'A key lock only asks who is opening. After that, the owner can send the coins anywhere.' },
      { t: 'match', q: 'Match each moment to what the lock does.', pairs: [
        ['No key', 'The lock stays shut'], ['The right key', 'The envelope opens'], ['Where the coins go next', 'The lock never asks']
      ], why: 'A key lock checks one thing: who is opening. It has no opinion about what happens after.' },
      { t: 'say', m: 'yay', x: 'That gap is what the next lesson is about. What if a lock **could** care where the coins go?' }
    ]
  });

  SK.addLesson({
    id: '1-3', title: 'A lock that checks the spend', min: 5,
    blurb: 'A key lock only asks who. This lock also checks where the coins go.',
    steps: [
      { t: 'say', m: 'think', x: 'A key lock asks **who** is opening. What if an envelope could also say:\n\n“You may open me, but the new envelopes must look the way I say.”\n\nThat is a rule about the **future**. Let’s see why it matters.' },
      { t: 'widget', w: 'gate', gate: true, plain: true, x: 'Try the same spends under two kinds of lock.' },
      { t: 'reveal', term: 'Covenant', plain: 'A rule stapled to an envelope that says what the next envelopes must look like.',
        x: 'A covenant doesn’t only ask **who** is opening the envelope. It checks the **whole spend**: where the money goes, how much, and what lock each new envelope carries.' },
      { t: 'mc', q: 'In the toy, the covenant blocked a spend you had signed. Why?',
        opts: ['The new envelopes broke its rule', 'Your key did not fit', 'The envelope was empty'], a: 0,
        why: 'Your signature was fine. The covenant looked at where the money would go, and said no.' },
      { t: 'explore', x: 'A covenant can look at quite a lot of the spend. Tap to see what.', items: [
        { icon: 'envelope', h: 'The new envelopes', x: 'How many there are, and what each one holds.' },
        { icon: 'coin', h: 'The amounts', x: 'How much goes where.' },
        { icon: 'lock', h: 'The new locks', x: 'What lock each new envelope carries: the same rule again, a plain key, something else?' },
        { icon: 'search', h: 'The envelopes being opened', x: 'Which ones are opened together, and how much they hold.' },
        { icon: 'info', h: 'Other details of the spend', x: 'Lock time, a note attached to the spend, and more.' }
      ] },
      { t: 'reveal', term: 'Introspection', plain: 'Looking at the spend. The rule reads the details of the spend it guards before it lets it through.',
        x: 'Every covenant runs on this ability: looking at the spend it is guarding.',
        pro: { h: 'The precise version', x: 'A covenant is a spending condition that uses KIP-17 and KIP-20 introspection opcodes to constrain the properties, outputs and templates of the spending transaction.' } },
      { t: 'tf', b: 1, q: 'A covenant can require that a certain amount goes to a certain person.', a: true,
        why: 'How much goes where is exactly what a covenant can look at.' },
      { t: 'mc', b: 1, q: 'How is a covenant different from a plain signature lock?',
        opts: ['It also checks the spend: where the coins go and how much', 'It makes the spender pay a second fee', 'It runs the rule on a separate computer', 'It makes the envelope impossible to open'], a: 0,
        why: 'A plain lock checks who is spending. A covenant also constrains what the spend may do.' },
      { t: 'say', m: 'yay', x: 'Covenant = a lock **plus** a rule about the future.\n\nHold on to that. The rest of this quest is variations on it.' }
    ]
  });

  SK.addLesson({
    id: '1-4', title: 'The sticky note inside', min: 7,
    blurb: 'Where a covenant keeps its memory, and why fingerprints change but family badges don’t.',
    steps: [
      { t: 'say', m: 'hi', x: 'Welcome back! Before we give envelopes a memory, a quick look back at the two kinds of lock.' },
      { t: 'say', m: 'think', x: 'Here is the trick for the next cards. A covenant can do **everything** a key lock does, and more. So ask yourself: does this need a look at the spend, or only at the key?' },
      { t: 'sort', b: 1, q: 'Who can check this: a plain key lock, or only a covenant?', buckets: ['A plain key lock can', 'Only a covenant can'], items: [
        { t: 'Did the owner sign this spend?', b: 0, why: 'Checking the signature is all a plain key lock does.' },
        { t: 'Does Alice receive at least 5 KAS?', b: 1, why: 'That is about where the coins go, so it needs a rule that looks at the spend.' },
        { t: 'Does the new envelope carry the same rule?', b: 1, why: 'Looking at the lock on a new envelope is covenant territory.' },
        { t: 'Is this signature valid for this key?', b: 0, why: 'A plain key lock does exactly this.' },
        { t: 'Are there exactly two new envelopes?', b: 1, why: 'Counting the new envelopes means looking at the spend.' }
      ], why: 'Plain locks check the signer. Covenants check the spend.' },
      { t: 'say', m: 'hi', x: 'Many covenants need memory: a counter, a balance, who owns what. But envelopes can’t be edited.\n\nSo where does the memory live?' },
      { t: 'say', m: 'think', x: 'Inside the envelope there’s a **sticky note**. That’s really the script. The memory (the **state**) is written on that note.\n\nOn the outside, the envelope shows a **fingerprint**: a short code computed from what’s inside. Change the note and the fingerprint changes too.' },
      { t: 'widget', w: 'fingerprint', gate: true, x: 'Spend this counter envelope three times. Watch the two codes.',
        pro: { h: 'what “hash” means', x: 'A hash function squeezes any data into a fixed-size fingerprint. The same input always gives the same fingerprint, and a tiny change gives a completely different one. The codes in this toy are for illustration only, not real BLAKE2b.' } },
      { t: 'reveal', id: 'p2sh', term: 'P2SH', plain: 'The fingerprint on the outside of the envelope: a hash of the script and sticky note inside.',
        x: 'It stands for Pay-to-Script-Hash. The outside only shows the hash. The script itself, with its state, is called the **redeem script**, and it is revealed when you open the envelope.' },
      { t: 'reveal', id: 'covenant-id', term: 'Covenant ID', plain: 'A badge Kaspa stamps on every envelope in the family, so the family stays recognisable while fingerprints change.',
        x: 'Fingerprints change every time the state does. The covenant ID doesn’t. Kaspa itself keeps track of it, which gives a covenant a stable identity.' },
      { t: 'mc', b: 1, q: 'A covenant’s state changes from 3 to 4. What changes on the outside of the envelope?',
        opts: ['Its fingerprint (the P2SH hash)', 'Its covenant ID', 'Nothing: state lives off-chain', 'The Kaspa block time'], a: 0,
        why: 'State is encoded in the redeem script. New state means a new script hash, so a new fingerprint on the outside. The covenant ID stays.' },
      { t: 'tf', b: 1, q: 'The covenant ID changes every time the state changes.', a: false,
        why: 'The covenant ID is the stable part. The fingerprint (script hash) is what changes.' },
      { t: 'fill', q: 'Fill in the blank.', text: 'State lives in the ___ script of a P2SH envelope.', chips: ['redeem', 'coinbase', 'account', 'genesis'], a: ['redeem'],
        why: 'State is encoded in the redeem script preimage: the script hidden behind the hash.' },
      { t: 'match', b: 1, q: 'Match each thing to what it does.', pairs: [
        ['Fingerprint (script hash)', 'Changes whenever the state changes'], ['Covenant ID', 'Stays the same for the whole family'], ['State', 'Lives inside the redeem script']
      ], why: 'Fingerprint changes, ID stays, state lives in the script.' }
    ]
  });

  SK.addLesson({
    id: '1-5', title: 'Meet Toccata', min: 6,
    blurb: 'The upgrade behind it all, and the new envelope form it introduced.',
    steps: [
      { t: 'say', m: 'hi', x: 'You’ve met the big ideas. Now let’s name the upgrade that made them real: **Toccata**, activated in June 2026.\n\nIt is [[utxo|UTXO]]-native. There is no global mutable state, just envelopes with rules.' },
      { t: 'explore', x: 'Toccata brought six new pieces. Tap each one.', items: [
        { icon: 'lock', h: 'Covenants (KIP-17)', x: 'Scripts can inspect and constrain the spending transaction. This is the rule on the envelope.' },
        { icon: 'tree', h: 'Covenant IDs (KIP-20)', x: 'Consensus-tracked 32-byte IDs that give a covenant a stable lineage while its script hash keeps changing.' },
        { icon: 'envelope', h: 'Transaction V1 (KIP-24)', x: 'A new transaction format with `compute_budget`, covenant bindings and user lanes.' },
        { icon: 'shield', h: 'Inline ZK (KIP-16)', x: 'A script opcode that verifies zero-knowledge proofs right on L1.' },
        { icon: 'link', h: 'Partitioned sequencing (KIP-21)', x: 'Lane-based commitments, so an app can prove just its own activity.' },
        { icon: 'bolt', h: 'Script pricing (KIP-25)', x: 'A compute-based fee model that replaces the old counting of signature operations.' }
      ] },
      { t: 'say', m: 'think', x: 'Let’s open the new transaction form and peek at its parts. It’s only a list of fields, and you already know most of the ideas behind them.' },
      { t: 'widget', w: 'txv1', gate: true, x: 'Tap any three fields.' },
      { t: 'mc', b: 1, q: 'What does `compute_budget * 10,000 + 9,999` give you?',
        opts: ['The script-unit allowance for one input', 'The transaction fee', 'The number of outputs allowed', 'The size of the payload'], a: 0,
        why: 'Each V1 input carries a compute_budget, and that formula turns it into the input’s script-unit allowance.' },
      { t: 'tf', b: 1, q: 'Changing an input’s compute_budget changes the transaction’s txid.', a: false,
        why: 'compute_budget is committed by tx::hash, but not by the txid or the signature hash. It is a resource commitment, not user intent.' },
      { t: 'mc', q: 'An output can carry a covenant binding. What are its two parts?',
        opts: ['The authorizing input and the covenant ID', 'The signature and the public key', 'The lane and the gas', 'The template hash and the state'], a: 0,
        why: 'A binding says which input approved the output and which covenant family it joins.' },
      { t: 'match', b: 1, q: 'Match each proposal to what it brought.', pairs: [
        ['KIP-17', 'Covenants and introspection'], ['KIP-20', 'Covenant IDs'], ['KIP-16', 'ZK proofs on L1'], ['KIP-21', 'Partitioned sequencing and lanes']
      ], why: 'Four KIPs, four ideas you will use again in this quest.' }
    ]
  });

  SK.addLesson({
    id: '1-6', title: 'Reading an address', min: 5,
    blurb: 'What the text on a wallet screen really says, and why a covenant’s address keeps changing.',
    steps: [
      { t: 'say', m: 'hi', x: 'Wallets and explorers show text like `kaspa:q…` or `kaspa:p…`. That is not what the chain stores.\n\nThe chain stores the lock itself. The text you see is a label written on the outside flap of the envelope.',
        pro: { h: 'What the chain stores', x: 'The chain stores the lock itself, called the `script_public_key`. The text on a wallet screen is a readable way to write a standard lock.' } },
      { t: 'reveal', term: 'Address', plain: 'The label on the outside of an envelope: easy to read and copy, and tied to one network so it cannot be used on the wrong one.',
        x: 'It has a network prefix, a colon, and an encoded body.' },
      { t: 'explore', x: 'Tap each part of an address.', items: [
        { icon: 'envelope', h: 'Network prefix', x: 'The text before the colon says which network the address is for: `kaspa` for the real network, `kaspatest` for test networks. It is part of the check code, so an address from the wrong network gets rejected.' },
        { icon: 'link', h: 'The colon', x: 'One `:` separates the prefix from the rest. An address with no colon is rejected for a missing prefix.' },
        { icon: 'code', h: 'The body', x: 'The rest of the text, written with 32 letters and digits. It holds the kind of lock, what it points at, and a short check code that catches typos.' }
      ], pro: { h: 'How the body is built', x: 'The body is a version byte, then the payload (a key or a script hash), then an 8-character checksum. The version byte and payload are regrouped into 5-bit values and written with the alphabet `qpzry9x8gf2tvdw0s3jn54khce6mua7l`. The checksum is a 40-bit code that also covers the prefix.' } },
      { t: 'mc', q: 'Which part of `kaspa:q…` tells you which network it is for?',
        opts: ['The text before the colon', 'The last letter', 'The amount you are sending'], a: 0,
        why: 'The prefix names the network: `kaspa` for the real one, `kaspatest` for test networks.' },
      { t: 'say', m: 'think', x: 'Right after the colon comes a letter that tells you what kind of lock is behind the address.\n\n`q` means a **key**: one person’s key. `p` means a **script**: a lock that runs a rule, like a covenant.',
        pro: { h: 'The version byte', x: 'The first byte inside the body is the version byte. Only three values exist:\n\n`0x00`: a 32-byte Schnorr public key, shown as `kaspa:q…`\n`0x01`: a 33-byte ECDSA public key, shown as `kaspa:q…`\n`0x08`: a 32-byte script hash (P2SH), shown as `kaspa:p…`\n\nVersion 8 starts with the 5-bit group `00001`, which is the letter `p`. Versions 0 and 1 both start with `00000`, the letter `q`.' } },
      { t: 'mc', b: 1, q: 'A covenant output is paid to which kind of address?',
        opts: ['A script-hash address, `kaspa:p…`', 'A key address, `kaspa:q…`', 'A special covenant prefix'], a: 0,
        why: 'Stateful covenants are [[p2sh|P2SH]] outputs, so the address shows a script hash and starts with `p`.' },
      { t: 'say', m: 'think', x: 'A stateful covenant changes its state on every spend, and that state sits inside the script that gets hashed. So the output’s address **changes on every spend**.\n\nThe stable identity is the Covenant ID, and it is not part of any address.',
        pro: { h: 'What the chain stores for each kind', x: 'Wallets turn an address into lock bytes and back. Sizes include the 2-byte script version.\n\n`0x00` key address: `0x20`, the 32-byte key, `0xac` (36 bytes)\n`0x08` script-hash address: `0xaa`, `0x20`, the 32-byte hash, `0x87` (37 bytes)\n\nOnly these standard locks map back to one address, so an arbitrary script has to be wrapped in P2SH first. That is why a covenant’s logic never shows in its address: the address only commits to the script’s hash.' } },
      { t: 'tf', b: 1, q: 'An address contains the amount of KAS to send.', a: false,
        why: 'The string carries no amount, no Covenant ID and no state. It only points at a lock.' },
      { t: 'sort', b: 1, q: 'Which kind of address does each lock use?', buckets: ['Key address (kaspa:q…)', 'Script-hash address (kaspa:p…)'], items: [
        { t: 'Pay one person’s key', b: 0, why: 'A plain key lock gets a key address.' },
        { t: 'A counter covenant envelope', b: 1, why: 'Covenant outputs are P2SH.' },
        { t: 'A pot that releases after a timeout', b: 1, why: 'A real script gets an address by being wrapped in P2SH.' },
        { t: 'Change sent back to a plain wallet key', b: 0, why: 'A single-key lock maps to a key address.' }
      ], why: 'A plain key lock gets a key address and starts with q. Anything that runs a script is wrapped in P2SH and starts with p.' },
      { t: 'match', b: 1, q: 'Match each prefix to its network.', pairs: [
        ['kaspa', 'Mainnet'], ['kaspatest', 'Every testnet'], ['kaspasim', 'Simnet (local simulation)'], ['kaspadev', 'Devnet (local development)']
      ], why: 'One prefix covers all testnets, so an address cannot tell testnet-10 from testnet-11.' },
      { t: 'say', m: 'yay', x: 'Now you can read an address: the network, the kind of lock, and what it points at. Next time you see `kaspa:p…`, you know a script hash sits behind it.' }
    ]
  });

  SK.addLesson({
    id: '1-7', title: 'Sompi, the smallest coin', min: 4,
    blurb: 'How Kaspa counts the coins inside an envelope: in whole numbers of the smallest one.',
    steps: [
      { t: 'say', m: 'hi', x: 'Every envelope holds an amount. Inside an envelope Kaspa never writes decimals. It counts in whole numbers of the **smallest coin**.\n\nLet’s see how small that is.' },
      { t: 'explore', x: 'Tap each amount to see it counted in the smallest coin.', items: [
        { icon: 'coin', h: '1 KAS', x: 'That is 100,000,000 smallest coins.' },
        { icon: 'coin', h: 'Half a KAS', x: 'That is 50,000,000 smallest coins.' },
        { icon: 'coin', h: 'One hundredth of a KAS', x: 'That is 1,000,000 smallest coins.' },
        { icon: 'coin', h: 'The smallest amount there is', x: 'That is 1 smallest coin. You cannot split it, so there is no half of one.' }
      ] },
      { t: 'reveal', term: 'Sompi', plain: 'The smallest coin. 1 KAS is made of 100,000,000 of them.',
        x: 'The smallest coin is called a sompi. Amounts inside envelopes are counted in sompi, as whole numbers.' },
      { t: 'mc', b: 1, q: 'How many sompi are in 1 KAS?', opts: ['100,000,000', '1,000,000', '1,000', '21,000,000'], a: 0,
        why: '1 KAS = 10^8 sompi, so 100,000,000.' },
      { t: 'explore', x: 'Tap each thing a live envelope stores.', items: [
        { icon: 'coin', h: 'Amount', x: 'The coins inside, counted in sompi.' },
        { icon: 'lock', h: 'Lock', x: 'The rule for opening this envelope: the lock you met in the first lessons.' },
        { icon: 'tree', h: 'Family badge', x: 'Optional. The covenant ID, if this envelope belongs to a covenant family.' }
      ], pro: { h: 'The rest of the record', x: 'A live envelope also stores its birth record: the DAA score of the block that created it, and whether it came from a coinbase (a mining reward). Each one is found by its outpoint: the 32-byte id of the transaction that created it plus an output index.' } },
      { t: 'tf', q: 'The amount inside an envelope is a whole number of sompi.', a: true,
        why: 'Amounts are whole numbers. There is no such thing as half a sompi.' },
      { t: 'match', b: 1, q: 'Match each amount to its size in sompi.', pairs: [
        ['1 KAS', '100,000,000 sompi'], ['Half a KAS', '50,000,000 sompi'], ['The smallest coin', '1 sompi']
      ], why: '1 KAS is 100,000,000 sompi, so half a KAS is 50,000,000 and the smallest coin is 1.' },
      { t: 'say', m: 'yay', x: 'That finishes the envelope picture: coins, locks, rules, memory, addresses and amounts.\n\nTwo more small ideas wait in later worlds: what a transaction **costs**, and how contracts **count time**. You will meet them when you need them.',
        pro: { h: 'Mass and the DAA clock', x: 'Block space is limited, so every transaction has a **mass**. It is the **largest** of three costs: **transient** (how many bytes it sends), **compute** (how much script work it asks for) and **storage** (how much it grows the set of envelopes). Creating many tiny outputs can raise the storage mass.\n\nA BlockDAG has no single straight chain, so there is no simple block height. Contracts use the **DAA score** instead: a counter that rises as blocks arrive. Time locks like `tx.daa` and `this.ageDaa` are measured in it. Block timestamps are not strictly increasing, so contracts do not lean on them.' } }
    ]
  });
})();
