// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title IP4PS Registry — Intellectual Property 4 Pillars System
/// @notice One contract that holds every protected work.
///   P1 Synergy          — this contract: the rules that tie the other three pillars together and run licensing.
///   P2 Time             — the block timestamp and block number written at registration. They cannot be backdated.
///   P3 Elements         — an ERC-721 token for each work, with ERC-2981 royalty information.
///   P4 Celestial Bodies — the creator's address, which signed the registration transaction.
/// @dev Each file is identified by its SHA-256 fingerprint. A fingerprint can be registered only once,
///      so the earliest registration of a file is the one this contract keeps.
contract IP4PSRegistry is ERC721Enumerable, ERC2981, ReentrancyGuard {
    enum IPKind {
        Music,
        Film,
        Artwork,
        Podcast,
        Content,
        Custom
    }

    struct IPRecord {
        address creator;
        uint64 registeredAt;
        uint64 blockNumber;
        IPKind kind;
        uint16 fileCount;
        uint96 royaltyBps;
        bytes32 contentHash;
        string subtype;
        string title;
        string metadataURI;
    }

    enum LicenseStatus {
        None,
        Offered,
        Active,
        Revoked
    }

    struct License {
        uint256 tokenId;
        address licensor;
        address licensee;
        uint64 durationDays;
        uint64 startsAt;
        uint64 expiresAt;
        uint256 fee;
        LicenseStatus status;
        string licenseType;
        string termsURI;
    }

    uint16 public constant MAX_FILES = 64;
    uint96 public constant MAX_ROYALTY_BPS = 2_500; // 25%

    uint256 private _nextTokenId = 1;
    uint256 private _nextLicenseId = 1;

    mapping(uint256 => IPRecord) private _records;
    mapping(uint256 => bytes32[]) private _fileHashes;
    /// @notice Token that registered a file fingerprint (0 when the fingerprint is unregistered).
    mapping(bytes32 => uint256) public tokenOfHash;

    mapping(uint256 => License) private _licenses;
    mapping(uint256 => uint256[]) private _tokenLicenses;
    mapping(address => uint256[]) private _licenseeLicenses;
    /// @notice License fees a licensor has received and not yet withdrawn.
    mapping(address => uint256) public pendingWithdrawals;

    event IPRegistered(
        uint256 indexed tokenId,
        address indexed creator,
        IPKind indexed kind,
        bytes32 contentHash,
        bytes32[] fileHashes,
        string title,
        string metadataURI
    );
    event LicenseGranted(
        uint256 indexed licenseId,
        uint256 indexed tokenId,
        address indexed licensee,
        uint256 fee,
        uint64 durationDays,
        string licenseType
    );
    event LicenseAccepted(uint256 indexed licenseId, uint256 indexed tokenId, address indexed licensee, uint64 expiresAt);
    event LicenseRevoked(uint256 indexed licenseId, uint256 indexed tokenId);
    event Withdrawal(address indexed account, uint256 amount);

    error EmptyTitle();
    error NoFiles();
    error TooManyFiles(uint256 count);
    error ZeroHash(uint256 index);
    error AlreadyRegistered(bytes32 fileHash, uint256 tokenId);
    error RoyaltyTooHigh(uint96 bps);
    error UnknownToken(uint256 tokenId);
    error NotTokenOwner(uint256 tokenId, address caller);
    error InvalidLicensee();
    error UnknownLicense(uint256 licenseId);
    error LicenseNotOffered(uint256 licenseId);
    error NotLicensee(uint256 licenseId, address caller);
    error NotLicensor(uint256 licenseId, address caller);
    error WrongFee(uint256 expected, uint256 sent);
    error LicensorNoLongerOwner(uint256 licenseId);
    error NothingToWithdraw();
    error TransferFailed();

    constructor() ERC721("IP4PS Protected Work", "IP4PS") {}

    // ─── Registration (P1 + P2 + P3 + P4 in one transaction) ────────────────────────────────

    /// @param kind         Content type.
    /// @param subtype      Free-form subtype, e.g. "single", "album", "short", "feature".
    /// @param title        Title of the work.
    /// @param metadataURI  Token metadata (ipfs:// or data: URI) describing the work and its files.
    /// @param fileHashes   SHA-256 of each file. The first entry is the primary work.
    /// @param royaltyBps   Secondary-sale royalty for the creator in basis points (0 = none).
    function register(
        IPKind kind,
        string calldata subtype,
        string calldata title,
        string calldata metadataURI,
        bytes32[] calldata fileHashes,
        uint96 royaltyBps
    ) external returns (uint256 tokenId) {
        if (bytes(title).length == 0) revert EmptyTitle();
        uint256 count = fileHashes.length;
        if (count == 0) revert NoFiles();
        if (count > MAX_FILES) revert TooManyFiles(count);
        if (royaltyBps > MAX_ROYALTY_BPS) revert RoyaltyTooHigh(royaltyBps);

        tokenId = _nextTokenId++;

        for (uint256 i = 0; i < count; i++) {
            bytes32 h = fileHashes[i];
            if (h == bytes32(0)) revert ZeroHash(i);
            uint256 existing = tokenOfHash[h];
            if (existing != 0) revert AlreadyRegistered(h, existing);
            // Marking as we go also rejects the same file listed twice in one registration.
            tokenOfHash[h] = tokenId;
        }

        _records[tokenId] = IPRecord({
            creator: msg.sender,
            registeredAt: uint64(block.timestamp),
            blockNumber: uint64(block.number),
            kind: kind,
            fileCount: uint16(count),
            royaltyBps: royaltyBps,
            contentHash: fileHashes[0],
            subtype: subtype,
            title: title,
            metadataURI: metadataURI
        });
        _fileHashes[tokenId] = fileHashes;

        if (royaltyBps > 0) _setTokenRoyalty(tokenId, msg.sender, royaltyBps);
        _safeMint(msg.sender, tokenId);

        emit IPRegistered(tokenId, msg.sender, kind, fileHashes[0], fileHashes, title, metadataURI);
    }

    // ─── Reads ──────────────────────────────────────────────────────────────────────────────

    function getIP(uint256 tokenId)
        external
        view
        returns (IPRecord memory record, bytes32[] memory fileHashes, address currentOwner)
    {
        _requireKnown(tokenId);
        return (_records[tokenId], _fileHashes[tokenId], _ownerOf(tokenId));
    }

    /// @notice Checks each pillar independently from on-chain state.
    function verifyFourPillars(uint256 tokenId)
        external
        view
        returns (bool synergy, bool time, bool elements, bool celestialBodies)
    {
        IPRecord storage r = _records[tokenId];
        synergy = r.creator != address(0) && r.fileCount > 0 && tokenOfHash[r.contentHash] == tokenId;
        time = r.registeredAt > 0 && r.blockNumber > 0 && r.registeredAt <= block.timestamp;
        elements = _ownerOf(tokenId) != address(0);
        celestialBodies = r.creator != address(0);
    }

    /// @notice Every token currently held by `owner`.
    function tokensOfOwner(address owner) external view returns (uint256[] memory ids) {
        uint256 n = balanceOf(owner);
        ids = new uint256[](n);
        for (uint256 i = 0; i < n; i++) ids[i] = tokenOfOwnerByIndex(owner, i);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _records[tokenId].metadataURI;
    }

    // ─── Licensing (P1: self-executing agreements) ──────────────────────────────────────────

    /// @notice Offer a license. A free license is active at once; a paid one becomes active when
    ///         the licensee pays the exact fee with acceptLicense.
    /// @param durationDays 0 means perpetual.
    function grantLicense(
        uint256 tokenId,
        address licensee,
        uint64 durationDays,
        uint256 fee,
        string calldata licenseType,
        string calldata termsURI
    ) external returns (uint256 licenseId) {
        address holder = _ownerOf(tokenId);
        if (holder == address(0)) revert UnknownToken(tokenId);
        if (holder != msg.sender) revert NotTokenOwner(tokenId, msg.sender);
        if (licensee == address(0) || licensee == msg.sender) revert InvalidLicensee();

        licenseId = _nextLicenseId++;
        License storage l = _licenses[licenseId];
        l.tokenId = tokenId;
        l.licensor = msg.sender;
        l.licensee = licensee;
        l.durationDays = durationDays;
        l.fee = fee;
        l.licenseType = licenseType;
        l.termsURI = termsURI;
        l.status = LicenseStatus.Offered;

        _tokenLicenses[tokenId].push(licenseId);
        _licenseeLicenses[licensee].push(licenseId);
        emit LicenseGranted(licenseId, tokenId, licensee, fee, durationDays, licenseType);

        if (fee == 0) _activate(licenseId);
    }

    function acceptLicense(uint256 licenseId) external payable nonReentrant {
        License storage l = _licenses[licenseId];
        if (l.status == LicenseStatus.None) revert UnknownLicense(licenseId);
        if (l.status != LicenseStatus.Offered) revert LicenseNotOffered(licenseId);
        if (msg.sender != l.licensee) revert NotLicensee(licenseId, msg.sender);
        if (msg.value != l.fee) revert WrongFee(l.fee, msg.value);
        if (_ownerOf(l.tokenId) != l.licensor) revert LicensorNoLongerOwner(licenseId);

        pendingWithdrawals[l.licensor] += msg.value;
        _activate(licenseId);
    }

    /// @notice Withdraw an offer that has not been accepted yet.
    function revokeOffer(uint256 licenseId) external {
        License storage l = _licenses[licenseId];
        if (l.status == LicenseStatus.None) revert UnknownLicense(licenseId);
        if (l.status != LicenseStatus.Offered) revert LicenseNotOffered(licenseId);
        if (msg.sender != l.licensor) revert NotLicensor(licenseId, msg.sender);
        l.status = LicenseStatus.Revoked;
        emit LicenseRevoked(licenseId, l.tokenId);
    }

    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) revert NothingToWithdraw();
        pendingWithdrawals[msg.sender] = 0;
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawal(msg.sender, amount);
    }

    function getLicense(uint256 licenseId) external view returns (License memory) {
        if (_licenses[licenseId].status == LicenseStatus.None) revert UnknownLicense(licenseId);
        return _licenses[licenseId];
    }

    function isLicenseActive(uint256 licenseId) public view returns (bool) {
        License storage l = _licenses[licenseId];
        return l.status == LicenseStatus.Active && block.timestamp < l.expiresAt;
    }

    function licensesOfToken(uint256 tokenId) external view returns (uint256[] memory) {
        return _tokenLicenses[tokenId];
    }

    function licensesOfLicensee(address licensee) external view returns (uint256[] memory) {
        return _licenseeLicenses[licensee];
    }

    // ─── Internals ──────────────────────────────────────────────────────────────────────────

    function _activate(uint256 licenseId) private {
        License storage l = _licenses[licenseId];
        l.status = LicenseStatus.Active;
        l.startsAt = uint64(block.timestamp);
        l.expiresAt = l.durationDays == 0 ? type(uint64).max : uint64(block.timestamp) + l.durationDays * 1 days;
        emit LicenseAccepted(licenseId, l.tokenId, l.licensee, l.expiresAt);
    }

    function _requireKnown(uint256 tokenId) private view {
        if (_records[tokenId].creator == address(0)) revert UnknownToken(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Enumerable, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
