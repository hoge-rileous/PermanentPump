//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

contract PermanentPump is ERC20, Ownable {
    using SafeMath for uint256;
    IERC20 HOGE = IERC20(0xfAd45E47083e4607302aa43c65fB3106F1cd7607);
    IUniswapV2Pair HOGEWETH = IUniswapV2Pair(0x7FD1de95FC975fbBD8be260525758549eC477960);
    address payable constant dev = payable(0x50C26be2738220ED61b4aD795422F21FEeEa6A3C);
    uint bid;
    uint ask;

    constructor() ERC20("Hoge 2.0 Permanent Pump", "PermanentPump") {
        uint price = spotPrice();
        bid = price.mul(98).div(100);
        ask = price.mul(102).div(100);
    }

    function decimals() public view virtual override returns (uint8) {
        return 9;
    }

    function spotPrice() internal view returns (uint price) {
        (uint ethReserves, uint hogeReserves,) = HOGEWETH.getReserves();
        price = ethReserves.mul(10**9).div(hogeReserves);
    }

    function openForBusiness() public view returns (bool) {
        uint price = spotPrice();
        return(price > bid.mul(95).div(100) 
            && price < ask.mul(105).div(100));
    }

    modifier withinRange() {
        require(openForBusiness(), "Price out of range!");
        _;
    }

    function setBid(uint set_bidPrice) public onlyOwner() {
        require (set_bidPrice < spotPrice(), "Out of range.");
        bid = set_bidPrice;
    }

    function setAsk(uint set_askPrice) public onlyOwner() {
        require (set_askPrice > spotPrice(), "Out of range.");
        ask = set_askPrice;
    }

    function getBid() public view returns (uint) {
        return bid;
    }

    function getAsk() public view returns (uint) {
        return ask;
    }

    function bidSize() public view returns (uint amountHOGE, uint amountETH) {
        // Summarizes the ETH available for purchase
        if (bid == 0) return (0,0);
        amountHOGE = address(this).balance.mul(10**9).div(bid);
        amountETH = address(this).balance;
    }

    function askSize() public view returns (uint amountHOGE, uint amountETH) {
        //Summarizes the HOGE available for purchase
        amountHOGE = HOGE.balanceOf(address(this));
        amountETH = amountHOGE.mul(ask).div(10**9);
    }

    function buyQuote(uint amountETH) public view returns (uint amountHOGE) {
        //Converts ETH to HOGE at the ask rate
        amountHOGE = amountETH.mul(10**9).div(ask);
        (uint HOGEForSale,) = askSize();
        require (amountHOGE <= HOGEForSale, "Amount exceeds Ask size.");
    }

    function sellQuote(uint amountHOGE) public view returns (uint amountETH) {
        // Converts HOGE to ETH at the bid rate
        amountETH = bid == 0 ? 0 : amountHOGE.mul(bid).div(10**9);
        require (amountETH <= address(this).balance, "Amount exceeds Bid size.");
    }

    function buyToken() public payable withinRange() returns (uint amountBought) {
        // Executes a buy.
        require(ask > 0, "Not interested.");
        require(msg.value > 0, "Congratulations, you bought zero HOGE.");
        amountBought = buyQuote(msg.value);
        dev.transfer(msg.value.div(100));
        HOGE.transfer(_msgSender(), amountBought);
    }

    function sellToken(uint amountHOGE) public withinRange() returns (uint ethToPay) {
        // Executes a sell.
        require(bid > 0, "Not interested.");
        require(amountHOGE > 0, "Congratulations, you sold zero HOGE.");
        ethToPay = sellQuote(amountHOGE);
        HOGE.transferFrom(_msgSender(), address(this), amountHOGE);
        payable(_msgSender()).transfer(ethToPay.mul(98).div(100));
        dev.transfer(ethToPay.div(100));
    }

    function addedETHToPP(uint amountETH) public view returns (uint ppMinted) {
        if (totalSupply() == 0) return 1000000000000;
        uint totalEthValue = address(this).balance.add(HOGE.balanceOf(address(this)).mul(spotPrice()).div(10**9));
        ppMinted = this.totalSupply().mul(amountETH).div(totalEthValue.sub(amountETH));
    }

    function addETH() public payable withinRange() returns (uint ppMinted) {
        ppMinted = addedETHToPP(msg.value);
        _mint(_msgSender(), ppMinted);
    }

    function addedHOGEToPP(uint amountHOGE) public view returns (uint ppMinted) {
        if (totalSupply() == 0) return 1000000000000;
        uint totalHOGEValue = HOGE.balanceOf(address(this)).add(address(this).balance.mul(10**9).div(ask));
        ppMinted = this.totalSupply().mul(amountHOGE).div(totalHOGEValue);
    }

    function addHOGE(uint amountHOGE) public withinRange() returns (uint ppMinted) {
        ppMinted = addedHOGEToPP(amountHOGE.mul(98).div(100));
        HOGE.transferFrom(_msgSender(), address(this), amountHOGE);
        _mint(_msgSender(), ppMinted);
    }

    function getPPShareValues(uint amountPP) public view returns(uint hogeValue, uint ethValue) {
        if (totalSupply() == 0) return (0, 0);
        hogeValue = HOGE.balanceOf(address(this)).mul(amountPP).div(totalSupply());
        ethValue = address(this).balance.mul(amountPP).div(totalSupply());
    }

    function removePP(uint amountPP) public {
        (uint hogeValue, uint ethValue) = getPPShareValues(amountPP);
        if (hogeValue > 0) {
            HOGE.transfer(_msgSender(), hogeValue);
        }
        if (ethValue > 0) {
            payable(_msgSender()).transfer(ethValue);
        }
        _burn(_msgSender(), amountPP);
    }

}
