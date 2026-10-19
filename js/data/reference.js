/* Reference data: opcodes and the cheat sheet. */
(function () {
  var SK = (window.SK = window.SK || {});

  SK.opCats = ['Transaction', 'Inputs and outputs', 'Covenant IDs', 'Signatures', 'Hashes', 'Bytes', 'Math', 'Proofs and lanes'];

  /* [name, hex, category, plain description] — 51 Toccata & curriculum opcodes */
  SK.opcodes = [
    ['OpTxVersion', '0xb2', 'Transaction', 'Pushes the transaction’s version number (tx.version).'],
    ['OpTxLockTime', '0xb5', 'Transaction', 'Pushes the transaction’s lock_time field (< 500B is DAA score, >= 500B is ms timestamp).'],
    ['OpTxSubnetId', '0xb6', 'Transaction', 'Pushes the 20-byte subnetwork_id (the lane tag) as raw bytes.'],
    ['OpTxGas', '0xb7', 'Transaction', 'Pushes the transaction’s gas field (non-zero only on V1 user lanes).'],
    ['OpTxPayloadSubstr(start, end)', '0xb8', 'Transaction', 'Extracts a zero-based byte slice [start, end) from the transaction payload.'],
    ['OpTxPayloadLen', '0xc4', 'Transaction', 'Pushes the byte length of the transaction payload.'],

    ['OpTxInputCount', '0xb3', 'Inputs and outputs', 'Pushes how many inputs the transaction has (tx.inputs.length).'],
    ['OpTxOutputCount', '0xb4', 'Inputs and outputs', 'Pushes how many outputs the transaction has (tx.outputs.length).'],
    ['OpTxInputIndex', '0xb9', 'Inputs and outputs', 'Pushes which input is running this script right now (this.activeInputIndex).'],
    ['OpTxInputAmount(idx)', '0xbe', 'Inputs and outputs', 'Pushes the sompi amount in the UTXO spent by input idx (tx.inputs[idx].value).'],
    ['OpTxInputSpk(idx)', '0xbf', 'Inputs and outputs', 'Pushes the serialized lock (script_public_key) of the UTXO spent by input idx.'],
    ['OpTxOutputAmount(idx)', '0xc2', 'Inputs and outputs', 'Pushes the sompi amount of output idx (tx.outputs[idx].value).'],
    ['OpTxOutputSpk(idx)', '0xc3', 'Inputs and outputs', 'Pushes the serialized lock (script_public_key) of output idx.'],
    ['OpOutpointTxId(idx)', '0xba', 'Inputs and outputs', 'Pushes the 32-byte transaction ID that input idx’s outpoint spends.'],
    ['OpOutpointIndex(idx)', '0xbb', 'Inputs and outputs', 'Pushes which output index of that earlier transaction input idx spends.'],
    ['OpTxInputSeq(idx)', '0xbd', 'Inputs and outputs', 'Pushes the sequence field of input idx as 8 little-endian bytes (used by this.ageDaa).'],
    ['OpTxInputDaaScore(idx)', '0xc0', 'Inputs and outputs', 'Pushes the DAA score of the block that created the UTXO spent by input idx.'],
    ['OpTxInputIsCoinbase(idx)', '0xc1', 'Inputs and outputs', 'Pushes 1 if input idx spends a coinbase output, or 0 otherwise.'],
    ['OpTxInputScriptSigSubstr(idx, s, e)', '0xbc', 'Inputs and outputs', 'Extracts a zero-based slice [s, e) of input idx’s signature script.'],
    ['OpTxInputScriptSigLen(idx)', '0xc9', 'Inputs and outputs', 'Pushes the byte length of input idx’s signature script.'],
    ['OpTxInputSpkLen(idx)', '0xc5', 'Inputs and outputs', 'Pushes the byte length of the spent UTXO’s serialized lock.'],
    ['OpTxInputSpkSubstr(idx, s, e)', '0xc6', 'Inputs and outputs', 'Extracts a zero-based slice [s, e) of the spent UTXO’s serialized lock.'],
    ['OpTxOutputSpkLen(idx)', '0xc7', 'Inputs and outputs', 'Pushes the byte length of output idx’s serialized lock.'],
    ['OpTxOutputSpkSubstr(idx, s, e)', '0xc8', 'Inputs and outputs', 'Extracts a zero-based slice [s, e) of output idx’s serialized lock.'],

    ['OpInputCovenantId(idx)', '0xcf', 'Covenant IDs', 'Pushes the 32-byte Covenant ID carried by input idx, or 32 zero bytes if none.'],
    ['OpAuthOutputCount(idx)', '0xcb', 'Covenant IDs', 'Pushes how many continuation outputs input idx has directly authorized (binding=auth).'],
    ['OpAuthOutputIdx(idx, k)', '0xcc', 'Covenant IDs', 'Pushes the output index of the k-th continuation output authorized by input idx.'],
    ['OpCovInputCount(cov_id)', '0xd0', 'Covenant IDs', 'Pushes how many inputs in this transaction carry cov_id (binding=cov).'],
    ['OpCovInputIdx(cov_id, k)', '0xd1', 'Covenant IDs', 'Pushes the input index of the k-th input carrying cov_id.'],
    ['OpCovOutputCount(cov_id)', '0xd2', 'Covenant IDs', 'Pushes how many continuation outputs in this transaction carry cov_id.'],
    ['OpCovOutputIdx(cov_id, k)', '0xd3', 'Covenant IDs', 'Pushes the output index of the k-th continuation output carrying cov_id.'],
    ['OpOutputCovenantId(idx)', '0xd5', 'Covenant IDs', 'Pushes the 32-byte Covenant ID of output idx (genesis or continuation), or 32 zero bytes if none.'],
    ['OpOutputAuthorizingInput(idx)', '0xd6', 'Covenant IDs', 'Pushes which input index authorized output idx, or -1 if unbound.'],

    ['OpCheckSigFromStack(sig, msg, pk)', '0xd7', 'Signatures', 'Verifies a 64-byte Schnorr signature over a 32-byte message digest (checkMsgSig).'],
    ['OpCheckSigFromStackECDSA(sig, msg, pk)', '0xd8', 'Signatures', 'Verifies a 64-byte ECDSA signature over a 32-byte message digest (checkMsgSigEcdsa).'],

    ['OpBlake2bWithKey(data, key)', '0xa7', 'Hashes', 'Keyed BLAKE2b-256 hash (key up to 64 bytes; unkeyed OpBlake2b is 0xaa).'],
    ['OpBlake3(data)', '0xd9', 'Hashes', 'Unkeyed 32-byte BLAKE3 hash (used for template_hash, dispatch tags, and V1 payloads).'],
    ['OpBlake3WithKey(data, key)', '0xda', 'Hashes', 'Keyed 32-byte BLAKE3 hash (key must be exactly 32 bytes).'],

    ['OpCat(b1, b2)', '0x7e', 'Bytes', 'Concatenates two byte strings. Result must not exceed MAX_SCRIPT_ELEMENT_SIZE (1,000,000 bytes).'],
    ['OpSubstr(str, start, end)', '0x7f', 'Bytes', 'Extracts a byte slice [start, end). Zero-based; start inclusive, end exclusive.'],
    ['OpInvert(bytes)', '0x83', 'Bytes', 'Flips every bit in a byte string (bitwise NOT).'],
    ['OpAnd(b1, b2)', '0x84', 'Bytes', 'Bitwise AND across two byte strings of equal length.'],
    ['OpOr(b1, b2)', '0x85', 'Bytes', 'Bitwise OR across two byte strings of equal length.'],
    ['OpXor(b1, b2)', '0x86', 'Bytes', 'Bitwise XOR across two byte strings of equal length.'],

    ['OpMul(a, b)', '0x95', 'Math', 'Signed 64-bit integer multiply. Aborts script on overflow.'],
    ['OpDiv(a, b)', '0x96', 'Math', 'Signed 64-bit integer divide. Aborts script on divide-by-zero or overflow.'],
    ['OpMod(a, b)', '0x97', 'Math', 'Signed 64-bit integer remainder. Aborts script on mod-by-zero.'],
    ['OpNum2Bin(num, size)', '0xcd', 'Math', 'Encodes a number into fixed-size signed-magnitude bytes (1 <= size <= 8).'],
    ['OpBin2Num(bytes)', '0xce', 'Math', 'Decodes signed-magnitude bytes (up to 8 bytes) into a minimal script number.'],

    ['OpZkPrecompile', '0xa6', 'Proofs and lanes', 'Verifies an inline ZK proof (KIP-16). Tag 0x20 is Groth16, tag 0x21 is RISC Zero Succinct STARK. Aborts on failure.'],
    ['OpChainblockSeqCommit(block_hash)', '0xd4', 'Proofs and lanes', 'Pushes the 32-byte KIP-21 sequencing commitment (SeqCommit) for a chain-ancestor block.']
  ];
  SK.opDisabled = 'Still disabled: OpLeft (0x80), OpRight (0x81), OpLShift (0x98), OpRShift (0x99). Core crypto opcodes: OpSha256 (0xa8), OpBlake2b (0xaa), OpCheckSigECDSA (0xab), OpCheckSig (0xac).';

  /* Cheat sheet: sections of two-column tables. code:true renders the first column as code. */
  SK.cheat = [
    {
      title: 'Types', code: true, cols: ['Type', 'What it holds'],
      rows: [
        ['int', '64-bit signed integer (8-byte signed-magnitude in state). 42, -100'],
        ['temporal', '64-bit signed time in milliseconds. 30 seconds, timeout'],
        ['bool', '1-byte boolean (0x00 or 0x01). true or false'],
        ['byte, byte[N]', 'One raw byte, or a fixed-size byte array. 0xff, byte[32]'],
        ['byte[]', 'Dynamic-length byte array. byte[](spk)'],
        ['pubkey', 'Schnorr public key, 32 bytes (ECDSA uses byte[33])'],
        ['sig', 'Transaction signature, 65 bytes (64B sig + 1B sighash flag)'],
        ['datasig', 'Raw data signature, 64 bytes (used with checkMsgSig)'],
        ['string', 'UTF-8 text, e.g. require error messages'],
        ['T[], T[N]', 'Dynamic array (State[]), fixed-size array (int[4])']
      ]
    },
    {
      title: 'Contract structure', code: true, cols: ['Construct', 'How the compiler treats it'],
      rows: [
        ['contract Name(T p1, ...)', 'Constructor parameters: immutable constants baked into template prefix/suffix'],
        ['int constant MAX = 10;', 'Compile-time constant folded directly into script opcodes'],
        ['int count = init_count;', 'Mutable state field: bundled into State struct and encoded in [runtime_state]'],
        ['entry spend(sig s) { ... }', 'Callable entrypoint selected by 4-byte KCC-01 dispatch tag blake3("spend(sig)")[0..4]'],
        ['function f(State prev, ...)', 'Compiler-invoked policy or delegate hook for #[covenant] macros'],
        ['for(i, start, end, MAX)', 'Compile-time unrolled loop: i runs start to end - 1 (end excluded), capped at MAX']
      ]
    },
    {
      title: 'Time locks', code: true, cols: ['Write', 'Meaning'],
      rows: [
        ['tx.daa >= N', 'Absolute lock by DAA score. N is an int, 0 <= N < 500,000,000,000'],
        ['tx.time >= T', 'Absolute lock by ms timestamp. T is temporal, T >= 500,000,000,000'],
        ['this.ageDaa >= N', 'Relative lock: this UTXO must be N DAA-score units old. 0 <= N < 2^32']
      ]
    },
    {
      title: 'Peek at the transaction', code: true, cols: ['Write', 'Opcode behind it'],
      rows: [
        ['tx.version', 'OpTxVersion (0xb2)'],
        ['tx.inputs.length', 'OpTxInputCount (0xb3)'],
        ['tx.outputs.length', 'OpTxOutputCount (0xb4)'],
        ['this.activeInputIndex', 'OpTxInputIndex (0xb9)'],
        ['this.activeScriptPubKey', 'OpTxInputIndex (0xb9) + OpTxInputSpk (0xbf)'],
        ['tx.inputs[i].value', 'OpTxInputAmount (0xbe)'],
        ['tx.inputs[i].scriptPubKey', 'OpTxInputSpk (0xbf)'],
        ['tx.outputs[i].value', 'OpTxOutputAmount (0xc2)'],
        ['tx.outputs[i].scriptPubKey', 'OpTxOutputSpk (0xc3)'],
        ['tx.inputs[i].outpointTxId / outpointIndex', 'OpOutpointTxId (0xba) / OpOutpointIndex (0xbb)'],
        ['OpTxSubnetId(), OpTxGas()', 'OpTxSubnetId (0xb6), OpTxGas (0xb7) (direct opcode builtins)'],
        ['OpTxPayloadLen(), OpTxPayloadSubstr(s, e)', 'OpTxPayloadLen (0xc4), OpTxPayloadSubstr (0xb8)'],
        ['OpTxInputDaaScore(i), OpTxInputIsCoinbase(i)', 'OpTxInputDaaScore (0xc0), OpTxInputIsCoinbase (0xc1)']
      ]
    },
    {
      title: 'Built-in functions', code: true, cols: ['Function', 'What it does'],
      rows: [
        ['checkSig(sig, pubkey)', 'Schnorr signature check on this transaction (OpCheckSig 0xac)'],
        ['checkSigEcdsa(sig, byte[33])', 'ECDSA signature check on this transaction (OpCheckSigECDSA 0xab)'],
        ['checkMsgSig(datasig, byte[32], pubkey)', 'Check a 64-byte Schnorr signature against a 32-byte digest (0xd7)'],
        ['checkMsgSigEcdsa(datasig, byte[32], byte[33])', 'Check a 64-byte ECDSA signature against a 32-byte digest (0xd8)'],
        ['blake2b(data), blake3(data), sha256(data)', 'Unkeyed hash to byte[32] (0xaa, 0xd9, 0xa8)'],
        ['blake2bWithKey(data, key), blake3WithKey(data, key32)', 'Keyed hash to byte[32] (0xa7 key <= 64B, 0xda key == 32B)'],
        ['g16.verify(byte[] vk, byte[] proof, byte[32] ...inputs)', 'Verify a Groth16 proof (OpZkPrecompile 0xa6, tag 0x20). Aborts script on failure'],
        ['new ScriptPubKeyP2PK(pubkey)', 'Build a 36-byte pay-to-key lock (byte[36])'],
        ['new ScriptPubKeyP2SH(byte[32])', 'Build a 37-byte pay-to-script-hash lock from a 32B BLAKE2b hash (byte[37])'],
        ['new ScriptPubKeyP2SHFromRedeemScript(byte[])', 'Hash redeem script with BLAKE2b and build a 37-byte P2SH lock (byte[37])'],
        ['validateOutputState(int idx, object newState)', 'Output idx continues with the same template and State { ... }'],
        ['validateOutputStateWithTemplate(idx, state, prefix, suffix, hash)', 'Output idx uses a foreign template authenticated by BLAKE3 template_hash'],
        ['validateOutputStateWithInputTemplate(idx, state, inIdx, pLen, sLen, hash)', 'Reuse and authenticate the template bytes of co-spent input inIdx'],
        ['readInputState(int idx)', 'Verify input idx shares this template and decode its State'],
        ['readInputStateWithTemplate(idx, pLen, sLen, hash)', 'Authenticate foreign input idx against template_hash and decode its state'],
        ['OpChainblockSeqCommit(byte[32] block_hash)', '32-byte KIP-21 sequencing commitment for chain ancestor block_hash (0xd4)']
      ]
    },
    {
      title: 'Conversions', code: true, cols: ['Write', 'Meaning'],
      rows: [
        ['temporal(intExpr), int(temporalExpr)', 'Switch between int and temporal domains. Compile-time only (no opcode)'],
        ['byte[](fixedBytesOrPk)', 'Widen byte[N] or pubkey to dynamic byte[]. Compile-time only'],
        ['byte[N](dynamicBytes)', 'Unchecked cast to fixed byte[N]. Always check require(data.length == N) first!'],
        ['pubkey(byte32Expr), sig(byte65Expr)', 'Reinterpret byte[32] as pubkey or byte[65] as sig. Compile-time only'],
        ['value as byte[N]', 'Encode int to fixed signed-magnitude bytes (1 <= N <= 8, OpNum2Bin 0xcd)'],
        ['int(byteNExpr)', 'Decode signed-magnitude byte[N] (1 <= N <= 8) to int (OpBin2Num 0xce)'],
        ['boolValue as int', 'Convert bool to int (true is 1, false is 0)'],
        ['signed(byte), unsigned(byte)', 'Convert scalar byte to signed or unsigned int before arithmetic']
      ]
    },
    {
      title: 'Covenant declarations', code: true, cols: ['Write', 'Meaning'],
      rows: [
        ['#[covenant.singleton]', 'Sugar for binding=auth, from=1, to=1'],
        ['#[covenant.fanout(to=Y)]', 'Sugar for binding=auth, from=1, to=Y'],
        ['#[covenant(binding=auth, from=1, to=Y)]', 'One input authorizes its outputs (OpAuth* opcodes; from must be 1)'],
        ['#[covenant(binding=cov, from=X, to=Y)]', 'Group by Covenant ID (OpCov* opcodes): N:M, makes the contract a leader'],
        ['#[covenant.delegate]', 'At most one per contract: what non-leader inputs (1..N-1) run'],
        ['mode=verification | transition', 'Validate spender-proposed state (no return), or compute and return it'],
        ['termination=allowed', 'Valid only for singleton + transition. Returning [] ends the family']
      ]
    },
    {
      title: 'Numbers worth knowing', cols: ['Thing', 'Value'],
      rows: [
        ['Mainnet Toccata activation', 'June 30, 2026 (DAA score 474,165,565)'],
        ['Native KAS unit', '1 KAS = 100,000,000 sompi (10^8)'],
        ['Per-input script allowance', 'compute_budget * 10,000 + 9,999 script units (KIP-25)'],
        ['MAX_SCRIPT_ELEMENT_SIZE', '520 bytes before Toccata, 1,000,000 bytes after'],
        ['MAX_SCRIPTS_SIZE', '10,000 bytes before, 1,000,000 bytes after'],
        ['MAX_OPS_PER_SCRIPT', '201 ops before, 1,000,000 ops after'],
        ['Max signature script', '250,000 bytes per input'],
        ['LOCK_TIME_THRESHOLD', '500,000,000,000 (< is DAA score, >= is ms timestamp)'],
        ['Lanes per block', 'At most 50 distinct non-coinbase lanes (KIP-21)'],
        ['Gas per lane per block', 'At most 1,000,000,000 (native/system lanes must use gas = 0)'],
        ['ZK precompile tags', '0x20 Groth16 (~1.649 ms, 134x ECDSA), 0x21 RISC Zero STARK (~9.081 ms, 738x ECDSA)'],
        ['Int state encoding', '8-byte signed-magnitude LE: +42 is 2a 00 00 00 00 00 00 00, -5 is 05 00 00 00 00 00 00 80'],
        ['KCC20 state header', '42 bytes: ownerIdentifier (32B) + identifierType (1B) + amount (8B) + isMinter (1B)']
      ]
    }
  ];
})();
