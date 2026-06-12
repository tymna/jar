// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Jar is Ownable {
    using SafeERC20 for IERC20;

    // ---- ERRORS ---- //
    error AmountMustBeGreaterThanZero();
    error TokenAddressCannotBeZero();
    error JarIsClosed();

    // ---- ENUMM ---- //
    enum JarStatus {
        ACTIVE,
        CLOSED
    }

    // ---- STATE VARAIBLES ---- //
    JarStatus private s_status;
    string private s_name;

    uint256 private s_goalAmount; // just visual target, does not lock any operations
    address private immutable i_tokenToSave;

    // ---- EVENTS ---- //
    event Deposit(address indexed from, uint256 amount);
    event WithdrawAll(address indexed to, uint256 amount);
    event GoalAmountChanged(uint256 oldGoal, uint256 newGoal);

    // ---- CONSTRUCTOR ---- //
    constructor(string memory name, address tokenToSave, uint256 goalAmount) Ownable(msg.sender) {
        if (tokenToSave == address(0)) {
            revert TokenAddressCannotBeZero();
        }
        // keep in sync with changeGoal: a goal of 0 is never valid
        if (goalAmount == 0) {
            revert AmountMustBeGreaterThanZero();
        }

        s_name = name;
        i_tokenToSave = tokenToSave;
        s_goalAmount = goalAmount;
    }

    // ---- FUNCTIONS ---- //
    function deposit(uint256 amount) external {
        if (amount == 0) {
            revert AmountMustBeGreaterThanZero();
        }

        if (s_status == JarStatus.CLOSED) {
            revert JarIsClosed();
        }

        IERC20(i_tokenToSave).safeTransferFrom(msg.sender, address(this), amount);

        emit Deposit(msg.sender, amount);
    }

    function withdrawAll() external onlyOwner returns (uint256 amountToWithdraw) {
        address tokenToSave = i_tokenToSave;

        s_status = JarStatus.CLOSED;

        amountToWithdraw = IERC20(tokenToSave).balanceOf(address(this));
        IERC20(tokenToSave).safeTransfer(msg.sender, amountToWithdraw);

        emit WithdrawAll(msg.sender, amountToWithdraw);
    }

    function changeGoal(uint256 amount) external onlyOwner {
        if (amount == 0) {
            revert AmountMustBeGreaterThanZero();
        }

        if (s_status == JarStatus.CLOSED) {
            revert JarIsClosed();
        }

        uint256 oldGoal = s_goalAmount;
        s_goalAmount = amount;

        emit GoalAmountChanged(oldGoal, amount);
    }

    // ---- GETTERS ---- //
    function getName() external view returns (string memory) {
        return s_name;
    }

    function getToken() external view returns (address) {
        return i_tokenToSave;
    }

    function getGoalAmount() external view returns (uint256) {
        return s_goalAmount;
    }

    function getCurrentBalance() external view returns (uint256) {
        return IERC20(i_tokenToSave).balanceOf(address(this));
    }

    function getJarStatus() external view returns (JarStatus) {
        return s_status;
    }
}
