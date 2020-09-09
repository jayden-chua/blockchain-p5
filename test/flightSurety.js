var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeContract(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");

  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");

  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

    it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
        try {
            await config.flightSuretyApp.registerAirline(accounts[2], { from: config.firstAirline });
        } catch (e) {}
        let result = await config.flightSuretyData.isAirlineRegisteredApprovedAndFunded.call(accounts[2]);
        assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
    });

    it('(airline) can register an Airline using registerAirline() if it is funded', async () => {
        let newAirline = accounts[3];
        let fundAirlineValue = web3.utils.toWei('10', 'ether');
        await config.flightSuretyApp.fundAirline({ from: config.owner, value: fundAirlineValue });
        await config.flightSuretyApp.registerAirline(newAirline, { from: config.owner });
        let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline);
        assert.equal(result, true, "Airline should be able to register another airline if it has provided funding");
    });

    it('(owner) can get total airline count', async () => {
        await config.flightSuretyApp.registerAirline(accounts[4], { from: config.owner });
        let result = await config.flightSuretyData.getAirlinesCount.call({ from: config.owner });
        assert.equal(result, 3, "Airline owner should be able to get total airline registered");
    });

    it('(airline) cannot register an Airline using registerAirline() on airlines that are already registered', async () => {
        try { 
            // Expecting this to revert since account 4 has already previously been registered
            await config.flightSuretyApp.registerAirline(accounts[4], { from: config.firstAirline }); 
        } catch(e) {}
        let result = await config.flightSuretyData.getAirlinesCount.call({ from: config.owner });
        assert.equal(result, 3, "Airline should not have been registered again");
    });

    it('(airline) that is funded and approved can register a Flight using registerFlight()', async () => {
        let flight = 'MX1234';
        // registerFlight() expects depature time in uint256 (integer)
        // Date.now() provides dates in miliseconds
        // we will got with second accuracy
        let departure = Math.round(Date.now() / 1000);
        await config.flightSuretyApp.registerFlight(flight, departure, { from: config.owner });
        let result = await config.flightSuretyApp.isFlightRegistered.call(flight, departure, { from: config.owner });
        assert.equal(result, true, 'Flight should have been registered')
    });

    it('(airline) may register a new airline until there are at least four airlines registered', async () => {
        // Assert that the current number of airline is 4
        await config.flightSuretyApp.registerAirline(accounts[5], { from: config.owner }); 
        let currentAirlinesRegistered = await config.flightSuretyData.getAirlinesCount({ from: config.owner });
        assert.equal(4, currentAirlinesRegistered, 'Same flight cannot be registered repeatedly');
        
        // Assert that the 4th airline is registered and approved
        let isAirlineRegistered = await config.flightSuretyData.isAirlineRegistered(accounts[5], { from: config.owner });
        let isAirlineApproved = await config.flightSuretyData.isAirlineApproved(accounts[5], { from: config.owner });
        assert.equal(true, isAirlineRegistered && isAirlineApproved, 'Airline must be registered and approved');
        
        // Assert that the airline is added to the queue for voting as 5
        await config.flightSuretyApp.registerAirline(accounts[6], { from: config.owner }); 
        currentAirlinesRegistered = await config.flightSuretyData.getAirlinesCount({ from: config.owner });
        assert.equal(5, currentAirlinesRegistered, 'Same flight cannot be registered repeatedly');
        
        // Airline is only added as registered, but not approved
        isAirlineRegistered = await config.flightSuretyData.isAirlineRegistered(accounts[6], { from: config.owner }); 
        assert.equal(true, isAirlineRegistered, 'Airline must be able to be added to the queue for voting');
        isAirlineApproved = await config.flightSuretyData.isAirlineApproved(accounts[6], { from: config.owner });
        assert.equal(false, isAirlineApproved, 'Airline must not be approved yet without voting');

    });

    it('(airline) needs more than 50% of registered airlines', async () => {
        // Assert that the current number of airline is 5
        let currentAirlinesRegistered = await config.flightSuretyData.getAirlinesCount({ from: config.owner });
        assert.equal(5, currentAirlinesRegistered, 'Total number of at this point must be 5');

        // // Fund 2 more airlines
        let fundAirlineValue = web3.utils.toWei('10', 'ether');
        await config.flightSuretyApp.fundAirline({ from: accounts[3], value: fundAirlineValue });
        await config.flightSuretyApp.fundAirline({ from: accounts[4], value: fundAirlineValue });

        // First airline votes and checks
        await config.flightSuretyApp.voteAirline(accounts[6], {from: config.owner});
        isAirlineApproved = await config.flightSuretyData.isAirlineApproved(accounts[6], { from: config.owner });
        assert.equal(false, isAirlineApproved, 'Airline must be registered and not approved now');

        // Second airline votes and checks
        await config.flightSuretyApp.voteAirline(accounts[6], { from: accounts[3] });
        isAirlineApproved = await config.flightSuretyData.isAirlineApproved(accounts[6], { from: config.owner });
        assert.equal(false, isAirlineApproved, 'Airline must be registered and not approved now');

        // Third airline votes and checks airline is approved since 3 is greater than 50%
        // TODO, how to do do floating point number calculation in solidity - is there such a thing?
        await config.flightSuretyApp.voteAirline(accounts[6], { from: accounts[4] });
        isAirlineApproved = await config.flightSuretyData.isAirlineApproved(accounts[6], { from: config.owner });
        assert.equal(true, isAirlineApproved, 'Airline must be registered and not approved now');
    });

    it('(airline) that is approved and not funded cannot register a new airline', async () => {
        let reverted = false;
        try {
            await config.flightSuretyApp.registerAirline(account[7], { from: account[6] });
        } catch(e) {
            reverted = true;
        }
        assert.equal(reverted, true, 'Non funded airline cannot register new airlines');
    });
});
