// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {Jar} from "./Jar.sol";

contract JarFactory is Ownable {
    error TokenIsNotAllowed();

    mapping(address token => bool allowed) private s_allowedToken;

    constructor(address admin) Ownable(admin) {}

    event JarCreated(address indexed jar, address indexed owner, string name, address token, uint256 goalAmount);
    event AllowedTokenAdded(address indexed token);
    event AllowedTokenRemoved(address indexed token);

    function addAllowedToken(address token) external onlyOwner {
        s_allowedToken[token] = true;

        emit AllowedTokenAdded(token);
    }

    function removeAllowedToken(address token) external onlyOwner {
        s_allowedToken[token] = false;

        emit AllowedTokenRemoved(token);
    }

    function createJar(string calldata name, address tokenToSave, uint256 goalAmount) external returns (address) {
        if (!s_allowedToken[tokenToSave]) {
            revert TokenIsNotAllowed();
        }

        Jar jar = new Jar(name, tokenToSave, goalAmount);
        jar.transferOwnership(msg.sender);

        emit JarCreated(address(jar), msg.sender, name, tokenToSave, goalAmount);
        return address(jar);
    }

    function isAllowedToken(address token) external view returns (bool) {
        return s_allowedToken[token];
    }
}
