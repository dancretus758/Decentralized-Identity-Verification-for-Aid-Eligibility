# 🔒 Decentralized Identity Verification for Aid Eligibility

Welcome to a secure, blockchain-powered solution for verifying identities and determining aid eligibility! This project uses the Stacks blockchain and Clarity smart contracts to protect vulnerable populations—such as refugees, disaster victims, or low-income individuals—from identity theft while ensuring fair and transparent distribution of humanitarian aid or social welfare benefits.

By leveraging decentralized identity (DID) principles, users can prove their identity without revealing sensitive personal data, and aid organizations can verify eligibility criteria on-chain. This prevents fraud like duplicate claims or impersonation, which is a major issue in traditional aid systems where centralized databases are vulnerable to hacks or corruption.

## ✨ Features

🔑 Self-sovereign identity registration with zero-knowledge proofs for privacy  
✅ On-chain eligibility verification based on predefined criteria (e.g., income level, location, or status)  
🛡️ Fraud prevention through multi-signature verifications and anomaly detection  
📊 Transparent audit trails for all identity and aid interactions  
💰 Tokenized aid distribution to eligible users via smart contracts  
🚫 Revocation mechanisms for compromised identities  
🌍 Integration with off-chain oracles for real-world data (e.g., government IDs or biometric hashes)  
🔄 Governance for updating eligibility rules without central control  

## 🛠 How It Works

This project is built with 8 modular Clarity smart contracts on the Stacks blockchain, ensuring scalability, security, and interoperability. Each contract handles a specific aspect of the system, allowing for easy upgrades and composability.

### Core Smart Contracts

1. **IdentityRegistry.clar**: Handles user identity registration. Users submit a hashed version of their personal data (e.g., biometric or document hash) and receive a unique DID. Prevents duplicates by checking existing hashes.

2. **VerificationOracle.clar**: Integrates with external oracles to verify identity claims. For example, it can confirm a user's refugee status via a trusted NGO feed without storing raw data on-chain.

3. **EligibilityCriteria.clar**: Defines and stores aid eligibility rules (e.g., "income < $10k/year" or "resides in disaster zone"). Aid organizations can propose and vote on updates via governance.

4. **AidToken.clar**: A fungible token contract (using SIP-010 standard) representing aid units (e.g., food credits or cash equivalents). Minted by authorized distributors and burned upon redemption.

5. **ClaimManager.clar**: Allows verified users to submit claims for aid. Checks against eligibility criteria and identity verification before approving token transfers.

6. **FraudDetection.clar**: Monitors for suspicious patterns, such as multiple claims from the same IP-like identifier or rapid revocations. Flags and freezes potentially fraudulent accounts.

7. **Governance.clar**: A DAO-style contract for stakeholders (e.g., NGOs, users) to vote on system updates, like adding new eligibility rules or revoking oracle access.

8. **AuditLog.clar**: Logs all key events (registrations, verifications, claims) immutably for transparency and auditing. Verifiers can query logs to trace any transaction.

### For Users (Vulnerable Individuals)

- Register your identity: Call `register-identity` in IdentityRegistry with a hash of your proof (e.g., passport or biometric data).
- Verify eligibility: Submit a zero-knowledge proof to VerificationOracle to confirm details without exposure.
- Claim aid: Use ClaimManager to request tokens if eligible—tokens are transferred automatically from AidToken.

Your identity remains private, and you control revocation if compromised!

### For Aid Organizations (Distributors/Verifiers)

- Set criteria: Propose rules via Governance and EligibilityCriteria.
- Distribute aid: Mint tokens in AidToken and allocate to eligible claims.
- Monitor fraud: Query FraudDetection and AuditLog for anomalies.
- Verify claims: Use verify-eligibility in ClaimManager to instantly check a user's status.

No more paperwork delays or theft risks—everything is on-chain and auditable!

## 🚀 Getting Started

1. Install the Clarinet tool for Clarity development.
2. Deploy the contracts on Stacks testnet.
3. Interact via the Stacks Wallet or custom frontend.
4. Test with sample data: Register a mock identity and simulate an aid claim.

This system solves real-world issues in aid distribution by decentralizing trust, reducing administrative overhead, and empowering users with control over their data. Let's build a fairer world! 🌟