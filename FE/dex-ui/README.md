# Uniswap V2 Clone - DEX UI

Giao diện swap đơn giản cho Uniswap V2 clone trên Sepolia testnet.

## 🚀 Tính năng

- ✅ Kết nối MetaMask wallet
- ✅ Tự động chuyển sang Sepolia network
- ✅ Load danh sách tokens từ Factory contract
- ✅ Hiển thị balance thực tế của user
- ✅ Tính toán quote giá từ reserves của pair
- ✅ Approve tokens tự động
- ✅ Swap tokens với slippage protection
- ✅ UI responsive với Tailwind CSS

## 📋 Yêu cầu

- Node.js >= 16
- MetaMask browser extension
- SepoliaETH để trả gas fees
- Test tokens đã deploy trên Sepolia

## 🛠️ Cài đặt

```bash
npm install
```

## ⚙️ Cấu hình

Cập nhật file `.env` với địa chỉ smart contracts của bạn:

```env
VITE_CHAIN_ID=11155111
VITE_FACTORY=0xcb515099c8272ef1Fe352f9C2B7475BD7d53795D
VITE_ROUTER=0xB4d4dd642a0cC757C1D3c941897915BBCcf22C9E
VITE_TOKEN_A=0x77Aa9c3F95C1E81f01C8272BD7B8e2722CBd0c7b
VITE_TOKEN_B=0x850B32ED32e70a09BA17E6C05cd910eaCE287dc1
VITE_PAIR=0x7BFcBda7D75aA52CF4E7c215B92d16D5CBE7367B
```

## 🏃 Chạy ứng dụng

### Development mode:
```bash
npm run dev
```

Mở trình duyệt tại `http://localhost:5173`

### Build production:
```bash
npm run build
npm run preview
```

## 📖 Hướng dẫn sử dụng

1. **Kết nối Wallet**
   - Click nút "Connect Wallet"
   - Chọn MetaMask và approve connection
   - Tự động chuyển sang Sepolia network

2. **Swap Tokens**
   - Chọn token muốn swap (FROM)
   - Chọn token nhận (TO)
   - Nhập số lượng
   - Kiểm tra rate và slippage
   - Click "Swap" và confirm trong MetaMask
   - Approve token lần đầu tiên (chỉ 1 lần)
   - Confirm swap transaction

3. **Settings**
   - Click icon Settings để thay đổi slippage tolerance
   - Mặc định: 0.5%

## 🏗️ Cấu trúc dự án

```
src/
├── App.jsx              # Main component
├── hooks/
│   ├── useWallet.js     # Wallet connection logic
│   ├── useTokens.js     # Load tokens from factory
│   ├── useSwap.js       # Swap logic & quote calculation
│   └── useTokenBalance.js # Get token balance
├── services/
│   ├── config.js        # Contract addresses & constants
│   ├── eth.js          # Ethers.js wrapper functions
│   └── dexApi.js       # Contract interaction APIs
└── abi/
    ├── factory.js      # Factory ABI
    ├── router.js       # Router ABI
    ├── pair.js         # Pair ABI
    └── erc20.js        # ERC20 ABI
```

## 🔗 Smart Contracts

- **Factory**: `0xcb515099c8272ef1Fe352f9C2B7475BD7d53795D`
- **Router**: `0xB4d4dd642a0cC757C1D3c941897915BBCcf22C9E`
- **Token A**: `0x77Aa9c3F95C1E81f01C8272BD7B8e2722CBd0c7b`
- **Token B**: `0x850B32ED32e70a09BA17E6C05cd910eaCE287dc1`
- **Pair**: `0x7BFcBda7D75aA52CF4E7c215B92d16D5CBE7367B`

Xem trên Sepolia Etherscan: https://sepolia.etherscan.io/

## 🐛 Troubleshooting

### MetaMask không tự động chuyển network?
- Kiểm tra lại VITE_CHAIN_ID trong .env
- Manually thêm Sepolia network trong MetaMask

### Không load được tokens?
- Đảm bảo đã kết nối wallet
- Kiểm tra Factory address đúng
- Mở Console để xem lỗi chi tiết

### Swap failed?
- Kiểm tra balance đủ tokens
- Tăng slippage tolerance (trong Settings)
- Đảm bảo có đủ SepoliaETH để trả gas
- Kiểm tra pair đã có liquidity chưa

### Price impact quá cao?
- Pair có ít liquidity
- Cần add thêm liquidity hoặc giảm amount swap

## 📝 License

MIT

## 🤝 Contributing

PRs welcome!

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
