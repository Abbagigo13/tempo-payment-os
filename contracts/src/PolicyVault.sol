// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// Minimal view of a TIP-20 token: only what the vault needs.
interface ITIP20 {
    function transferWithMemo(address to, uint256 amount, bytes32 memo) external;
}

/// PolicyVault: holds one TIP-20 token and only lets it leave through
/// payments that pass the policies below.
///
/// TESTNET DEMO. Not audited. Do not use with real funds.
///
/// Policies:
///  - Daily limit: total executed per UTC day (fixed day buckets).
///  - Approval threshold: bigger payments wait for the approver.
///  - New recipient review (optional): unknown recipients wait for approval.
///
/// The owner can change policies instantly, so this protects against
/// mistakes and buggy apps, not against a stolen owner key.
contract PolicyVault {
    enum Status {
        None,
        Pending,
        Executed,
        Rejected
    }

    struct Payment {
        address to;
        uint256 amount;
        bytes32 memo;
        uint64 createdAt;
        Status status;
    }

    ITIP20 public immutable token;
    address public owner;
    address public approver;

    uint256 public dailyLimit;
    uint256 public approvalThreshold;
    bool public requireKnownRecipient;

    mapping(address => bool) public knownRecipient;
    mapping(uint256 => uint256) public spentOnDay;
    mapping(uint256 => Payment) private payments;
    uint256 public paymentCount;

    error NotOwner();
    error NotApprover();
    error ZeroAddress();
    error ZeroAmount();
    error NotPending(uint256 id);
    error DailyLimitExceeded(uint256 wouldSpend, uint256 limit);

    event PaymentPending(uint256 indexed id, address indexed to, uint256 amount, bytes32 memo);
    event PaymentExecuted(uint256 indexed id, address indexed to, uint256 amount, bytes32 memo);
    event PaymentRejected(uint256 indexed id);
    event DailyLimitChanged(uint256 oldLimit, uint256 newLimit);
    event ApprovalThresholdChanged(uint256 oldThreshold, uint256 newThreshold);
    event RequireKnownRecipientChanged(bool enabled);
    event KnownRecipientAdded(address indexed recipient);
    event ApproverChanged(address indexed oldApprover, address indexed newApprover);
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyApprover() {
        if (msg.sender != approver) revert NotApprover();
        _;
    }

    constructor(
        address token_,
        address owner_,
        address approver_,
        uint256 dailyLimit_,
        uint256 approvalThreshold_
    ) {
        if (token_ == address(0) || owner_ == address(0) || approver_ == address(0)) {
            revert ZeroAddress();
        }
        token = ITIP20(token_);
        owner = owner_;
        approver = approver_;
        dailyLimit = dailyLimit_;
        approvalThreshold = approvalThreshold_;
    }

    // ---------------------------------------------------------------
    // Payments
    // ---------------------------------------------------------------

    /// Submit a payment. It either executes right away or waits for approval.
    /// Reverts if it would break the daily limit (nothing is recorded).
    function submitPayment(address to, uint256 amount, bytes32 memo)
        external
        onlyOwner
        returns (uint256 id)
    {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        id = ++paymentCount;
        payments[id] = Payment({
            to: to,
            amount: amount,
            memo: memo,
            createdAt: uint64(block.timestamp),
            status: Status.Pending
        });

        bool needsApproval = amount > approvalThreshold ||
            (requireKnownRecipient && !knownRecipient[to]);

        if (needsApproval) {
            emit PaymentPending(id, to, amount, memo);
        } else {
            _execute(id);
        }
    }

    /// Approve a pending payment. The daily limit is checked now, not
    /// when the payment was submitted.
    function approve(uint256 id) external onlyApprover {
        if (payments[id].status != Status.Pending) revert NotPending(id);
        _execute(id);
    }

    function reject(uint256 id) external onlyApprover {
        Payment storage p = payments[id];
        if (p.status != Status.Pending) revert NotPending(id);
        p.status = Status.Rejected;
        emit PaymentRejected(id);
    }

    // State is updated before the token call (checks-effects-interactions),
    // so a payment can never execute twice.
    function _execute(uint256 id) internal {
        Payment storage p = payments[id];

        uint256 day = block.timestamp / 1 days;
        uint256 newSpent = spentOnDay[day] + p.amount;
        if (newSpent > dailyLimit) revert DailyLimitExceeded(newSpent, dailyLimit);

        spentOnDay[day] = newSpent;
        p.status = Status.Executed;
        knownRecipient[p.to] = true;

        token.transferWithMemo(p.to, p.amount, p.memo);

        emit PaymentExecuted(id, p.to, p.amount, p.memo);
    }

    // ---------------------------------------------------------------
    // Policy settings (owner only, effective immediately)
    // ---------------------------------------------------------------

    function setDailyLimit(uint256 newLimit) external onlyOwner {
        emit DailyLimitChanged(dailyLimit, newLimit);
        dailyLimit = newLimit;
    }

    function setApprovalThreshold(uint256 newThreshold) external onlyOwner {
        emit ApprovalThresholdChanged(approvalThreshold, newThreshold);
        approvalThreshold = newThreshold;
    }

    function setRequireKnownRecipient(bool enabled) external onlyOwner {
        requireKnownRecipient = enabled;
        emit RequireKnownRecipientChanged(enabled);
    }

    function addKnownRecipient(address recipient) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        knownRecipient[recipient] = true;
        emit KnownRecipientAdded(recipient);
    }

    function setApprover(address newApprover) external onlyOwner {
        if (newApprover == address(0)) revert ZeroAddress();
        emit ApproverChanged(approver, newApprover);
        approver = newApprover;
    }

    function setOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    // ---------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------

    function remainingToday() external view returns (uint256) {
        uint256 spent = spentOnDay[block.timestamp / 1 days];
        return spent >= dailyLimit ? 0 : dailyLimit - spent;
    }

    function getPayment(uint256 id) external view returns (Payment memory) {
        return payments[id];
    }
}
