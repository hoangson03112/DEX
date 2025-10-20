export function getAmountOut(amountIn, reserveIn, reserveOut, feeNum = 997n, feeDen = 1000n) {
    const amountInWithFee = (amountIn * feeNum) / feeDen;
    return (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);
    }
    export function applySlippageMin(amount, bps = 50n) { // 0.5%
    return (amount * (10000n - bps)) / 10000n;
    }