;; IdentityRegistry.clar
;; Core contract for decentralized identity registration in aid eligibility system

;; This contract manages self-sovereign identities for vulnerable users.
;; Users register a unique hash of their identity proofs (e.g., biometric or document hash).
;; It prevents duplicates, allows revocation, and provides verification functions.
;; Designed for integration with other contracts like VerificationOracle and ClaimManager.

(define-constant ERR-DUPLICATE-IDENTITY (err u100))
(define-constant ERR-INVALID-HASH (err u101))
(define-constant ERR-NOT-REGISTERED (err u102))
(define-constant ERR-ALREADY-REVOKED (err u103))
(define-constant ERR-NOT-OWNER (err u104))
(define-constant ERR-INVALID-TIMESTAMP (err u105))
(define-constant ERR-REGISTRATION-EXPIRED (err u106))
(define-constant ERR-INVALID-METADATA (err u107))
(define-constant ERR-CONTRACT-PAUSED (err u108))
(define-constant ERR-UNAUTHORIZED (err u109))
(define-constant ERR-INVALID-EXPIRY (err u110))

;; -------------------------
;; Storage
;; -------------------------
;; Map of user principals to their identity data
(define-map identities principal 
  { 
    hash: (buff 32), 
    timestamp: uint, 
    expiry: uint,  ;; Optional expiry for identity validity
    metadata: (optional (buff 128)),  ;; Encrypted or hashed metadata
    revoked: bool 
  })

;; Reverse map to check for duplicate hashes (hash to principal)
(define-map hash-to-principal (buff 32) principal)

;; Contract admin for pausing/updates (initially deployer)
(define-data-var contract-admin principal tx-sender)

;; Pause flag for emergency stops
(define-data-var is-paused bool false)

;; Global config: max metadata size
(define-data-var max-metadata-size uint u128)

;; Event emission simulation (Clarity doesn't have native events, but we can use print)
(define-private (emit-event (event-name (string-ascii 32)) (data (buff 256)))
  (print { event: event-name, data: data }))

;; -------------------------
;; Traits
;; -------------------------
;; Trait for integration with other contracts (e.g., oracles)
(define-trait identity-verifier-trait
  (
    (verify-identity (principal (buff 32)) (response bool uint))
  )
)

;; -------------------------
;; Helpers
;; -------------------------
(define-private (is-owner (user principal))
  (is-eq tx-sender user))

(define-private (validate-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      ERR-INVALID-HASH))

(define-private (validate-expiry (expiry uint))
  (if (> expiry block-height)
      (ok true)
      ERR-INVALID-EXPIRY))

(define-private (validate-metadata (meta (optional (buff 128))))
  (match meta
    some-meta (if (<= (len some-meta) (var-get max-metadata-size))
                  (ok true)
                  ERR-INVALID-METADATA)
    (ok true)))

(define-private (check-not-paused)
  (asserts! (not (var-get is-paused)) ERR-CONTRACT-PAUSED))

(define-private (check-admin)
  (asserts! (is-eq tx-sender (var-get contract-admin)) ERR-UNAUTHORIZED))

(define-private (check-registered (user principal))
  (match (map-get? identities user)
    data (if (not (get revoked data))
           (ok data)
           ERR-ALREADY-REVOKED)
    ERR-NOT-REGISTERED))

(define-private (check-not-duplicate (hash (buff 32)))
  (asserts! (is-none (map-get? hash-to-principal hash)) ERR-DUPLICATE-IDENTITY))

;; -------------------------
;; Admin Functions
;; -------------------------
(define-public (pause-contract)
  (begin
    (check-admin)
    (var-set is-paused true)
    (emit-event "contract-paused" 0x)
    (ok true)))

(define-public (unpause-contract)
  (begin
    (check-admin)
    (var-set is-paused false)
    (emit-event "contract-unpaused" 0x)
    (ok true)))

(define-public (update-admin (new-admin principal))
  (begin
    (check-admin)
    (var-set contract-admin new-admin)
    (emit-event "admin-updated" (unwrap-panic (as-buff new-admin)))
    (ok true)))

(define-public (set-max-metadata-size (new-size uint))
  (begin
    (check-admin)
    (var-set max-metadata-size new-size)
    (ok true)))

;; -------------------------
;; Registration Functions
;; -------------------------
(define-public (register-identity (identity-hash (buff 32)) (expiry uint) (metadata (optional (buff 128))))
  (begin
    (check-not-paused)
    (try! (validate-hash identity-hash))
    (try! (validate-expiry expiry))
    (try! (validate-metadata metadata))
    (check-not-duplicate identity-hash)
    (asserts! (is-none (map-get? identities tx-sender)) ERR-DUPLICATE-IDENTITY)
    (map-set identities tx-sender 
      { hash: identity-hash, timestamp: block-height, expiry: expiry, metadata: metadata, revoked: false })
    (map-set hash-to-principal identity-hash tx-sender)
    (emit-event "identity-registered" (unwrap-panic (as-buff tx-sender)))
    (ok true)))

(define-public (update-identity (new-hash (buff 32)) (new-expiry uint) (new-metadata (optional (buff 128))))
  (let ((user tx-sender))
    (begin
      (check-not-paused)
      (let ((current-data (try! (check-registered user))))
        (try! (validate-hash new-hash))
        (try! (validate-expiry new-expiry))
        (try! (validate-metadata new-metadata))
        ;; Remove old hash mapping
        (map-delete hash-to-principal (get hash current-data))
        (check-not-duplicate new-hash)
        (map-set identities user 
          { hash: new-hash, timestamp: block-height, expiry: new-expiry, metadata: new-metadata, revoked: false })
        (map-set hash-to-principal new-hash user)
        (emit-event "identity-updated" (unwrap-panic (as-buff user)))
        (ok true)))))

(define-public (revoke-identity)
  (let ((user tx-sender))
    (begin
      (check-not-paused)
      (let ((current-data (try! (check-registered user))))
        (map-set identities user 
          (merge current-data { revoked: true }))
        ;; Keep hash mapping to prevent re-use
        (emit-event "identity-revoked" (unwrap-panic (as-buff user)))
        (ok true)))))

;; -------------------------
;; Verification Functions
;; -------------------------
(define-read-only (is-identity-registered (user principal))
  (match (map-get? identities user)
    data (and (not (get revoked data)) (< block-height (get expiry data)))
    false))

(define-read-only (get-identity-details (user principal))
  (match (map-get? identities user)
    data (if (and (not (get revoked data)) (< block-height (get expiry data)))
           (ok data)
           ERR-REGISTRATION-EXPIRED)
    ERR-NOT-REGISTERED))

(define-read-only (get-identity-hash (user principal))
  (match (try! (get-identity-details user))
    data (ok (get hash data))
    err err))

(define-read-only (get-owner-of-hash (hash (buff 32)))
  (ok (map-get? hash-to-principal hash)))

;; -------------------------
;; Integration Functions
;; -------------------------
(define-public (verify-with-trait (user principal) (verifier <identity-verifier-trait>) (proof (buff 32)))
  (begin
    (try! (check-registered user))
    (contract-call? verifier verify-identity user proof)))