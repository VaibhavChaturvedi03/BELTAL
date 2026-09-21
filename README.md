# BELTAL — Blockchain-Enabled Trusted Access & Digital Asset Ledger

> **Problem Statement ID**: SIH26125  
> **Organization**: Bharat Electronics Limited (BEL), Ministry of Defence, Govt. of India  
> **Category**: Software | **Theme**: Blockchain & Cybersecurity  

---

## 📌 Executive Summary
**BELTAL** is a defence-grade cryptographic access control and digital asset ledger system designed for Bharat Electronics Limited (BEL). It combines **Decentralized Identifiers (DIDs)**, **Soulbound ERC-721 Asset NFTs**, and **Smart Contract Security Clearance Enforcement** with a **Triad Data Architecture** (Zero on-chain PII, encrypted IPFS storage, sub-5ms PostgreSQL cache) to prevent insider data tampering and provide immutable custody tracking across BEL's manufacturing units and Strategic Business Units (SBUs).

---

## 🏛️ System Architecture & Triad Model
* **On-Chain (Solidity ^0.8.20)**: `IdentityRegistry.sol`, `AccessControl.sol`, `AssetNFT.sol`, `AuditLog.sol` (Minimal cryptographic state, zero PII, DPDP Act 2023 compliant).
* **Decentralized Storage (IPFS)**: Client-side AES-256 encrypted dossiers, calibration certificates, and MIL-STD schematics.
* **Query Engine (PostgreSQL + Prisma)**: Sub-5ms indexed cache synchronized in real-time via blockchain event listeners.

---

## 🚀 Key Features & Hackathon Showstoppers
1. **Interactive PACS Badge Tap Simulator**: Real-time smart contract physical access evaluation (`canAccessZone`).
2. **Dual-Handshake Tactical Hardware Custody**: Restricted Soulbound NFTs for Software-Defined Radios, Spectrum Analyzers, and Crypto Modules.
3. **Anti-Tamper Integrity Scanner**: Flags any unauthorized off-chain database modification (e.g. rogue SQL privilege escalation) by comparing local data hashes against on-chain anchors.
4. **Zero Web3 Friction**: Master Relayer Key abstraction eliminates gas/seed-phrase burden for defence personnel.

---

## 📑 Detailed Documentation
* Full SIH 2026 Submission Document: [`docs/SIH_2026_BELTAL_Submission_Document.md`](docs/SIH_2026_BELTAL_Submission_Document.md)
* Master Architecture Specification: [`docs/project features & workflow.md`](docs/project%20features%20&%20workflow.md)
