const { providers, Contract, utils } = require("ethers");
const got = require("got");
const dotenv = require("dotenv");
dotenv.config();

const ALCHEMY_SECRET = process.env.ALCHEMY_KEY;
const provider = new providers.AlchemyProvider("rinkeby", ALCHEMY_SECRET);

const REGISTRY_CONTRACT_ADDRESS = "0xe3Be01D99bAa8dB9905b33a3cA391238234B79D1";
const REGISTRY_ABI = [
  {
    name: "getDirectoryUrl",
    inputs: [{ internalType: "bytes32", name: "username", type: "bytes32" }],
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "addressToUsername",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
];

const registryContract = new Contract(
  REGISTRY_CONTRACT_ADDRESS,
  REGISTRY_ABI,
  provider
);

const getUserDirectory = async (username) => {
  console.log("Getting", username);
  const byte32Name = utils.formatBytes32String(username);
  const directoryUrl = await registryContract.getDirectoryUrl(byte32Name);

  const directoryResponse = await got(directoryUrl);
  const directory = JSON.parse(directoryResponse.body);
  return directory;
};

const getCastsByUser = async (username) => {
  const directory = await getUserDirectory(username);
  const addressActivityUrl = directory.body.addressActivityUrl;
  const addressActivityResponse = await got(addressActivityUrl);
  const addressActivity = JSON.parse(addressActivityResponse.body);

  const castList = await Promise.all(
    addressActivity.slice(0, 10).map(async (cast) => {
      const stringifiedCastBody = JSON.stringify(cast.body);
      const calculatedHash = utils.keccak256(
        utils.toUtf8Bytes(stringifiedCastBody)
      );
      const expectedHash = cast.merkleRoot;

      //   if (calculatedHash !== expectedHash) {
      //     console.log(
      //       `FAILED: the calculated hash ${calculatedHash} does not match the one in the cast: ${expectedHash}`
      //     );
      //   } else {
      //     console.log(
      //       `PASSED: the calculated hash ${calculatedHash} matches the one in the cast`
      //     );
      //   }

      const recoveredAddress = utils.verifyMessage(
        cast.merkleRoot,
        cast.signature
      );
      const expectedAddress = cast.body.address;

      //   if (recoveredAddress !== expectedAddress) {
      //     console.log(
      //       `Failed: the recovered address ${recoveredAddress} does not match the address  provided in the cast ${expectedAddress}`
      //     );
      //   } else {
      //     console.log(
      //       `PASSED: the recovered address ${recoveredAddress} matches the one in the cast`
      //     );
      //   }

      const encodedUsername = await registryContract.addressToUsername(
        expectedAddress
      );
      const expectedUsername = utils.parseBytes32String(encodedUsername);
      const castUsername = cast.body.username;

      //   if (expectedUsername !== castUsername) {
      //     console.log(
      //       `FAILED: ${expectedAddress} does not own ${castUsername}, it owns ${expectedUsername}`
      //     );
      //   } else {
      //     console.log(`PASSED: ${expectedAddress} owns ${castUsername}`);
      //   }
      return cast;
    })
  );
  return castList;
};

const formatCasts = (castList) =>
  castList.map((cast) => {
    return {
      datetime: new Date(cast.body.publishedAt).toLocaleString(),
      text: cast.body.data.text,
      displayName: cast.meta.displayName,
      avatar: cast.meta.avatar,
      username: cast.body.username,
    };
  });

const getFeed = async (followedUsers) => {
  const castList = await followedUsers.reduce(async (acc, username) => {
    const userCastList = await getCastsByUser(username);
    acc = await acc;
    console.log("accccc", acc.length);
    return acc.concat(userCastList);
  }, []);

  //   console.log("LIST", castList);
  const sortedCasts = castList.sort(
    ({ body: bodyA }, { body: bodyB }) => bodyB.publishedAt - bodyA.publishedAt
  );

  const formattedCastList = formatCasts(sortedCasts);

  return formattedCastList;
};

module.exports = {
  getUserDirectory,
  getCastsByUser,
  getFeed,
  formatCasts,
};
