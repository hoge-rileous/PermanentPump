require('dotenv').config()
const { ethers } = require("hardhat");
const { expect } = require("chai");
const IUniswapV2Pair = require("../contracts/pair.json");
//import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
let hogeAddr = "0xfAd45E47083e4607302aa43c65fB3106F1cd7607";
const erc20 = require("../contracts/erc20.json");
const me = "0x63F85e78F991aF28f98Cf15db0FB8060f880b794";
const wb = "0x39f6a6c85d39d5abad8a398310c52e7c374f2ba3";

const optiABI = [{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"buyToken","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"collectFees","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"sellToken","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}];
describe("PermanentPump", async (accounts) => {

  beforeEach(async () => {
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: process.env.alchemyAPI,
            blockNumber: 15104622,
          },
        },
      ],
    });
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [me],
    });
    await hre.network.provider.send("hardhat_setBalance", [
      me,
      "0xFFFFFFFFFFFFFFFFF",
    ]);
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [wb],
    });
    await hre.network.provider.send("hardhat_setBalance", [
      wb,
      "0xFFFFFFFFFFFFFFFFF",
    ]);
  });


  it("compiles and deploys.", async function () {
    const hoge = await ethers.getContractAt(erc20, hogeAddr);
    const opti = await ethers.getContractAt(optiABI, "0x293be20db3e4110670afbcae916393e40bc9b42b");

    const hogePool = await ethers.getContractAt(IUniswapV2Pair, "0x7FD1de95FC975fbBD8be260525758549eC477960");
    const reserves = await hogePool.getReserves();
    console.log(reserves[0].toString());
    console.log(reserves[1].toString());
    let exchangeRate = reserves[0].mul(10**9).div(reserves[1])
    console.log(exchangeRate.toString());


    const accounts = await ethers.getSigners();
    const provider = ethers.provider;

    accounts[0] = await ethers.getSigner(me);
    accounts[1] = await ethers.getSigner(wb);

    const PermanentPump = await ethers.getContractFactory("PermanentPump");
    const pp = await PermanentPump.deploy();
    await pp.deployed();

    const bid = await pp.getBid();
    const ask = await pp.getAsk();

    const reportOut = async (i) => {
      const account = accounts[i];
      const ethBalance = await pp.provider.getBalance(account.address);
      const hogeBalance = await hoge.balanceOf(account.address);
      const ppBalance = await pp.balanceOf(account.address);

      console.log("------------Reporting account ", i);
      console.log("ETH balance: ", ethers.utils.formatEther(ethBalance));
      console.log("HOGE balance: ", ethers.utils.formatUnits(hogeBalance, 9));
      console.log("PP balance:                    ", ethers.utils.formatUnits(ppBalance, 9));

      //if (!ppBalance.isZero())
        await reportReserves(ppBalance);
    }    

    const reportReserves = async (amt) => {
      const ethBalance = await pp.provider.getBalance(pp.address);
      const hogeBalance = await hoge.balanceOf(pp.address);
      const [hogeValue, ethValue] = await pp.getPPShareValues(amt);
      const totalSupply = await pp.totalSupply();
      console.log("---Reporting PP Status--- T: ", ethers.utils.formatUnits(totalSupply, 9));
      console.log("ETH balance: ", ethers.utils.formatEther(ethBalance));
      console.log("HOGE balance: ", ethers.utils.formatUnits(hogeBalance, 9));
      console.log(ethers.utils.formatUnits(amt, 9), " PP               -----> ", 
        ethers.utils.formatUnits(hogeValue, 9),
        " HOGE, ",
        ethers.utils.formatEther(ethValue),
        " ETH.");
      const totalValueAmt = ethValue.add(hogeValue.mul(exchangeRate).div(10**9));
      console.log("(Total value ", ethers.utils.formatEther(totalValueAmt));
    }

    const addETH = async (i, amt) => {
      console.log("                       > Account ", i, " adds ", ethers.utils.formatEther(amt), " ETH");
      const pp_i = await pp.connect(accounts[i]);
      await pp_i.addETH({value: amt}); 
      await reportOut(i);
    }

    const addHOGE  = async (i, amt) => {
      console.log("                       > Account ", i, " adds ", ethers.utils.formatUnits(amt, 9 ), " HOGE");
      const pp_i = await pp.connect(accounts[i]);
      const hoge_i = await hoge.connect(accounts[i]);
      const appr_txn = await hoge_i.approve(pp.address, amt);
      await appr_txn.wait();
      await pp_i.addHOGE(amt); 
      await reportOut(i);
    }

    const removePP = async(i, amt) => {
      const pp_i = await pp.connect(accounts[i]);
      await pp_i.removePP(amt);
      await reportOut(i);
    }

    const rug = async (i) => {
      console.log("                       > Rugging ", i);
      const ppBalance = await pp.balanceOf(accounts[i].address);
      await removePP(i, ppBalance);
    }


    const reportPrices = async () => {
      const bid = await pp.getBid();
      console.log("bid: ", bid.toString());
      const ask = await pp.getAsk();
      console.log("ask: ", ask.toString());
    }


    const oneETH = ethers.utils.parseEther("1.0");
    const oneETHofHOGE = oneETH.mul(10**9).div(ask);

    await reportPrices();

    console.log("1 eth of HOGE: ", ethers.utils.formatUnits(oneETHofHOGE, 9));

    let ofb = await pp.openForBusiness();
    console.log(ofb);

    //Add and remove pure ETH
    await addETH(0, oneETH);
    await addETH(1, oneETH);
    await addETH(0, oneETH);
    await rug(0);
    await rug(1);


    //Add and remove mixed assets
    await addHOGE(0, oneETHofHOGE);
    await addHOGE(1, oneETHofHOGE);
    await addETH(0, oneETH);
    // When 0 adds on the ETH side, it immediately skews both's exposure 
    // effectively 1 sells some HOGE to 0 but both keep same overall value.
    await reportOut(1);

    console.log("Buying");

    await pp.buyToken({value:oneETH});

    await reportOut(1);

    console.log("Selling")

    const pp_1 = await pp.connect(accounts[1]);
    const hoge_1 = await hoge.connect(accounts[1]);
    const appr_txn = await hoge_1.approve(pp_1.address, oneETHofHOGE);
    await appr_txn.wait();
    await pp_1.sellToken(oneETHofHOGE);

    await reportOut(1);

    await opti.buyToken("0xfad45e47083e4607302aa43c65fb3106f1cd7607", "0", "999999999999", {value:oneETH.mul(100)});

    ofb = await pp.openForBusiness();
    console.log(ofb);

    const new_reserves = await hogePool.getReserves();
    exchangeRate = new_reserves[0].mul(10**9).div(new_reserves[1])
    console.log(exchangeRate.toString());

    await expect(pp.buyToken({value:oneETH})).to.be.revertedWith("Price out of range!");

    await pp.setBid(exchangeRate.mul(99).div(100));
    await pp.setAsk(exchangeRate.mul(101).div(100));

    ofb = await pp.openForBusiness();
    console.log(ofb);


    console.log("Buying");

    await pp.buyToken({value:oneETH});

    await reportOut(1);



  });
});