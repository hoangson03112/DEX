// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IUniswapV2Pair.sol";

contract UniswapV2Router {
    IUniswapV2Factory public immutable factory;

    constructor(address _factory) {
        factory = IUniswapV2Factory(_factory);
    }

    // ---------- SAFE ERC20 ----------
    function _safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 value
    ) internal {
        (bool s, bytes memory data) = token.call(
            abi.encodeWithSelector(
                IERC20.transferFrom.selector,
                from,
                to,
                value
            )
        );
        require(
            s && (data.length == 0 || abi.decode(data, (bool))),
            "TRANSFER_FROM_FAILED"
        );
    }

    // ---------- HELPER UTILS ----------
    function _pairFor(address tokenA, address tokenB)
        internal
        view
        returns (address pair, bool zeroForOne)
    {
        pair = factory.getPair(tokenA, tokenB);
        require(pair != address(0), "NO_PAIR");
        zeroForOne = tokenA < tokenB; // tokenA là token0?
    }

    function _pairForOrCreate(address tokenA, address tokenB)
        internal
        returns (address pair, bool zeroForOne)
    {
        pair = factory.getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = factory.createPair(tokenA, tokenB);
        }
        zeroForOne = tokenA < tokenB;
    }

    function _reservesFor(address pair, bool zeroForOne)
        internal
        view
        returns (uint256 reserveIn, uint256 reserveOut)
    {
        (uint112 r0, uint112 r1, ) = IUniswapV2Pair(pair).getReserves();
        if (zeroForOne) {
            reserveIn = uint256(r0);
            reserveOut = uint256(r1);
        } else {
            reserveIn = uint256(r1);
            reserveOut = uint256(r0);
        }
    }

    function _quoteAdd(
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 reserveA,
        uint256 reserveB
    ) internal pure returns (uint256 amountA, uint256 amountB) {
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 bOptimal = (amountADesired * reserveB) / reserveA;
            if (bOptimal <= amountBDesired) {
                (amountA, amountB) = (amountADesired, bOptimal);
            } else {
                uint256 aOptimal = (amountBDesired * reserveA) / reserveB;
                (amountA, amountB) = (aOptimal, amountBDesired);
            }
        }
    }

    // ---------- ADD LIQUIDITY ----------
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        )
    {
        require(deadline >= block.timestamp, "EXPIRED");
        (address pair, bool zeroForOne) = _pairForOrCreate(tokenA, tokenB);

        (uint256 reserveA, uint256 reserveB) = _reservesFor(pair, zeroForOne);
        (amountA, amountB) = _quoteAdd(
            amountADesired,
            amountBDesired,
            reserveA,
            reserveB
        );

        require(amountA >= amountAMin, "INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "INSUFFICIENT_B_AMOUNT");

        _safeTransferFrom(tokenA, msg.sender, pair, amountA);
        _safeTransferFrom(tokenB, msg.sender, pair, amountB);

        liquidity = IUniswapV2Pair(pair).mint(to);
    }

    // ---------- REMOVE LIQUIDITY ----------
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB) {
        require(deadline >= block.timestamp, "EXPIRED");
        address pair = factory.getPair(tokenA, tokenB);
        require(pair != address(0), "NO_PAIR");

        _safeTransferFrom(pair, msg.sender, pair, liquidity);

        bool zeroForOne = tokenA < tokenB;
        (uint256 amount0, uint256 amount1) = IUniswapV2Pair(pair).burn(to);
        (amountA, amountB) = zeroForOne
            ? (amount0, amount1)
            : (amount1, amount0);

        require(amountA >= amountAMin, "INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "INSUFFICIENT_B_AMOUNT");
    }

    // ---------- SWAP (ONE HOP) ----------
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256 amountOut) {
        require(deadline >= block.timestamp, "EXPIRED");
        require(path.length == 2, "ONE_HOP");

        (address pair, bool zeroForOne) = _pairFor(path[0], path[1]);
        (uint256 reserveIn, uint256 reserveOut) = _reservesFor(
            pair,
            zeroForOne
        );

        amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        require(amountOut >= amountOutMin, "SLIPPAGE");

        // Transfer tokens from user to pair
        _safeTransferFrom(path[0], msg.sender, pair, amountIn);

        // Execute swap - pair will transfer tokens out to recipient
        if (zeroForOne) {
            IUniswapV2Pair(pair).swap(0, amountOut, to);
        } else {
            IUniswapV2Pair(pair).swap(amountOut, 0, to);
        }
    }

    // ---------- PRICING ----------
    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) public pure returns (uint256 amountOut) {
        require(amountIn > 0, "AIN");
        require(reserveIn > 0 && reserveOut > 0, "RES");
        uint256 amountInWithFee = amountIn * 997; // fee 0.3%
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }
}
