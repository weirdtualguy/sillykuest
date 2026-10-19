/* World 1: Envelope Town. Kaspa basics with zero code. */
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
    id: '1-2', title: 'Envelopes with rules', min: 5,
    blurb: 'A lock checks who is opening. A covenant also checks what happens next.',
    steps: [
      { t: 'say', m: 'hi', x: 'A normal envelope has a lock. Only someone with the right key can open it. That key check is called a **signature**.\n\nBut once it’s open, the owner can do **anything** with the coins. Send them anywhere, no questions asked.' },
      { t: 'say', m: 'think', x: 'What if an envelope could also say: “You may open me, but the new envelopes must look the way I say”?\n\nThat’s a rule about the **future**. Let’s see why it matters.' },
      { t: 'widget', w: 'gate', gate: true, x: 'Try the same spends under two kinds of lock.' },
      { t: 'reveal', id: 'covenant', term: 'Covenant', plain: 'A rule stapled to an envelope that says what the next envelopes must look like.',
        x: 'A covenant doesn’t only ask **who** is opening the envelope. It checks the **whole transaction** doing the opening: where the money goes, how much, and what locks the new envelopes carry.' },
      { t: 'explore', x: 'A covenant can look at quite a lot. Tap to see what.', items: [
        { icon: 'envelope', h: 'The new envelopes (outputs)', x: 'How many there are, and what each one holds.' },
        { icon: 'coin', h: 'The amounts', x: 'How much goes where.' },
        { icon: 'lock', h: 'The new locks', x: 'The successors’ scripts: are they the same covenant, a plain key, something else?' },
        { icon: 'search', h: 'The envelopes being opened (inputs)', x: 'Which ones are spent together, and how much they hold.' },
        { icon: 'info', h: 'Other transaction fields', x: 'Lock time, payload and more. This ability to look at the transaction is called [[introspection]].' }
      ] },
      { t: 'mc', b: 1, q: 'How is a covenant different from a plain signature lock?',
        opts: ['It also constrains the spending transaction itself: outputs, amounts, scripts', 'It makes the spender pay gas in a second currency', 'It runs the contract on a separate computer off-chain', 'It makes the envelope impossible to open'], a: 0,
        why: 'A plain lock checks who is spending. A covenant also constrains what the spend may do.' },
      { t: 'tf', q: 'A covenant can require that a certain amount goes to a certain person.', a: true,
        why: 'Output amounts and output locks are exactly what a covenant can inspect.' },
      { t: 'sort', b: 1, q: 'Who can check this: a plain key lock, or only a covenant?', buckets: ['A plain key lock can', 'Only a covenant can'], items: [
        { t: 'Did the owner sign this spend?', b: 0, why: 'Signatures are all a plain lock checks.' },
        { t: 'Does Alice receive at least 5 KAS?', b: 1, why: 'That is about the outputs, so it needs a covenant.' },
        { t: 'Does the new envelope carry the same rule?', b: 1, why: 'Looking at a successor’s lock is covenant territory.' },
        { t: 'Is this signature valid for this key?', b: 0, why: 'A plain key lock does exactly this.' },
        { t: 'Are there exactly two outputs?', b: 1, why: 'Counting outputs means inspecting the transaction.' }
      ], why: 'Plain locks check the signer. Covenants check the transaction.' },
      { t: 'say', m: 'yay', x: 'Covenant = a lock **plus** a rule about the future.\n\nHold on to that. The rest of this quest is variations on it.' }
    ]
  });

  SK.addLesson({
    id: '1-3', title: 'The sticky note inside', min: 6,
    blurb: 'Where a covenant keeps its memory, and why fingerprints change but family badges don’t.',
    steps: [
      { t: 'say', m: 'hi', x: 'Many covenants need memory: a counter, a balance, who owns what. But envelopes can’t be edited.\n\nSo where does the memory live?' },
      { t: 'say', m: 'think', x: 'Inside the envelope there’s a **sticky note**. That’s really the script. The memory (the **state**) is written on that note.\n\nOn the outside, the envelope shows a **fingerprint**: a short code computed from what’s inside. Change the note and the fingerprint changes too.' },
      { t: 'widget', w: 'fingerprint', gate: true, x: 'Spend this counter envelope three times. Watch the two codes.',
        pro: { h: 'what “hash” means', x: 'A hash function squeezes any data into a fixed-size fingerprint. The same input always gives the same fingerprint, and a tiny change gives a completely different one. The codes in this toy are for illustration only, not real BLAKE2b.' } },
      { t: 'reveal', id: 'p2sh', term: 'P2SH', plain: 'The fingerprint on the outside of the envelope: a hash of the script and sticky note inside.',
        x: 'It stands for Pay-to-Script-Hash. The outside only shows the hash. The script itself, with its state, is revealed when you open the envelope.' },
      { t: 'reveal', id: 'covenant-id', term: 'Covenant ID', plain: 'A badge Kaspa stamps on every envelope in the family, so the family stays recognisable while fingerprints change.',
        x: 'Fingerprints change every time the state does. The covenant ID doesn’t. Kaspa itself keeps track of it, which gives a covenant a stable identity.' },
      { t: 'mc', b: 1, q: 'A covenant’s state changes from 3 to 4. What changes on the outside of the envelope?',
        opts: ['Its script public key (the P2SH hash)', 'Its covenant ID', 'Nothing: state lives off-chain', 'The Kaspa block time'], a: 0,
        why: 'State is encoded in the redeem script. New state means a new script hash, so a new script public key. The covenant ID stays.' },
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
    id: '1-4', title: 'Meet Toccata', min: 6,
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
    id: "1-5", title: "Reading an address", min: 6,
    blurb: "What the text on a wallet screen really says, and why a covenant’s address keeps changing.",
    steps: [
      {"t":"say","m":"hi","x":"Wallets and explorers show text like `kaspa:q…` or `kaspa:p…`. That is not what the chain stores.\n\nThe chain stores the lock itself, the `script_public_key`. The **address** is the label written on the outside flap of the envelope."},
      {"t":"reveal","id":"address","term":"Address","plain":"The label on the outside of an envelope: easy to read and copy, and tied to one network so it cannot be used on the wrong one.","x":"It has a network prefix, a colon, and an encoded body."},
      {"t":"explore","x":"Tap each part of an address.","items":[{"icon":"envelope","h":"Network prefix","x":"The text before the colon: `kaspa` for mainnet, `kaspatest` for testnets. It also feeds the checksum."},{"icon":"link","h":"The colon","x":"One `:` separates the prefix from the body. An address with no colon is rejected for a missing prefix."},{"icon":"code","h":"The body","x":"Written with 32 letters and digits. It holds a version byte, the payload, and an 8-character checksum."}],"pro":{"h":"How the body is built","x":"The version byte and payload are regrouped into 5-bit values and written with the alphabet `qpzry9x8gf2tvdw0s3jn54khce6mua7l`. The checksum is a 40-bit code that also covers the prefix."}},
      {"t":"mc","b":1,"q":"You paste a testnet address into a mainnet wallet and it is rejected. Why?","opts":["The checksum covers the network prefix","Testnet coins are a different token","The wallet cannot read base-32","Testnet addresses expire"],"a":0,"why":"The prefix is a checksum input. The same key gives a different string on each network, and a wrong-network paste fails the check."},
      {"t":"say","m":"think","x":"The first byte inside the body is the **version byte**. Only three values exist, and they decide what the address stands for."},
      {"t":"table","cols":["Version byte","What the address holds","Starts with (mainnet)"],"rows":[["0x00","A 32-byte Schnorr public key","kaspa:q"],["0x01","A 33-byte ECDSA public key","kaspa:q"],["0x08","A 32-byte script hash (P2SH)","kaspa:p"]],"pro":{"h":"Why q and p","x":"Version 8 starts with the 5-bit group `00001`, which is the letter `p`. Versions 0 and 1 both start with `00000`, the letter `q`."}},
      {"t":"mc","b":1,"q":"A covenant output is paid to which kind of address?","opts":["A script-hash address, `kaspa:p…`","A Schnorr key address, `kaspa:q…`","An ECDSA key address","A special covenant prefix"],"a":0,"why":"Stateful covenants are [[p2sh|P2SH]] outputs, so their addresses use version 8."},
      {"t":"say","m":"think","x":"A stateful covenant changes its state on every spend, and that state sits inside the script that gets hashed. So the output’s address **changes on every spend**.\n\nThe stable identity is the Covenant ID, and it is not part of any address."},
      {"t":"tf","b":1,"q":"An address contains the amount of KAS to send.","a":false,"why":"The string carries no amount, no Covenant ID and no state. It only points at a lock."},
      {"t":"sort","b":1,"q":"Which kind of address does each lock use?","buckets":["Key address (kaspa:q…)","Script-hash address (kaspa:p…)"],"items":[{"t":"Pay one person’s Schnorr key","b":0,"why":"A plain key lock is version 0."},{"t":"A Counter covenant cell","b":1,"why":"Covenant outputs are P2SH."},{"t":"A pot that releases after a timeout","b":1,"why":"A real script gets an address by being wrapped in P2SH."},{"t":"Change sent back to a plain wallet key","b":0,"why":"A single-key lock maps to a key address."}],"why":"Plain key locks use version 0 and start with q. Anything that runs a script is wrapped in P2SH, version 8, and starts with p."},
      {"t":"say","m":"calm","x":"Wallets turn an address into lock bytes and back. Sizes below include the 2-byte script version."},
      {"t":"table","cols":["Address version","Lock bytes in the envelope","Size"],"rows":[["0x00 key","0x20, the 32-byte key, 0xac","36 bytes"],["0x08 script hash","0xaa, 0x20, the 32-byte hash, 0x87","37 bytes"]]},
      {"t":"mc","q":"Can an arbitrary script, with no wrapper, be written as an address?","opts":["No: only standard locks map to addresses, so wrap it in P2SH","Yes, using version 0","Yes, using version 1","Yes, using the prefix kaspadev"],"a":0,"why":"Only the standard locks map back to one address. That is why a covenant’s logic never shows in its address: the address only commits to the script’s hash."},
      {"t":"match","b":1,"q":"Match each prefix to its network.","pairs":[["kaspa","Mainnet"],["kaspatest","Every testnet"],["kaspasim","Simnet (local simulation)"],["kaspadev","Devnet (local development)"]],"why":"One prefix covers all testnets, so an address cannot tell testnet-10 from testnet-11."},
      {"t":"say","m":"yay","x":"Now you can read an address: network, version, payload. Next time you see `kaspa:p…`, you know a script hash sits behind it."}
    ]
  });

  SK.addLesson({
    id: "1-6", title: "Sompi, mass and the DAA clock", min: 5,
    blurb: "The small units that price and time everything on Kaspa.",
    steps: [
      {"t":"say","m":"hi","x":"Three small ideas finish the envelope picture: the unit of the coins, the cost of a transaction, and the clock."},
      {"t":"reveal","id":"sompi","term":"Sompi","plain":"The smallest coin. 1 KAS is 100,000,000 sompi.","x":"Amounts inside envelopes are counted in sompi, as whole numbers."},
      {"t":"explore","x":"Tap each field a live envelope (UTXO) stores.","items":[{"icon":"coin","h":"Amount","x":"The coins inside, in sompi."},{"icon":"lock","h":"Lock","x":"The `script_public_key`: the rule for opening this envelope."},{"icon":"bolt","h":"Birth record","x":"The DAA score of the block that created it, and whether it came from a coinbase (mining reward)."},{"icon":"tree","h":"Covenant ID","x":"Optional. The family badge, if this envelope belongs to a covenant family."}],"pro":{"h":"The outpoint","x":"Each live envelope is found by its outpoint: the 32-byte id of the transaction that created it plus an output index."}},
      {"t":"mc","b":1,"q":"How many sompi are in 1 KAS?","opts":["100,000,000","1,000,000","1,000","21,000,000"],"a":0,"why":"1 KAS = 10^8 sompi, so 100,000,000."},
      {"t":"say","m":"think","x":"Block space is limited, so every transaction has a **mass**. It is the **largest** of three costs:\n\n**transient** (how many bytes it sends), **compute** (how much script work it asks for), **storage** (how much it grows the set of envelopes)."},
      {"t":"mc","b":1,"q":"How is a transaction’s mass worked out from its three costs?","opts":["It is the largest of them","It is the sum of them","It is the average of them","It is the byte size only"],"a":0,"why":"Mass is the maximum of transient, compute and storage mass. Whichever cost dominates sets the mass."},
      {"t":"tf","b":1,"q":"Creating many tiny outputs can raise a transaction’s storage mass.","a":true,"why":"Storage mass penalizes transactions that bloat the envelope set with many low-value outputs."},
      {"t":"say","m":"calm","x":"A BlockDAG has no single straight chain, so there is no simple “block height”. Contracts use the **DAA score**: a counter that rises as blocks arrive. Time locks like `tx.daa` and `this.ageDaa` are measured in it.\n\nBlock timestamps are not strictly increasing, so contracts do not lean on them."},
      {"t":"mc","b":1,"q":"Which counter does a covenant use as its height-like clock?","opts":["The DAA score","The block timestamp","An account nonce","The block’s byte size"],"a":0,"why":"The DAA score rises as blocks are added. Header timestamps can move backwards slightly, so they are a poor clock for contracts."}
    ]
  });
})();
